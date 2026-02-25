/**
 * SettingsContext - Manages application settings with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

// Setting categories and their types
export interface Live2DSettings {
  model: string;             // Model identifier
  modelScale: number;        // Model scale multiplier (0.5 - 2.0)
  positionX: number;         // Horizontal position as percentage of viewport (-0.5 - 0.5)
  positionY: number;         // Vertical position as percentage of viewport (-0.5 - 0.5)
  idleMotion: boolean;       // Enable idle animation
  breathingAnimation: boolean; // Enable breathing animation
}

export interface AudioSettings {
  ttsVolume: number;
  micSensitivity: number;
  lipSync: boolean;
  enableAudio: boolean;
}

export interface GeneralSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'zh' | 'ja';
  autoScrollChat: boolean;
}

export interface AdvancedSettings {
  debugMode: boolean;
  showThoughts: boolean;
}

export interface AppSettings {
  live2d: Live2DSettings;
  audio: AudioSettings;
  general: GeneralSettings;
  advanced: AdvancedSettings;
}

// Default settings
const defaultSettings: AppSettings = {
  live2d: {
    model: 'xiaomai',
    modelScale: 1.0,
    positionX: 0,
    positionY: 0,
    idleMotion: true,
    breathingAnimation: true,
  },
  audio: {
    ttsVolume: 0.8,
    micSensitivity: 0.7,
    lipSync: true,
    enableAudio: true,
  },
  general: {
    theme: 'dark',
    language: 'en',
    autoScrollChat: true,
  },
  advanced: {
    debugMode: false,
    showThoughts: false,
  },
};

// Storage key
const SETTINGS_STORAGE_KEY = 'nakari_settings';

// Model URL mapping
export const MODEL_URLS: Record<string, string> = {
  xiaomai: '/models/xiaomai/xiaomai.model.json',
  miku: '/models/miku/miku.model.json',
  '22_high': '/models/22_high/model.json',
  '33_high': '/models/33_high/model.json',
};

// Get model URL from model identifier
export function getModelUrl(modelId: string): string {
  return MODEL_URLS[modelId] || MODEL_URLS.xiaomai;
}

// Helper to normalize legacy p5r theme to dark
function normalizeTheme(theme: string): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  return 'dark'; // 'p5r' and any other value defaults to 'dark'
}

// Type guard to check if value is a valid theme
function isValidTheme(value: unknown): value is 'light' | 'dark' {
  return value === 'light' || value === 'dark';
}

// Type guard to check if value is a valid language
function isValidLanguage(value: unknown): value is 'en' | 'zh' | 'ja' {
  return value === 'en' || value === 'zh' || value === 'ja';
}

// Validate and sanitize Live2D settings
function validateLive2DSettings(data: unknown): Live2DSettings {
  if (typeof data !== 'object' || data === null) {
    return defaultSettings.live2d;
  }
  const settings = data as Partial<Live2DSettings>;
  // Valid model identifiers
  const validModels = ['xiaomai', 'miku', '22_high', '33_high'];
  const model = typeof settings.model === 'string' && validModels.includes(settings.model)
    ? settings.model : defaultSettings.live2d.model;
  return {
    model,
    modelScale: typeof settings.modelScale === 'number' && settings.modelScale >= 0.5 && settings.modelScale <= 2.0
      ? settings.modelScale : defaultSettings.live2d.modelScale,
    positionX: typeof settings.positionX === 'number' && settings.positionX >= -0.5 && settings.positionX <= 0.5
      ? settings.positionX : defaultSettings.live2d.positionX,
    positionY: typeof settings.positionY === 'number' && settings.positionY >= -0.5 && settings.positionY <= 0.5
      ? settings.positionY : defaultSettings.live2d.positionY,
    idleMotion: typeof settings.idleMotion === 'boolean' ? settings.idleMotion : defaultSettings.live2d.idleMotion,
    breathingAnimation: typeof settings.breathingAnimation === 'boolean'
      ? settings.breathingAnimation : defaultSettings.live2d.breathingAnimation,
  };
}

// Validate and sanitize Audio settings
function validateAudioSettings(data: unknown): AudioSettings {
  if (typeof data !== 'object' || data === null) {
    return defaultSettings.audio;
  }
  const settings = data as Partial<AudioSettings>;
  return {
    ttsVolume: typeof settings.ttsVolume === 'number' && settings.ttsVolume >= 0 && settings.ttsVolume <= 1
      ? settings.ttsVolume : defaultSettings.audio.ttsVolume,
    micSensitivity: typeof settings.micSensitivity === 'number' && settings.micSensitivity >= 0 && settings.micSensitivity <= 1
      ? settings.micSensitivity : defaultSettings.audio.micSensitivity,
    lipSync: typeof settings.lipSync === 'boolean' ? settings.lipSync : defaultSettings.audio.lipSync,
    enableAudio: typeof settings.enableAudio === 'boolean' ? settings.enableAudio : defaultSettings.audio.enableAudio,
  };
}

// Validate and sanitize General settings
function validateGeneralSettings(data: unknown): GeneralSettings {
  if (typeof data !== 'object' || data === null) {
    return defaultSettings.general;
  }
  const settings = data as Partial<GeneralSettings>;
  return {
    theme: isValidTheme(settings.theme) ? settings.theme : defaultSettings.general.theme,
    language: isValidLanguage(settings.language) ? settings.language : defaultSettings.general.language,
    autoScrollChat: typeof settings.autoScrollChat === 'boolean'
      ? settings.autoScrollChat : defaultSettings.general.autoScrollChat,
  };
}

// Validate and sanitize Advanced settings
function validateAdvancedSettings(data: unknown): AdvancedSettings {
  if (typeof data !== 'object' || data === null) {
    return defaultSettings.advanced;
  }
  const settings = data as Partial<AdvancedSettings>;
  return {
    debugMode: typeof settings.debugMode === 'boolean' ? settings.debugMode : defaultSettings.advanced.debugMode,
    showThoughts: typeof settings.showThoughts === 'boolean'
      ? settings.showThoughts : defaultSettings.advanced.showThoughts,
  };
}

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // Validate that parsed data is an object
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          live2d: validateLive2DSettings(parsed.live2d),
          audio: validateAudioSettings(parsed.audio),
          general: validateGeneralSettings(parsed.general),
          advanced: validateAdvancedSettings(parsed.advanced),
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
  }
  return defaultSettings;
};

// Context interface
interface SettingsContextType {
  settings: AppSettings;
  updateLive2DSettings: (updates: Partial<Live2DSettings>) => void;
  updateAudioSettings: (updates: Partial<AudioSettings>) => void;
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => void;
  updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [initialized, setInitialized] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSettingsRef = useRef<string>(''); // Track last saved settings for dirty check

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    // Initialize last saved settings
    lastSavedSettingsRef.current = JSON.stringify(loaded);
    setInitialized(true);
  }, []);

  // Debounced save to localStorage with dirty check
  useEffect(() => {
    if (initialized) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Serialize current settings for comparison
      const currentSettingsJson = JSON.stringify(settings);

      // Dirty check: only save if settings actually changed
      if (currentSettingsJson === lastSavedSettingsRef.current) {
        return;
      }

      // Set new timeout (1000ms debounce for better performance)
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, currentSettingsJson);
          lastSavedSettingsRef.current = currentSettingsJson;
        } catch (error) {
          console.error('Failed to save settings to localStorage:', error);
        }
      }, 1000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, initialized]);

  // Update functions
  const updateLive2DSettings = useCallback((updates: Partial<Live2DSettings>) => {
    setSettings(prev => ({
      ...prev,
      live2d: { ...prev.live2d, ...updates },
    }));
  }, []);

  const updateAudioSettings = useCallback((updates: Partial<AudioSettings>) => {
    setSettings(prev => ({
      ...prev,
      audio: { ...prev.audio, ...updates },
    }));
  }, []);

  const updateGeneralSettings = useCallback((updates: Partial<GeneralSettings>) => {
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, ...updates },
    }));
  }, []);

  const updateAdvancedSettings = useCallback((updates: Partial<AdvancedSettings>) => {
    setSettings(prev => ({
      ...prev,
      advanced: { ...prev.advanced, ...updates },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      // Validate structure
      if (parsed.live2d && parsed.audio && parsed.general && parsed.advanced) {
        // Normalize legacy p5r theme
        if (parsed.general?.theme) {
          parsed.general.theme = normalizeTheme(parsed.general.theme);
        }
        setSettings({
          live2d: { ...defaultSettings.live2d, ...parsed.live2d },
          audio: { ...defaultSettings.audio, ...parsed.audio },
          general: { ...defaultSettings.general, ...parsed.general },
          advanced: { ...defaultSettings.advanced, ...parsed.advanced },
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
    }
    return false;
  }, []);

  const value: SettingsContextType = {
    settings,
    updateLive2DSettings,
    updateAudioSettings,
    updateGeneralSettings,
    updateAdvancedSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// Hook to use settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
