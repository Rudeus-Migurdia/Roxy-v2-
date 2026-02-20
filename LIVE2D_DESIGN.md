# nakari Live2D 详细设计文档

## 一、通信协议设计

### 1.1 WebSocket 消息格式

所有 WebSocket 消息使用 JSON 格式：

```typescript
interface NakariMessage {
  version: "1.0";
  type: MessageType;
  timestamp: number;
  payload: unknown;
}

type MessageType =
  | "state"          // 状态变化
  | "reply"          // 文本回复
  | "audio_chunk"    // 音频块
  | "emotion"        // 表情变化
  | "motion"         // 动作触发
  | "user_text"      // 用户输入
  | "error"          // 错误信息
  | "ping"           // 心跳
  | "pong";          // 心跳响应
```

### 1.2 消息类型详解

#### State 消息 (nakari → frontend)

```typescript
interface StateMessage {
  version: "1.0";
  type: "state";
  timestamp: number;
  payload: {
    state: "thinking" | "speaking" | "idle" | "processing";
    event_id?: string;
  };
}

// 示例
{
  "version": "1.0",
  "type": "state",
  "timestamp": 1708435200000,
  "payload": {
    "state": "thinking",
    "event_id": "abc123def456"
  }
}
```

#### Reply 消息 (nakari → frontend)

```typescript
interface ReplyMessage {
  version: "1.0";
  type: "reply";
  timestamp: number;
  payload: {
    content: string;
    event_id?: string;
    metadata?: {
      emotion?: string;
      tool_calls?: ToolCall[];
    };
  };
}

// 示例
{
  "version": "1.0",
  "type": "reply",
  "timestamp": 1708435200000,
  "payload": {
    "content": "你好！我是 nakari。",
    "event_id": "abc123def456",
    "metadata": {
      "emotion": "happy"
    }
  }
}
```

#### Audio Chunk 消息 (nakari → frontend)

```typescript
interface AudioChunkMessage {
  version: "1.0";
  type: "audio_chunk";
  timestamp: number;
  payload: {
    chunk_id: string;       // 音频块 ID
    sequence: number;       // 序列号
    data: string;           // base64 编码的音频数据
    format: "mp3" | "wav";
    sample_rate: number;
    channels: number;
    is_final: boolean;      // 是否为最后一块
  };
}
```

#### User Text 消息 (frontend → nakari)

```typescript
interface UserTextMessage {
  version: "1.0";
  type: "user_text";
  timestamp: number;
  payload: {
    content: string;
    metadata?: {
      source?: "web" | "mobile";
    };
  };
}
```

#### Emotion 消息

```typescript
interface EmotionMessage {
  version: "1.0";
  type: "emotion";
  timestamp: number;
  payload: {
    emotion: "neutral" | "happy" | "sad" | "angry" | "surprised";
    intensity: number;       // 0.0 - 1.0
    duration?: number;       // 持续时间（毫秒）
  };
}
```

#### Motion 消息

```typescript
interface MotionMessage {
  version: "1.0";
  type: "motion";
  timestamp: number;
  payload: {
    motion: string;
    group?: string;
    loop?: boolean;
  };
}
```

### 1.3 心跳机制

```typescript
// 客户端每 30 秒发送 ping
interface PingMessage {
  version: "1.0";
  type: "ping";
  timestamp: number;
  payload: null;
}

// 服务器响应 pong
interface PongMessage {
  version: "1.0";
  type: "pong";
  timestamp: number;
  payload: {
    server_time: number;
  };
}
```

## 二、API 接口设计

### 2.1 HTTP API

```typescript
// GET /api/health - 健康检查
interface HealthResponse {
  status: "ok" | "error";
  version: string;
  uptime: number;
  websocket_url: string;
}

// GET /api/config - 获取配置
interface ConfigResponse {
  live2d: {
    model_name: string;
    available_models: string[];
    lip_sync_enabled: boolean;
    auto_idle: boolean;
  };
  audio: {
    sample_rate: number;
    chunk_size: number;
    format: string;
  };
}

// POST /api/tts/test - TTS 测试
interface TTS TestRequest {
  text: string;
  speak: boolean;
}

interface TTS TestResponse {
  success: boolean;
  audio_url?: string;
}

// GET /api/models - 获取可用模型列表
interface ModelsResponse {
  models: Array<{
    name: string;
    display_name: string;
    thumbnail?: string;
  }>;
}

// GET /api/emotions - 获取可用表情列表
interface EmotionsResponse {
  emotions: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

### 2.2 WebSocket API

```typescript
// 连接 URL
ws://localhost:8000/api/ws

// 连接查询参数
?client_id=xxx&model=haru&lip_sync=true
```

## 三、数据结构设计

### 3.1 前端状态管理

```typescript
interface NakariState {
  // 连接状态
  connection: {
    status: "connecting" | "connected" | "disconnected" | "error";
    ws: WebSocket | null;
    lastPing: number;
  };

  // Live2D 状态
  live2d: {
    model: string;
    isLoaded: boolean;
    currentMotion: string | null;
    currentEmotion: string | null;
    parameters: Record<string, number>;
  };

  // nakari 状态
  nakari: {
    state: "idle" | "thinking" | "speaking" | "processing";
    currentEvent: string | null;
  };

  // 对话状态
  conversation: {
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      emotion?: string;
    }>;
  };

  // 音频状态
  audio: {
    isPlaying: boolean;
    volume: number;
    currentChunk: string | null;
  };
}
```

### 3.2 Live2D 模型元数据

```typescript
interface Live2DModelMetadata {
  name: string;
  display_name: string;
  version: string;

  // 模型文件
  model_file: string;
  texture_dir: string;

  // 参数定义
  parameters: Array<{
    name: string;
    id: string;
    min: number;
    max: number;
    default: number;
  }>;

  // 动作组
  motions: {
    [group: string]: Array<{
      file: string;
      name: string;
      sound?: string;
    }>;
  };

  // 表情预设
  expressions?: Array<{
    name: string;
    parameters: Record<string, number>;
  }>;
}
```

## 四、核心类设计

### 4.1 WebSocketManager (后端)

```python
from __future__ import annotations
import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket
import structlog

class WebSocketManager:
    """WebSocket 连接管理器"""

    def __init__(self) -> None:
        self._connections: Dict[str, WebSocket] = {}
        self._subscribers: Dict[str, Set[str]] = {}  # topic -> client_ids
        self._log = structlog.get_logger("websocket")

    async def connect(self, client_id: str, ws: WebSocket) -> None:
        """接受新连接"""
        await ws.accept()
        self._connections[client_id] = ws
        self._log.info("client_connected", client_id=client_id)

    def disconnect(self, client_id: str) -> None:
        """断开连接"""
        if client_id in self._connections:
            del self._connections[client_id]
            # 清理订阅
            for topic, subscribers in self._subscribers.items():
                subscribers.discard(client_id)
            self._log.info("client_disconnected", client_id=client_id)

    async def send(self, client_id: str, message: dict) -> bool:
        """发送消息给指定客户端"""
        ws = self._connections.get(client_id)
        if ws is None:
            return False

        try:
            await ws.send_json(message)
            return True
        except Exception as e:
            self._log.warning("send_failed", client_id=client_id, error=str(e))
            self.disconnect(client_id)
            return False

    async def broadcast(self, message: dict, topic: str | None = None) -> None:
        """广播消息"""
        if topic:
            clients = self._subscribers.get(topic, set())
        else:
            clients = set(self._connections.keys())

        for client_id in clients:
            await self.send(client_id, message)

    def subscribe(self, client_id: str, topic: str) -> None:
        """订阅主题"""
        if topic not in self._subscribers:
            self._subscribers[topic] = set()
        self._subscribers[topic].add(client_id)

    def unsubscribe(self, client_id: str, topic: str) -> None:
        """取消订阅"""
        if topic in self._subscribers:
            self._subscribers[topic].discard(client_id)

    @property
    def connection_count(self) -> int:
        return len(self._connections)
```

### 4.2 AudioBroadcaster (后端)

```python
from __future__ import annotations
import asyncio
import base64
from collections import deque
from typing import TYPE_CHECKING
import structlog

if TYPE_CHECKING:
    from .websocket import WebSocketManager

class AudioBroadcaster:
    """音频流广播器"""

    def __init__(self, ws_manager: WebSocketManager, chunk_size: int = 4096):
        self._ws_manager = ws_manager
        self._chunk_size = chunk_size
        self._current_sequence = 0
        self._log = structlog.get_logger("audio_broadcaster")

    async def broadcast(self, audio_data: bytes, format: str = "mp3") -> None:
        """广播音频块"""
        # 分块
        chunks = [audio_data[i:i+self._chunk_size]
                  for i in range(0, len(audio_data), self._chunk_size)]

        for i, chunk in enumerate(chunks):
            message = {
                "version": "1.0",
                "type": "audio_chunk",
                "timestamp": asyncio.get_event_loop().time(),
                "payload": {
                    "chunk_id": f"{self._current_sequence}_{i}",
                    "sequence": self._current_sequence,
                    "data": base64.b64encode(chunk).decode(),
                    "format": format,
                    "is_final": (i == len(chunks) - 1),
                }
            }
            await self._ws_manager.broadcast(message)
            # 小延迟避免阻塞
            await asyncio.sleep(0.001)

        self._current_sequence += 1
```

### 4.3 Live2DRenderer (前端)

```typescript
import * as PIXI from 'pixi.js';
import { LIVE2DCubismSDK } from './live2d.min';

export class Live2DRenderer {
  private app: PIXI.Application;
  private model: LAppModel | null = null;
  private canvas: HTMLCanvasElement;
  private motionManager: MotionManager;
  private paramController: ParamController;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.motionManager = new MotionManager();
    this.paramController = new ParamController();

    // 初始化 PixiJS
    this.app = new PIXI.Application({
      view: canvas,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // 窗口大小变化
    window.addEventListener('resize', () => this.onResize());
  }

  async loadModel(modelPath: string): Promise<void> {
    try {
      // 加载模型
      const model = await LAppModel.load(modelPath);
      this.model = model;

      // 设置参数控制器
      this.paramController.setModel(model);

      // 添加到舞台
      this.app.stage.addChild(model);

      // 启动渲染循环
      this.startRenderLoop();

    } catch (error) {
      console.error('Failed to load Live2D model:', error);
      throw error;
    }
  }

  private startRenderLoop(): void {
    const ticker = () => {
      if (this.model) {
        this.model.update();
        this.motionManager.update(this.model);
      }
      requestAnimationFrame(ticker);
    };
    ticker();
  }

  setParam(paramName: string, value: number): void {
    this.paramController?.set(paramName, value);
  }

  playMotion(group: string, index: number): void {
    this.motionManager?.play(group, index);
  }

  setEmotion(emotion: string): void {
    this.model?.setExpression(emotion);
  }

  private onResize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.app.renderer.resize(
        parent.clientWidth,
        parent.clientHeight
      );
    }
  }

  destroy(): void {
    this.model?.release();
    this.app.destroy(true);
  }
}
```

### 4.4 LipSyncProcessor (前端)

```typescript
export class LipSyncProcessor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private live2d: Live2DRenderer;
  private isProcessing = false;

  constructor(audioContext: AudioContext, live2d: Live2DRenderer) {
    this.audioContext = audioContext;
    this.live2d = live2d;

    // 创建分析器
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.1;
  }

  async playAudioChunk(chunkData: ArrayBuffer): Promise<void> {
    // 解码音频
    const audioBuffer = await this.audioContext.decodeAudioData(chunkData);

    // 创建源节点
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // 连接: source -> analyser -> destination
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    // 启动处理循环
    this.isProcessing = true;
    this.processLoop();

    // 播放
    source.start();
  }

  private processLoop(): void {
    if (!this.isProcessing) return;

    // 获取频率数据
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // 计算音量 (RMS)
    const rms = this.calculateRMS(dataArray);

    // 更新口型
    this.updateMouthOpen(rms);

    // 持续循环
    requestAnimationFrame(() => this.processLoop());
  }

  private calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  private updateMouthOpen(volume: number): void {
    // volume 范围 0-1，映射到口型参数
    const mouthOpenY = Math.min(volume * 3, 1); // 放大系数使变化更明显
    this.live2d.setParam('ParamMouthOpenY', mouthOpenY);

    // 根据音量调整嘴型 (简单元音映射)
    let mouthForm = 4; // 默认 'o'
    if (volume > 0.4) {
      mouthForm = 0; // 'a'
    } else if (volume > 0.2) {
      mouthForm = 2; // 'u'
    }
    this.live2d.setParam('ParamMouthForm', mouthForm);
  }

  stopProcessing(): void {
    this.isProcessing = false;
    // 重置口型
    this.live2d.setParam('ParamMouthOpenY', 0);
  }
}
```

## 五、情感分析设计

### 5.1 情感检测规则

```python
# emotion/analyzer.py
from __future__ import annotations
import re
from typing import Dict, Optional

class EmotionAnalyzer:
    """基于规则的情感分析器"""

    # 情感关键词
    EMOTION_KEYWORDS: Dict[str, list[str]] = {
        "happy": [
            "哈哈", "嘿嘿", "嘻嘻", "开心", "高兴", "太好了",
            "棒", "优秀", "赞", "喜欢", "爱", "有趣",
            "😄", "😊", "😂", "🤣", "❤️", "👍",
        ],
        "sad": [
            "难过", "伤心", "哭", "悲伤", "可惜", "遗憾",
            "对不起", "抱歉", "不好意思", "😢", "😭", "😞",
        ],
        "angry": [
            "生气", "愤怒", "讨厌", "烦", "滚", "笨蛋",
            "混蛋", "😠", "😡", "👿",
        ],
        "surprised": [
            "哇", "天啊", "天哪", "真的吗", "竟然",
            "居然", "没想到", "😲", "😱", "😮",
        ],
        "thinking": [
            "让我想想", "思考", "考虑", "分析",
            "研究", "查看", "检查",
        ],
    }

    @classmethod
    def analyze(cls, text: str) -> tuple[str, float]:
        """
        分析文本情感

        Returns:
            (emotion, intensity): 情感类型和强度 (0.0-1.0)
        """
        text_lower = text.lower()

        # 计算每种情感的得分
        scores = {}
        for emotion, keywords in cls.EMOTION_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if kw in text_lower:
                    score += 1
            scores[emotion] = score

        # 找出最高分
        if not scores or max(scores.values()) == 0:
            return "neutral", 0.0

        max_emotion = max(scores, key=scores.get)
        max_score = scores[max_emotion]

        # 计算强度 (0.0-1.0)
        intensity = min(max_score / 3, 1.0)

        return max_emotion, intensity

    @classmethod
    def detect_emotion_from_llm(cls, message: str) -> Optional[str]:
        """
        从 LLM 回复中检测情感提示
        例如: (微笑)、(叹气)、(点头) 等
        """
        patterns = {
            r"[\(（][微笑笑开心愉快][\)）]": "happy",
            r"[\(（][难过伤心叹气][\)）]": "sad",
            r"[\(（][生气愤怒皱眉][\)）]": "angry",
            r"[\(（][惊讶惊讶][\)）]": "surprised",
            r"[\(（][思考想想分析][\)）]": "thinking",
        }

        for pattern, emotion in patterns.items():
            if re.search(pattern, message):
                return emotion

        return None
```

### 5.2 Live2D 表情参数映射

```python
# emotion/mapper.py
from __future__ import annotations

class Live2DParamMapper:
    """情感到 Live2D 参数的映射"""

    # 不同表情的参数调整 (相对于默认值)
    EMOTION_PARAMS: dict[str, dict[str, float]] = {
        "neutral": {
            "ParamEyeLOpen": 1.0,
            "ParamEyeROpen": 1.0,
            "ParamBrowLY": 0.0,
            "ParamBrowRY": 0.0,
            "ParamBrowLAngle": 0.0,
            "ParamBrowRAngle": 0.0,
            "ParamMouthForm": 2.0,
        },
        "happy": {
            "ParamEyeLOpen": 0.8,
            "ParamEyeROpen": 0.8,
            "ParamBrowLY": -0.3,
            "ParamBrowRY": -0.3,
            "ParamBrowLAngle": 0.2,
            "ParamBrowRAngle": 0.2,
            "ParamMouthForm": 0.0,
            "ParamCheek": 0.3,
        },
        "sad": {
            "ParamEyeLOpen": 0.6,
            "ParamEyeROpen": 0.6,
            "ParamBrowLY": 0.3,
            "ParamBrowRY": 0.3,
            "ParamBrowLAngle": -0.2,
            "ParamBrowRAngle": -0.2,
            "ParamMouthForm": 4.0,
        },
        "angry": {
            "ParamEyeLOpen": 0.7,
            "ParamEyeROpen": 0.7,
            "ParamBrowLY": 0.4,
            "ParamBrowRY": 0.4,
            "ParamBrowLAngle": -0.3,
            "ParamBrowRAngle": 0.3,
            "ParamAngleX": -10.0,
            "ParamAngleY": 5.0,
        },
        "surprised": {
            "ParamEyeLOpen": 1.5,
            "ParamEyeROpen": 1.5,
            "ParamBrowLY": -0.5,
            "ParamBrowRY": -0.5,
            "ParamMouthForm": 3.0,
        },
    }

    @classmethod
    def get_params(cls, emotion: str, intensity: float = 1.0) -> dict[str, float]:
        """
        获取情感对应的参数

        Args:
            emotion: 情感类型
            intensity: 强度 0.0-1.0

        Returns:
            参数字典
        """
        base = cls.EMOTION_PARAMS.get(emotion, cls.EMOTION_PARAMS["neutral"])

        # 根据强度调整
        return {
            param: value * intensity
            for param, value in base.items()
        }
```

## 六、前端组件设计

### 6.1 组件树结构

```
App
├── Live2DContainer
│   ├── Live2DCanvas
│   │   └── PixiJS Canvas
│   └── LoadingSpinner
│
├── ChatContainer
│   ├── MessageList
│   │   └── MessageBubble[] (用户消息 + 助手消息)
│   └── TypingIndicator (思考中显示)
│
├── InputContainer
│   ├── TextInput
│   ├── VoiceInputButton
│   └── SendButton
│
└── SettingsPanel (可折叠)
    ├── ModelSelector
    ├── VolumeSlider
    ├── LipSyncToggle
    └── DebugInfo
```

### 6.2 核心组件

```typescript
// App.tsx
export function App() {
  const [state, dispatch] = useNakariState();
  const live2d = useLive2D(state.live2d.model);
  const ws = useWebSocket();

  return (
    <div className="app">
      <Live2DContainer
        live2d={live2d}
        state={state.nakari}
      />

      <ChatContainer
        messages={state.conversation.messages}
        isTyping={state.nakari.state === 'thinking'}
      />

      <InputContainer
        onSend={(text) => ws.send({ type: 'user_text', payload: { content: text } })}
        disabled={state.nakari.state === 'thinking'}
      />

      <SettingsPanel
        config={state.config}
        onUpdate={(config) => dispatch({ type: 'UPDATE_CONFIG', config })}
      />
    </div>
  );
}

// Live2DContainer.tsx
interface Live2DContainerProps {
  live2d: Live2DRenderer;
  state: NakariState['nakari'];
}

export function Live2DContainer({ live2d, state }: Live2DContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && !live2d.isLoaded) {
      live2d.init(canvasRef.current);
    }
  }, [live2d]);

  // 状态变化时触发动画
  useEffect(() => {
    switch (state.state) {
      case 'thinking':
        live2d.playMotion('thinking', 0);
        break;
      case 'idle':
        live2d.playMotion('idle', 0);
        break;
      case 'speaking':
        live2d.playMotion('speaking', 0);
        break;
    }
  }, [state.state, live2d]);

  return (
    <div className="live2d-container">
      <canvas ref={canvasRef} />
    </div>
  );
}

// MessageBubble.tsx
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  timestamp: number;
}

export function MessageBubble({ role, content, emotion, timestamp }: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${role}`}>
      {emotion && <EmotionIndicator emotion={emotion} />}
      <p className="message-content">{content}</p>
      <span className="message-time">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}
```

## 七、错误处理与重连

### 7.1 WebSocket 重连策略

```typescript
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: number | null = null;

  async connect(url: string): Promise<void> {
    try {
      this.ws = new WebSocket(url);
      this.setupHandlers();
      this.reconnectAttempts = 0;
    } catch (error) {
      this.scheduleReconnect(url);
    }
  }

  private setupHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private scheduleReconnect(url?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Reconnecting in ${delay}ms...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      if (url) {
        this.connect(url);
      }
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### 7.2 音频缓冲与平滑

```typescript
export class AudioBuffer {
  private buffer: ArrayBuffer[] = [];
  private playing = false;
  private sequence = 0;
  private expectedSequence = 0;

  addChunk(chunk: AudioChunk): void {
    this.buffer.push(chunk.data);
    this.sequence = chunk.sequence;
  }

  hasGap(): boolean {
    return this.sequence > this.expectedSequence && this.expectedSequence > 0;
  }

  getExpectedSequence(): number {
    return this.expectedSequence;
  }

  advanceSequence(): void {
    this.expectedSequence++;
  }

  clear(): void {
    this.buffer = [];
    this.sequence = 0;
    this.expectedSequence = 0;
  }
}
```

## 八、性能优化

### 8.1 音频传输优化

```python
# 使用 Opus 编码降低带宽
import opus

class AudioEncoder:
    def __init__(self, sample_rate: int = 24000, bitrate: int = 64000):
        self.encoder = opus.Encoder(sample_rate, 1, opus.APPLICATION_AUDIO)
        self.encoder.bitrate = bitrate

    def encode(self, pcm_data: bytes) -> bytes:
        """编码音频为 Opus 格式"""
        return self.encoder.encode(pcm_data, frame_size=960)
```

### 8.2 Live2D 渲染优化

```typescript
// 使用 requestAnimationFrame 的节流版本
class ThrottledRenderer {
  private lastFrame = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;

  render(callback: () => void): void {
    const now = performance.now();
    const elapsed = now - this.lastFrame;

    if (elapsed > this.frameInterval) {
      callback();
      this.lastFrame = now - (elapsed % this.frameInterval);
    }
  }
}
```

## 九、测试用例

### 9.1 后端测试

```python
# tests/test_frontend_adapter.py
import pytest
from nakari.frontend_adapter.input import WebSocketInput
from nakari.frontend_adapter.output import WebSocketOutput
from nakari.frontend_adapter.audio_interceptor import AudioStreamInterceptor

@pytest.mark.asyncio
async def test_websocket_input_creates_event(mailbox):
    ws = MockWebSocket()
    ws.add_message('{"type": "user_text", "content": "hello"}')

    input_adapter = WebSocketInput(mailbox, config)
    await input_adapter.handle_message(ws)

    events = mailbox.list_events()
    assert len(events) == 1
    assert events[0].type == EventType.USER_TEXT
    assert events[0].content == "hello"

@pytest.mark.asyncio
async def test_audio_interceptor_broadcasts():
    original = MockTTSBackend()
    broadcaster = MockAudioBroadcaster()
    interceptor = AudioStreamInterceptor(original, broadcaster)

    async for chunk in interceptor.synthesize_stream("test"):
        pass

    assert broadcaster.broadcast_count > 0
```

### 9.2 前端测试

```typescript
// tests/LipSyncProcessor.test.ts
describe('LipSyncProcessor', () => {
  it('should calculate RMS correctly', () => {
    const processor = new LipSyncProcessor(mockAudioContext, mockLive2D);
    const dataArray = new Uint8Array([128, 128, 128, 128]);
    const rms = processor['calculateRMS'](dataArray);
    expect(rms).toBeCloseTo(0.5, 1);
  });

  it('should update mouth parameter based on volume', () => {
    const live2d = mockLive2D;
    const processor = new LipSyncProcessor(mockAudioContext, live2d);

    processor['updateMouthOpen'](0.8);
    expect(live2d.setParam).toHaveBeenCalledWith('ParamMouthOpenY', 1.0);
  });
});
```

## 十、部署配置

### 10.1 Docker Compose 扩展

```yaml
# docker-compose.yml (新增)
services:
  # ... 现有服务 ...

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=ws://localhost:8000/api/ws
      - VITE_HTTP_URL=http://localhost:8000/api
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/assets:/app/assets
    command: npm run dev -- --host
    depends_on:
      - api

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      - NAKARI_API_ENABLED=true
      - NAKARI_API_HOST=0.0.0.0
      - NAKARI_API_PORT=8000
    depends_on:
      - neo4j
```

### 10.2 Nginx 配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;

    # WebSocket 升级
    location /api/ws {
        proxy_pass http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # HTTP API
    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
    }

    # 前端静态文件
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
    }
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-20
**作者**: nakari project
