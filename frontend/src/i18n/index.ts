/**
 * Internationalization (i18n) translations
 */

export type Language = 'en' | 'zh' | 'ja';

export interface Translations {
  // Settings Panel
  settings: string;
  general: string;
  live2d: string;
  audio: string;
  advanced: string;

  // General Settings
  theme: string;
  language: string;
  autoScrollChat: string;

  // Theme Options
  light: string;
  dark: string;

  // Live2D Settings
  modelScale: string;
  positionX: string;
  positionY: string;
  idleMotion: string;
  breathingAnimation: string;

  // Audio Settings
  ttsVolume: string;
  micSensitivity: string;
  lipSync: string;
  enableAudio: string;

  // Advanced Settings
  debugMode: string;
  showAIThoughts: string;

  // Data Management
  dataManagement: string;
  exportSettings: string;
  importSettings: string;
  resetToDefaults: string;
  copyToClipboard: string;

  // Labels with values
  modelScaleValue: (value: string) => string;
  positionValue: (value: number) => string;
  volumeValue: (value: number) => string;

  // Sidebar
  newChat: string;
  recentHistory: string;

  // Input
  typeMessage: string;
  recording: string;
  send: string;
}

const translations: Record<Language, Translations> = {
  en: {
    settings: 'Settings',
    general: 'General',
    live2d: 'Live2D',
    audio: 'Audio',
    advanced: 'Advanced',
    theme: 'Theme',
    language: 'Language',
    autoScrollChat: 'Auto Scroll Chat',
    light: 'Light',
    dark: 'Dark',
    modelScale: 'Model Scale',
    positionX: 'Position X',
    positionY: 'Position Y',
    idleMotion: 'Idle Motion',
    breathingAnimation: 'Breathing Animation',
    ttsVolume: 'TTS Volume',
    micSensitivity: 'Mic Sensitivity',
    lipSync: 'Lip Sync',
    enableAudio: 'Enable Audio',
    debugMode: 'Debug Mode',
    showAIThoughts: 'Show AI Thoughts',
    dataManagement: 'Data Management',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    resetToDefaults: 'Reset to Defaults',
    copyToClipboard: 'Copy to Clipboard',
    modelScaleValue: (value: string) => `${value}x`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: 'New Chat',
    recentHistory: 'Recent History',
    typeMessage: 'Type a message...',
    recording: 'Recording...',
    send: 'Send',
  },
  zh: {
    settings: '设置',
    general: '通用',
    live2d: 'Live2D',
    audio: '音频',
    advanced: '高级',
    theme: '主题',
    language: '语言',
    autoScrollChat: '自动滚动聊天',
    light: '浅色',
    dark: '深色',
    modelScale: '模型缩放',
    positionX: '位置 X',
    positionY: '位置 Y',
    idleMotion: '空闲动作',
    breathingAnimation: '呼吸动画',
    ttsVolume: '语音音量',
    micSensitivity: '麦克风灵敏度',
    lipSync: '口型同步',
    enableAudio: '启用音频',
    debugMode: '调试模式',
    showAIThoughts: '显示 AI 思考',
    dataManagement: '数据管理',
    exportSettings: '导出设置',
    importSettings: '导入设置',
    resetToDefaults: '重置为默认值',
    copyToClipboard: '复制到剪贴板',
    modelScaleValue: (value: string) => `${value}倍`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: '新对话',
    recentHistory: '近期记录',
    typeMessage: '输入消息...',
    recording: '录音中...',
    send: '发送',
  },
  ja: {
    settings: '設定',
    general: '一般',
    live2d: 'Live2D',
    audio: 'オーディオ',
    advanced: '詳細',
    theme: 'テーマ',
    language: '言語',
    autoScrollChat: '自動スクロール',
    light: 'ライト',
    dark: 'ダーク',
    modelScale: 'モデルスケール',
    positionX: '位置 X',
    positionY: '位置 Y',
    idleMotion: 'アイドルモーション',
    breathingAnimation: '呼吸アニメーション',
    ttsVolume: 'TTS音量',
    micSensitivity: 'マイク感度',
    lipSync: 'リップシンク',
    enableAudio: 'オーディオ有効',
    debugMode: 'デバッグモード',
    showAIThoughts: 'AI思考を表示',
    dataManagement: 'データ管理',
    exportSettings: '設定をエクスポート',
    importSettings: '設定をインポート',
    resetToDefaults: 'デフォルトにリセット',
    copyToClipboard: 'クリップボードにコピー',
    modelScaleValue: (value: string) => `${value}倍`,
    positionValue: (value: number) => `${value}px`,
    volumeValue: (value: number) => `${value}%`,
    newChat: '新しいチャット',
    recentHistory: '最近の履歴',
    typeMessage: 'メッセージを入力...',
    recording: '録音中...',
    send: '送信',
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export const defaultLanguage: Language = 'en';
