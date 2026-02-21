/**
 * Live2D Frontend Configuration
 */

import type { AppConfig } from './types';

// Get API URL from environment or use default
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Default: connect to localhost nakari API
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_API_HOST || 'localhost';
  const port = import.meta.env.VITE_API_PORT || '8000';

  return `${protocol}//${host}:${port}/api/ws`;
};

// Get model URL from environment or use default
const getModelUrl = (): string => {
  return import.meta.env.VITE_MODEL_URL || '/models/22_high/model.json';
};

// Export configuration
export const config: AppConfig = {
  wsUrl: getApiUrl(),
  modelConfig: {
    modelUrl: getModelUrl(),
    textureUrls: [],
  },
  enableAudio: import.meta.env.VITE_ENABLE_AUDIO !== 'false',
  enableLipSync: import.meta.env.VITE_ENABLE_LIP_SYNC !== 'false',
};

// Debug mode
export const DEBUG = import.meta.env.MODE === 'development';

// Log configuration in debug mode
if (DEBUG) {
  console.log('Live2D Frontend Configuration:', {
    ...config,
    wsUrl: getApiUrl(), // Show full URL
  });
}
