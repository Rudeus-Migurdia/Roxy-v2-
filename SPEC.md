nakari：个性鲜明，独一无二的 agent

## 设计哲学

> "I don't play a character, I am."

nakari 不做角色扮演。她在一次一次的 ReAct 循环中获取信息，形成自己的见解，
写入自己的记忆库。又从记忆库中汲取经验，对新信息产生独特的反应。

随着时间的沉淀，记忆库独一无二，反映出 nakari 独一无二的特性。


## 架构总览

```
外部事件源                          nakari 自身
  │ 用户文本输入                      │ 自建任务
  │ ASR 转写结果                      │ 挂起恢复的事件
  │ 定时任务                          │ 拆分的子任务
  │ 其他外部信号                      │
  ▼                                  ▼
┌──────────────── Mailbox ──────────────────┐
│                                           │
│  每个事件携带: type, content, max_tool_calls│
│  nakari 单任务处理: 取一个 → 处理 → 完成/挂起 │
│                                           │
└──────────────────┬────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│          永续 ReAct 循环                   │
│                                          │
│  Thought ─► Action ─► Observation        │
│      ▲                     │             │
│      └─────────────────────┘             │
│                                          │
│  Action 可以是:                           │
│   - check_mailbox    (获取待处理事件)      │
│   - create_event     (创建新事件入队)      │
│   - suspend_event    (挂起当前事件)        │
│   - complete_event   (标记当前事件完成)     │
│   - compress_context (主动压缩上下文)      │
│   - memory_query / memory_write          │
│   - memory_schema / embedding            │
│   - reply            (向外部发送回复)      │
│   - 其他 MCP tools                        │
│                                          │
│  循环永不结束                              │
│  mailbox 为空时 sleep，有新事件时唤醒       │
└──────────────────────────────────────────┘
```
---
## 技术栈

python，全链路 async

| 层 | 选型 | 说明 |
|---|---|---|
| 运行时 | asyncio | mailbox sleep/wake 天然映射 asyncio.Queue |
| LLM 交互 | openai / anthropic SDK（或 litellm） | 直接用 SDK，不引入 LangChain 等框架，LLM 本身是决策者 |
| 记忆库 | neo4j（AsyncGraphDatabase） | 无预设 schema，不用 OGM |
| Mailbox | asyncio.Queue（初期）→ Redis Streams（后续） | 初期纯内存快速验证，后续按需加持久化 |
| API 层 | FastAPI | async 原生，外部事件接入 + 未来前端 API |
| ASR | faster-whisper（本地）/ OpenAI Whisper API | 本地推理优先 |
| TTS | edge-tts（默认）/ GPT-SoVITS（进阶） | edge-tts 免费、async 原生 |
| 日志 | structlog | 结构化 JSON，便于检索和回放 |
| Token 计数 | tiktoken | 被动压缩阈值判断 |
| 向量嵌入 | OpenAI Embeddings API | 用于 neo4j 语义检索 |
| 前端 | 待定 | |

---
## Mailbox 设计

### 事件结构

每个 mailbox 事件包含：
- **type** — 事件类型（如 user_text, asr_transcript, timer, self_created 等）
- **content** — 事件内容
- **max_tool_calls** — 该事件允许的最大 tool call 次数（安全阀）
- **metadata** — 可选的附加信息（优先级、来源、挂起时的进度备注等）

### 事件来源

- **外部**：用户文本输入、ASR 转写结果、定时任务、系统通知等
- **内部**：nakari 自己创建的任务、挂起后重新入队的事件、拆分出的子任务

### 单任务模式

nakari 同一时间只处理一个事件：取出 → 处理 → complete 或 suspend → 再取下一个。
不支持同时持有多个事件。

### Mailbox Tools

#### `check_mailbox` — 查看/获取待处理事件

获取 mailbox 中的下一个事件。若 mailbox 为空，运行时挂起等待（sleep），
有新事件入队时唤醒。

#### `create_event` — 创建新事件

nakari 可以向 mailbox 中添加新事件。用途：
- 拆分复杂任务为多个子任务
- 给自己安排待办（整理记忆、反思等）
- 延迟处理（"稍后再想这个问题"）

#### `suspend_event` — 挂起当前事件

将当前正在处理的事件重新放回 mailbox，附带进度备注。
用于：做到一半缺少信息、需要等待外部输入、想先处理更紧急的事件。

#### `complete_event` — 标记当前事件完成

标记当前事件处理完毕，运行时将其归档到日志。

---

## ReAct 循环设计

### 实现方式

调用 LLM API 的 function calling / tool use 能力：
- 将所有可用 tools 的 schema 传入 LLM
- LLM 返回 tool call → 执行 → 将结果喂回 LLM
- 循环永不主动结束，nakari 通过 check_mailbox 持续获取新事件

不需要手写状态机或规则引擎。LLM 本身就是决策者。

### 循环控制

- **无全局轮次上限**，循环永续运行
- **per-event max_tool_calls**：每个事件携带自己的 tool call 预算，运行时计数，
  达到上限时强制要求 nakari complete 或 suspend 当前事件
- **空 mailbox 挂起**：mailbox 为空时 sleep，有新事件时唤醒，避免空转消耗

---

## 记忆库设计（核心）

### 原则：无预设 schema

**不定义** `MemoryNode`、`Experience`、`Insight` 等固定类型。
不提供 `createExperience()`、`addInsight()` 等 domain method。

nakari 直接操作 Cypher，自主决定：
- 用什么 **label**（节点类型）
- 用什么 **property**（属性名和值）
- 建立什么 **relationship**（关系类型和方向）

数据结构从 nakari 的使用中**自然涌现**，而非被预先规定。

### 为什么选 Neo4j

- **Schema-free** — 节点可以有任意 label 和 property，不需要提前定义表结构
- **关联性** — 图数据库天然适合关联探索（"这个记忆关联了哪些其他记忆？"）
- **Cypher 表达力** — 一条 Cypher 可以完成复杂的匹配+创建+关联操作

### 四个核心 Tools

提供四个工具（暂定）

#### 1. `memory_query` — 只读查询

执行只读 Cypher（MATCH/RETURN/etc）。nakari 用它检索自己的记忆。

#### 2. `memory_write` — 写入/修改


执行写入 Cypher（CREATE/MERGE/SET/DELETE）。nakari 用它记录新记忆、
更新已有记忆、建立关联、甚至删除记忆（遗忘是自主权的一部分）。

#### 3. `memory_schema` — 审视记忆结构


查询当前数据库中存在的所有 label、关系类型和属性名。
让 nakari 了解自己记忆库的"形状"，决定是复用已有结构还是创新。

#### 4. `embedding` — 生成向量嵌入

为文本生成向量嵌入，用于语义相似度搜索。
nakari 可以自己决定什么内容需要向量化（如重要概念、对话摘要等），
然后将向量存储为节点属性，之后通过余弦相似度或 Neo4j 向量索引进行检索。

---

## context 上下文

1. **日志**：保存每一次循环的 action、tool call、result 等完整记录
2. **被动压缩**：上下文超过 token 阈值时，自动裁剪最早的内容。由于日志的存在，
   裁剪即使损失内容，也可以从日志或记忆库中重新获取
3. **主动压缩**（`compress_context` tool）：nakari 可以主动调用此工具压缩上下文。
   nakari 自行决定保留什么、丢弃什么，生成摘要替换原始内容。
   这是一种元认知能力——nakari 知道自己快忘了什么，主动选择记住什么
4. **记忆库**（neo4j）：上下文管理的补偿手段，主要解决长期记忆问题
---

## 系统提示词要点

system prompt 中需要传达的关键信息：

1. 你有一个 Neo4j 数据库，这是你的记忆库
2. 你可以用记忆工具自由地读写（含 embedding 向量生成）
3. 不规定你应该创建什么类型的节点——你自己决定
4. 你可以用 `memory_schema` 查看当前记忆库的结构
5. 鼓励在回复前检索相关记忆，在回复后记录有价值的信息
6. 你可以用 `embedding` 为重要内容生成向量，用于语义检索
7. 你有一个 mailbox，所有外部事件和你自创的任务都在其中
8. 你可以自主管理 mailbox：创建事件、挂起事件、完成事件
9. 你可以用 `compress_context` 主动管理自己的上下文

**不要**在 system prompt 中规定数据结构（如"请用 Experience 标签存储经验"）。
