/**
 * Type definitions for Live2D frontend integration
 */

// Live2D model states
export type Live2DState =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'processing'
  | 'listening';

// Emotion types
export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised';

// Live2D parameter
export interface Live2DParam {
  name: string;
  value: number;
}

// WebSocket message types
export type WSMessageType =
  | 'state'
  | 'audio'
  | 'text'
  | 'user_text'
  | 'emotion'
  | 'motion'
  | 'param'
  | 'ping'
  | 'pong'
  | 'audio_blob'; // 语音输入音频块消息

// Base WebSocket message
export interface WSMessage {
  version?: string;
  type: WSMessageType | string; // Allow string for additional message types like 'connected'
  data?: unknown;      // Legacy: some messages may use data
  payload?: unknown;   // Backend standard: most messages use payload
  timestamp?: number;
}

// State message data
export interface StateData {
  state: Live2DState;
  metadata?: Record<string, unknown>;
}

// Audio message data
export interface AudioData {
  audio: string; // base64 encoded audio chunk
  format: 'wav' | 'mp3';
  sampleRate: number;
}

// Audio blob message data (语音输入)
export interface AudioBlobData {
  audio_uri: string; // base64 encoded audio with data URI prefix
  mime_type: string;
  metadata?: {
    size?: number;
    type?: string;
    [key: string]: unknown;
  };
}

// Text message data
export interface TextData {
  text: string;
  isUser: boolean;
}

// Emotion message data
export interface EmotionData {
  emotion: Emotion;
  intensity: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
}

// Motion message data
export interface MotionData {
  group: string;
  index: number;
  priority?: number;
}

// Param message data
export interface ParamData {
  params: Live2DParam[];
}

// WebSocket connection state
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// Live2D model configuration
export interface Live2DModelConfig {
  modelUrl: string;
  textureUrls: string[];
  physicsUrl?: string;
  poseUrl?: string;
}

// App configuration
export interface AppConfig {
  wsUrl: string;
  modelConfig: Live2DModelConfig;
  enableAudio: boolean;
  enableLipSync: boolean;
}

// ===== Galgame UI Types =====

// Dialog state
export interface DialogState {
  text: string;
  speaker?: string;
  isUser: boolean;
  timestamp: number;
}

// Choice option
export interface ChoiceOption {
  id: string;
  text: string;
  disabled?: boolean;
}

// Control panel state
export interface ControlState {
  autoMode: boolean;
  skipMode: boolean;
  speed: number; // Text display speed multiplier
}

// Transition trigger info
export interface TransitionTrigger {
  type: 'emotion_change' | 'state_change' | 'scene_change' | 'manual';
  from?: string;
  to: string;
}
