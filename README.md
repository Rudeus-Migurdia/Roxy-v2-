# Roxy v2 - Live2D AI Assistant

一个基于 Live2D 的 AI 虚拟助手，采用永久 ReAct 循环架构，支持语音交互、记忆管理、定时任务等功能。

## 功能特性

### 核心功能
- **AI 对话**: 基于 OpenAI API 的智能对话系统
- **语音交互**: 支持 ASR (语音识别) 和 TTS (语音合成)
- **记忆系统**: 基于 Neo4j 的长期记忆存储
- **事件邮箱**: 自主事件队列管理系统
- **日志记录**: SQLite 持久化对话历史

### Live2D 前端
- **实时控制**: 通过 WebSocket 控制 Live2D 模型动作、表情
- **音频广播**: 实时语音输出同步
- **Web 界面**: React + TypeScript 构建的交互界面

### 其他功能
- **定时任务**: 可设置定时提醒
- **网页搜索**: 集成 Tavily API 进行网络搜索
- **上下文压缩**: 智能管理对话上下文长度
- **自动退出**: 关闭浏览器时自动退出后端

## 安装

```bash
# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -e ".[dev]"

# 启动 Neo4j (可选，用于记忆功能)
docker compose up -d
```

## 配置

创建 `.env` 文件：

```bash
# 必需
OPENAI_API_KEY=your_api_key

# 可选
NAKARI_API_ENABLED=true          # 启用 Live2D API
NAKARI_API_HOST=127.0.0.1
NAKARI_API_PORT=8002
AUTO_SHUTDOWN_ON_DISCONNECT=false  # 关闭浏览器时自动退出后端
AUTO_SHUTDOWN_DELAY_SECONDS=30     # 自动关闭延迟时间（秒）
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## 运行

```bash
# 启动后端
nakari

# 启动前端 (另开终端)
cd frontend
npm install
npm run dev
```

## 更新日志
### 待实现
- 分辨率和窗口化适配
- 设置内部功能实现
- 对话历史记录功能
- live2d模型一键切换按钮
- 桌宠模式


### v2.0.2 (2026-02-22)
- 实现侧边栏
- 优化按钮和边框样式
- 优化布局，主视图智能避让
- 采用流式布局
- 新增设置面板，支持通用/Live2D/音频/高级设置
- 新增语音输入
- 优化自动关闭逻辑：默认关闭，延迟 30 秒，重连取消关闭

### v2.0.1 (2025-02-21)
- 新增自动退出功能：关闭浏览器时后端自动退出
- 新增 `AUTO_SHUTDOWN_ON_DISCONNECT` 配置选项
- 改进启动流程和错误处理
- 优化Web页面设计，对对话框和live2d模型进行分离


### v2.0.0 (2025-02-21)
- 新增 Live2D 前端集成
- 新增 WebSocket API
- 修复前后端连接问题

