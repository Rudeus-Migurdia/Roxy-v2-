/**
 * SettingsContext - Manages application settings with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

// Setting categories and their types
export interface Live2DSettings {
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

// Helper to normalize legacy p5r theme to dark
function normalizeTheme(theme: string): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  return 'dark'; // 'p5r' and any other value defaults to 'dark'
}

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Normalize legacy p5r theme to dark
      if (parsed.general?.theme) {
        parsed.general.theme = normalizeTheme(parsed.general.theme);
      }
      // Merge with defaults to handle new settings
      return {
        live2d: { ...defaultSettings.live2d, ...parsed.live2d },
        audio: { ...defaultSettings.audio, ...parsed.audio },
        general: { ...defaultSettings.general, ...parsed.general },
        advanced: { ...defaultSettings.advanced, ...parsed.advanced },
      };
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

  // Load settings on mount
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setInitialized(true);
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (initialized) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout (500ms debounce)
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
          console.error('Failed to save settings to localStorage:', error);
        }
      }, 500);
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
