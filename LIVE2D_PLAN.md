# nakari Live2D 虚拟形象前端计划

## 一、设计原则

### 1.1 完全遵循 nakari 架构哲学

> "nakari 不是角色扮演，她就是她自己。"

Live2D 前端是 nakari 的**视觉呈现**，不是附加组件。她通过前端看到用户，用户通过前端看到她。

### 1.2 核心适配原则

| nakari 特性 | 适配方案 |
|-------------|----------|
| Mailbox 事件系统 | 前端输入 → Mailbox 事件，前端输出 ← reply 工具广播 |
| 显式工具注册 | 新增 `live2d_tools.py`，遵循 `register_*_tools` 模式 |
| 全异步管道 | WebSocket 全异步，音频流异步处理 |
| 永续循环 | 前端断连不影响核心，重连后状态恢复 |
| 最小抽象 | 直接通信，不引入额外消息队列/状态机 |

## 二、架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           nakari 核心 (不变)                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Mailbox  │  │ ReAct    │  │ Tools    │  │ Memory   │  │ LLMClient    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                           ▲                    │
                           │                    │
        ┌──────────────────┴────┐   ┌──────────┴──────────┐
        │   输入源 (现有+新增)    │   │    输出端 (扩展)     │
        ├───────────────────────┤   ├─────────────────────┤
        │ • CLI.input_loop()    │   │ • CLI.print_reply() │
        │ • WebSocketInput      │   │ • WebSocketOutput   │
        │   (新增)              │   │   (新增)            │
        └───────────────────────┘   └─────────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │            WebSocket              │
                         └────────────────┬──────────────────┘
                                          ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │                        Live2D Web 前端                                │
        │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
        │  │  Live2D 渲染    │  │  音频流处理     │  │    UI 组件           │  │
        │  │  • 模型加载     │  │  • 口型同步     │  │  • 对话气泡          │  │
        │  │  • 动作播放     │  │  • 情感分析     │  │  • 输入框            │  │
        │  │  • 参数控制     │  │  • 状态机       │  │  • 设置面板          │  │
        │  └────────────────┘  └────────────────┘  └──────────────────────┘  │
        └─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流向图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户交互流程                                     │
└─────────────────────────────────────────────────────────────────────────────┘

用户输入文本
      │
      ▼
前端捕获输入
      │
      ├─── WebSocket ───→ WebSocketInput.handle_message()
      │                        │
      │                        ▼
      │                  mailbox.put(Event(
      │                    type=USER_TEXT,
      │                    content=输入内容
      │                  ))
      │
      ▼
nakari ReAct Loop 处理
      │
      ├─── LLM 调用 ───→ 前端接收: {"type": "thinking"}
      │                        ▼
      │                  Live2D 播放思考动画
      │
      ├─── reply 工具调用
      │        │
      │        ├─── CLI.print_reply() ───→ 控制台输出 (原有)
      │        │
      │        └─── WebSocketOutput.broadcast() ───→ 前端接收文本
      │                                                  │
      │                                                  ▼
      │                                          显示对话气泡
      │
      └─── TTS 播放
                │
                ├─── mpv 播放 (原有)
                │
                └─── AudioInterceptor 流式拦截 ───→ 前端接收音频流
                                                            │
                                                            ▼
                                                      Web Audio API 播放
                                                            │
                                                            ▼
                                                      实时分析音量
                                                            │
                                                            ▼
                                                      Live2D 口型同步
```

## 三、文件结构

```
nakari-2/
├── src/nakari/
│   ├── __init__.py
│   ├── __main__.py              # 修改: 条件启动 API 服务
│   │
│   ├── cli.py                   # 现有: CLI 输入/输出
│   ├── config.py                # 修改: 添加 API 配置
│   ├── loop.py                  # 修改: 添加状态钩子
│   ├── llm.py                   # 现有: 不变
│   ├── mailbox.py               # 现有: 不变
│   ├── memory.py                # 现有: 不变
│   ├── models.py                # 现有: 不变
│   ├── prompt.py                # 现有: 不变
│   ├── timer.py                 # 现有: 不变
│   ├── tool_registry.py         # 现有: 不变
│   ├── tts.py                   # 修改: 添加音频拦截器
│   ├── journal.py               # 现有: 不变
│   ├── context.py               # 现有: 不变
│   │
│   ├── api/                     # 新增: API 服务模块
│   │   ├── __init__.py
│   │   ├── app.py               # FastAPI 应用入口
│   │   ├── config.py            # API 配置
│   │   ├── routes.py            # HTTP 路由
│   │   └── websocket.py         # WebSocket 连接管理
│   │
│   ├── frontend_adapter/        # 新增: 前端适配层
│   │   ├── __init__.py
│   │   ├── input.py             # WebSocket 输入适配器
│   │   ├── output.py            # WebSocket 输出适配器
│   │   ├── audio_interceptor.py # TTS 音频拦截器
│   │   └── state_emitter.py     # 状态事件发射器
│   │
│   └── tools/
│       ├── __init__.py
│       ├── asr_tools.py         # 现有: 不变
│       ├── context_tools.py     # 现有: 不变
│       ├── journal_tools.py     # 现有: 不变
│       ├── mailbox_tools.py     # 现有: 不变
│       ├── memory_tools.py      # 现有: 不变
│       ├── reply_tool.py        # 修改: 支持多输出端
│       ├── timer_tools.py       # 现有: 不变
│       ├── web_tools.py         # 现有: 不变
│       └── live2d_tools.py      # 新增: Live2D 控制工具
│
├── frontend/                    # 新增: Web 前端项目
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   │
│   ├── src/
│   │   ├── main.tsx             # 入口
│   │   ├── App.tsx              # 根组件
│   │   │
│   │   ├── live2d/              # Live2D 模块
│   │   │   ├── index.ts
│   │   │   ├── renderer.ts      # Live2D 渲染器
│   │   │   ├── model_loader.ts  # 模型加载器
│   │   │   ├── motion_manager.ts # 动作管理器
│   │   │   ├── param_controller.ts # 参数控制
│   │   │   └── state_machine.ts # 状态机
│   │   │
│   │   ├── audio/               # 音频处理模块
│   │   │   ├── index.ts
│   │   │   ├── processor.ts     # 音频处理器
│   │   │   ├── lip_sync.ts      # 口型同步
│   │   │   └── emotion_detector.ts # 情感检测
│   │   │
│   │   ├── network/             # 网络模块
│   │   │   ├── index.ts
│   │   │   ├── websocket.ts     # WebSocket 客户端
│   │   │   └── message_handler.ts # 消息处理
│   │   │
│   │   ├── components/          # UI 组件
│   │   │   ├── AvatarCanvas.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── InputBox.tsx
│   │   │   └── SettingsPanel.tsx
│   │   │
│   │   ├── hooks/               # React Hooks
│   │   │   ├── useLive2D.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useNakariState.ts
│   │   │
│   │   ├── types/               # 类型定义
│   │   │   ├── live2d.ts
│   │   │   ├── api.ts
│   │   │   └── events.ts
│   │   │
│   │   └── utils/               # 工具函数
│   │       ├── emotion.ts       # 情感映射
│   │       └── config.ts        # 配置
│   │
│   ├── assets/
│   │   └── live2d/              # Live2D 模型资源
│   │       └── haru/
│   │           ├── haru.model3.json
│   │           ├── haru.2048/
│   │           │   ├── texture_00.png
│   │           │   └── ...
│   │           └── motions/
│   │               ├── idle_01.mtn
│   │               ├── angry_01.mtn
│   │               └── ...
│   │
│   └── public/
│       └── libs/
│           ├── live2d.min.js    # Live2D Cubism SDK
│           └── pixi.min.js      # PixiJS (可选渲染器)
│
├── pyproject.toml               # 修改: 添加依赖
├── docker-compose.yml           # 修改: 添加前端开发服务
├── .env.example                 # 修改: 添加前端配置
│
├── AGENTS.md                    # 现有: 不变
├── CLAUDE.md                    # 现有: 不变
├── SPEC.md                      # 现有: 不变
├── LIVE2D_PLAN.md               # 新增: 本文档
└── LIVE2D_DESIGN.md             # 新增: 详细设计文档
```

## 四、核心模块设计

### 4.1 输入适配器 (frontend_adapter/input.py)

遵循 CLI 模式，作为另一个输入源：

```python
class WebSocketInput:
    """WebSocket 输入适配器，类似 CLI.input_loop()"""

    def __init__(self, mailbox: Mailbox, config: Config):
        self._mailbox = mailbox
        self._config = config

    async def input_loop(self, ws: WebSocket):
        """处理 WebSocket 消息，转换为 Mailbox 事件"""
        async for message in ws.iter_text():
            data = json.loads(message)

            if data["type"] == "user_text":
                event = Event(
                    type=EventType.USER_TEXT,
                    content=data["content"],
                    max_tool_calls=self._config.default_max_tool_calls,
                    metadata={"source": "websocket"},
                )
                await self._mailbox.put(event)

            elif data["type"] == "audio_blob":
                # 音频输入，创建 ASR 转写事件
                event = Event(
                    type=EventType.ASR_TRANSCRIPT,
                    content="",
                    attachments=[
                        Attachment(
                            mime_type="audio/webm",
                            uri=data["audio_uri"],
                        )
                    ],
                    max_tool_calls=self._config.default_max_tool_calls,
                )
                await self._mailbox.put(event)
```

### 4.2 输出适配器 (frontend_adapter/output.py)

扩展 reply 工具支持多输出端：

```python
class MultiOutputHandler:
    """多输出端处理器"""

    def __init__(self):
        self._outputs: list[OutputEndpoint] = []

    def register(self, endpoint: OutputEndpoint):
        self._outputs.append(endpoint)

    async def emit(self, message: str, **metadata):
        """广播到所有输出端"""
        for output in self._outputs:
            await output.send(message, **metadata)


class WebSocketOutput(OutputEndpoint):
    """WebSocket 输出端"""

    def __init__(self, ws_manager: WebSocketManager):
        self._manager = ws_manager

    async def send(self, message: str, **metadata):
        await self._manager.broadcast({
            "type": "reply",
            "content": message,
            **metadata,
        })


class CLIOutput(OutputEndpoint):
    """CLI 输出端（原有）"""

    async def send(self, message: str, **metadata):
        await CLI.print_reply(message)
```

### 4.3 音频拦截器 (frontend_adapter/audio_interceptor.py)

非侵入式拦截 TTS 音频流：

```python
class AudioStreamInterceptor:
    """TTS 音频流拦截器"""

    def __init__(self, original_backend: TTSBackend, broadcaster: AudioBroadcaster):
        self._original = original_backend
        self._broadcaster = broadcaster

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """包装原有流，同时广播"""
        async for chunk in self._original.synthesize_stream(text):
            # 原有流程: yield chunk 给 TTSPlayer
            yield chunk
            # 新增: 广播给前端
            await self._broadcaster.broadcast(chunk)


def wrap_tts_backend(backend: TTSBackend, broadcaster: AudioBroadcaster) -> TTSBackend:
    """包装 TTS 后端，添加音频广播"""
    return AudioStreamInterceptor(backend, broadcaster)
```

### 4.4 状态发射器 (frontend_adapter/state_emitter.py)

观察 nakari 状态，发射给前端：

```python
class StateEmitter:
    """状态事件发射器"""

    def __init__(self, ws_manager: WebSocketManager):
        self._manager = ws_manager

    async def emit_thinking(self):
        await self._manager.broadcast({"type": "state", "value": "thinking"})

    async def emit_speaking(self):
        await self._manager.broadcast({"type": "state", "value": "speaking"})

    async def emit_idle(self):
        await self._manager.broadcast({"type": "state", "value": "idle"})

    async def emit_action(self, tool_name: str):
        await self._manager.broadcast({"type": "action", "tool": tool_name})

    async def emit_emotion(self, emotion: str):
        await self._manager.broadcast({"type": "emotion", "value": emotion})
```

### 4.5 Live2D 工具 (tools/live2d_tools.py)

遵循 nakari 工具注册模式：

```python
def register_live2d_tools(
    registry: ToolRegistry,
    state_emitter: StateEmitter,
) -> None:
    async def live2d_set_motion(motion: str) -> str:
        """设置 Live2D 动作"""
        await state_emitter._manager.broadcast({
            "type": "motion",
            "value": motion,
        })
        return f"Motion set to {motion}"

    async def live2d_set_emotion(emotion: str) -> str:
        """设置 Live2D 表情"""
        await state_emitter.emit_emotion(emotion)
        return f"Emotion set to {emotion}"

    registry.register(
        name="live2d_set_motion",
        description="Set Live2D motion animation",
        parameters={
            "type": "object",
            "properties": {
                "motion": {
                    "type": "string",
                    "enum": ["idle", "happy", "sad", "angry", "thinking", "surprised"],
                }
            },
            "required": ["motion"],
            "additionalProperties": False,
        },
        handler=live2d_set_motion,
    )

    registry.register(
        name="live2d_set_emotion",
        description="Set Live2D facial expression",
        parameters={
            "type": "object",
            "properties": {
                "emotion": {
                    "type": "string",
                    "enum": ["neutral", "happy", "sad", "angry", "surprised"],
                }
            },
            "required": ["emotion"],
            "additionalProperties": False,
        },
        handler=live2d_set_emotion,
    )
```

## 五、前端设计

### 5.1 Live2D 状态机

```
                    ┌─────────────────────────────┐
                    │           IDLE              │
                    │   呼吸动画 + 基础待机状态    │
                    └─────────────┬───────────────┘
                                  │ 收到用户消息
                                  ▼
                    ┌─────────────────────────────┐
                    │         THINKING            │
                    │   思考动画 (摇晃/点头)        │
                    └─────────────┬───────────────┘
                                  │ LLM 回复生成
                                  ▼
                    ┌─────────────────────────────┐
                    │         SPEAKING            │
                    │   说话状态 + 口型同步         │
                    │   (根据情感调整表情)          │
                    └─────────────┬───────────────┘
                                  │ 说话结束
                                  ▼
                    ┌─────────────────────────────┐
                    │           IDLE              │
                    └─────────────────────────────┘
```

### 5.2 音频处理流程

```
TTS 音频流 (bytes)
        │
        ▼
WebSocket 接收
        │
        ├─── Web Audio API ───→ AudioBuffer
        │                              │
        │                              ├─── AnalyserNode ──→ 频率数据
        │                              │                      │
        │                              │                      ▼
        │                              │              计算音量 (RMS)
        │                              │                      │
        │                              │                      ▼
        │                              │              映射到口型参数
        │                              │                      │
        │                              │                      ▼
        │                              │              Live2D.setParam(
        │                              │                'ParamMouthOpenY',
        │                              │                volume
        │                              │              )
        │                              │
        │                              └─── AudioBufferSourceNode ──→ 扬声器
        │
        └─── 同时显示文本对话气泡
```

### 5.3 表情映射规则

| 场景 | 表情 | 动作 | Live2D 参数 |
|------|------|------|-------------|
| 默认 | neutral | idle | ParamEyeLOpen, ParamEyeROpen |
| 思考 | neutral | thinking | ParamBodyAngleX 摇晃 |
| 开心 | happy | happy | ParamBrowLY, ParamBrowRY 下弯 |
| 难过 | sad | sad | ParamBrowLY, ParamBrowRY 上扬 |
| 生气 | angry | angry | ParamAngleX, ParamAngleY 变化 |
| 惊讶 | surprised | surprised | ParamEyeLOpen, ParamEyeROpen 放大 |
| 说话中 | (保持当前表情) | + 口型同步 | ParamMouthOpenY 跟随音量 |

### 5.4 口型同步实现

```typescript
class LipSyncProcessor {
    private analyser: AnalyserNode;
    private live2dModel: LAppModel;

    update() {
        // 获取频率数据
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // 计算音量 (RMS)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // 归一化到 0-1
        const volume = Math.min(rms / 100, 1);

        // 设置口型参数
        this.live2dModel.setParam('ParamMouthOpenY', volume);

        // 根据音量调整嘴型 (简单的元音映射)
        if (volume > 0.5) {
            this.live2dModel.setParam('ParamMouthForm', 0); // 'a'
        } else if (volume > 0.3) {
            this.live2dModel.setParam('ParamMouthForm', 2); // 'u'
        } else {
            this.live2dModel.setParam('ParamMouthForm', 4); // 'o'
        }
    }
}
```

## 六、配置扩展

### 6.1 环境变量 (.env.example)

```bash
# ... 现有配置 ...

# ===== API 服务 =====
NAKARI_API_ENABLED=true
NAKARI_API_HOST=127.0.0.1
NAKARI_API_PORT=8000

# ===== Live2D =====
LIVE2D_MODEL_NAME=haru
LIVE2D_MODEL_PATH=./frontend/assets/live2d
LIVE2D_AUTO_IDLE=true
LIVE2D_LIP_SYNC_ENABLED=true

# ===== 音频流 =====
AUDIO_STREAM_SAMPLE_RATE=24000
AUDIO_STREAM_CHUNK_SIZE=4096
```

### 6.2 pyproject.toml

```toml
[project]
name = "nakari"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    # ... 现有依赖 ...
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "websockets>=14.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24.0",
]
local-asr = [
    "faster-whisper>=1.0.0",
]
frontend = [
    "watchfiles>=0.24.0",  # 前端开发时热重载
]
```

## 七、实施步骤

### Phase 1: 后端适配层 (2-3 天)

**目标**: 建立前端与 nakari 核心的通信桥梁

- [ ] **Day 1**: 创建 `frontend_adapter/` 模块
    - [ ] 实现 `WebSocketInput` - 输入适配器
    - [ ] 实现 `WebSocketOutput` - 输出适配器
    - [ ] 实现 `MultiOutputHandler` - 多输出端管理

- [ ] **Day 2**: 音频与状态
    - [ ] 实现 `AudioStreamInterceptor` - 音频拦截器
    - [ ] 实现 `AudioBroadcaster` - 音频广播器
    - [ ] 实现 `StateEmitter` - 状态发射器

- [ ] **Day 3**: 工具与集成
    - [ ] 实现 `live2d_tools.py` - Live2D 控制工具
    - [ ] 修改 `reply_tool.py` - 支持多输出端
    - [ ] 修改 `tts.py` - 添加音频拦截
    - [ ] 单元测试

### Phase 2: API 服务 (1-2 天)

**目标**: 提供 WebSocket 和 HTTP 接口

- [ ] **Day 1**: 基础 API
    - [ ] 创建 `api/` 模块
    - [ ] 实现 FastAPI 应用 (`app.py`)
    - [ ] 实现 WebSocket 连接管理 (`websocket.py`)
    - [ ] 实现基本路由 (`routes.py`)

- [ ] **Day 2**: 集成与配置
    - [ ] 修改 `__main__.py` - 条件启动 API
    - [ ] 修改 `config.py` - 添加 API 配置
    - [ ] API 测试

### Phase 3: Live2D 前端 (4-5 天)

**目标**: 完整的 Live2D 虚拟形象界面

- [ ] **Day 1**: 项目搭建
    - [ ] 初始化 Vite + React + TypeScript
    - [ ] 集成 Live2D Cubism SDK
    - [ ] 创建基础组件结构

- [ ] **Day 2**: Live2D 核心
    - [ ] 实现 `Live2DRenderer` - 渲染器
    - [ ] 实现 `ModelLoader` - 模型加载
    - [ ] 实现 `MotionManager` - 动作管理
    - [ ] 加载示例模型 (Haru)

- [ ] **Day 3**: 音频与口型
    - [ ] 实现 `AudioProcessor` - 音频处理
    - [ ] 实现 `LipSyncProcessor` - 口型同步
    - [ ] 实现音频流 WebSocket 接收
    - [ ] 测试 TTS 音频播放

- [ ] **Day 4**: 状态与交互
    - [ ] 实现 `StateMachine` - 状态机
    - [ ] 实现 `EmotionDetector` - 情感检测
    - [ ] 实现 UI 组件 (对话气泡、输入框、设置)
    - [ ] WebSocket 消息处理

- [ ] **Day 5**: 集成与优化
    - [ ] 端到端集成测试
    - [ ] 性能优化
    - [ ] 响应式布局
    - [ ] 错误处理

### Phase 4: 测试与优化 (1-2 天)

- [ ] 端到端测试
- [ ] 延迟优化 (目标: <200ms 端到端延迟)
- [ ] 兼容性测试
- [ ] 文档完善

**预计总工期: 8-12 天**

## 八、测试清单

### 8.1 后端测试

```bash
# 单元测试
pytest tests/test_frontend_adapter.py
pytest tests/test_live2d_tools.py

# API 测试
pytest tests/test_api.py

# 集成测试
pytest tests/test_integration.py
```

### 8.2 前端测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e
```

### 8.3 手动测试场景

| 场景 | 预期行为 |
|------|----------|
| 用户输入文本 | Live2D 切换到思考动画 → 说话动画 + 口型同步 |
| nakari 回复 | 对话气泡显示文本 |
| TTS 播放 | 音频流畅播放，口型同步准确 |
| 情感内容 | Live2D 表情自动切换 |
| 长时间闲置 | 播放闲置呼吸动画 |
| WebSocket 断连 | nakari 核心不受影响，重连后恢复 |
| CLI + Web 同时使用 | 两端都能收到回复 |

## 九、性能指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 端到端延迟 | <200ms | 用户输入 → Live2D 动作开始 |
| 音频延迟 | <50ms | TTS 生成 → 前端播放开始 |
| 口型同步精度 | <30ms | 音频波形 → 口型变化 |
| 内存占用 | <200MB (后端) | 后端进程内存 |
| 内存占用 | <150MB (前端) | 浏览器标签页内存 |
| FPS | ≥60 | Live2D 渲染帧率 |

## 十、未来扩展

- [ ] 支持多个 Live2D 模型切换
- [ ] 支持 VRM 3D 模型
- [ ] 本地语音识别 (Web Speech API)
- [ ] 多用户支持 (房间系统)
- [ ] 移动端适配
- [ ] 录制与回放功能
- [ ] 自定义模型上传

---

**文档版本**: v1.0
**创建日期**: 2026-02-20
**状态**: 待实施
