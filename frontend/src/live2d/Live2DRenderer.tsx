/**
 * Live2D Renderer - Handles Live2D model rendering with PixiJS
 * Supports Cubism 2.0 models (xiaomai uses .moc format)
 */

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism2';
import type { Live2DModelConfig, Live2DParam, Emotion } from '../types';

// Expose PIXI to window for pixi-live2d-display
if (typeof window !== 'undefined') {
  (window as any).PIXI = PIXI;
}

// CRITICAL FIX: Patch AbstractBatchRenderer.contextChange to set maxIfStatements
// This must happen BEFORE any Application is created
try {
  const AbstractBatchRenderer = (PIXI as any).AbstractBatchRenderer;
  if (AbstractBatchRenderer && AbstractBatchRenderer.prototype) {
    const originalContextChange = AbstractBatchRenderer.prototype.contextChange;

    AbstractBatchRenderer.prototype.contextChange = function(gl: WebGLRenderingContext) {
      // Set maxIfStatements on this instance BEFORE the original method runs
      if (!this.maxIfStatements || this.maxIfStatements === 0) {
        Object.defineProperty(this, 'maxIfStatements', {
          value: 25,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      // Call original contextChange
      return originalContextChange.call(this, gl);
    };

    console.log('[Live2D] Patched AbstractBatchRenderer.contextChange');
  }
} catch (e) {
  console.warn('[Live2D] Patch warning:', e);
}

interface Live2DRendererProps {
  config: Live2DModelConfig;
  className?: string;
  onModelLoaded?: (model?: any) => void;
  onError?: (error: Error) => void;
}

// emotion to parameter mappings for standard Live2D models
const EMOTION_PARAMS: Record<Emotion, Live2DParam[]> = {
  neutral: [
    { name: 'ParamEyeLOpen', value: 1 },
    { name: 'ParamEyeROpen', value: 1 },
    { name: 'ParamBrowLY', value: 0 },
    { name: 'ParamBrowRY', value: 0 },
    { name: 'ParamBrowLX', value: 0 },
    { name: 'ParamBrowRX', value: 0 },
    { name: 'ParamBrowLAngle', value: 0 },
    { name: 'ParamBrowRAngle', value: 0 },
    { name: 'ParamMouthForm', value: 0 },
  ],
  happy: [
    { name: 'ParamEyeLOpen', value: 1 },
    { name: 'ParamEyeROpen', value: 1 },
    { name: 'ParamBrowLY', value: -0.3 },
    { name: 'ParamBrowRY', value: -0.3 },
    { name: 'ParamMouthForm', value: 0.5 },
  ],
  sad: [
    { name: 'ParamEyeLOpen', value: 0.7 },
    { name: 'ParamEyeROpen', value: 0.7 },
    { name: 'ParamBrowLY', value: 0.3 },
    { name: 'ParamBrowRY', value: 0.3 },
    { name: 'ParamBrowLAngle', value: 0.2 },
    { name: 'ParamBrowRAngle', value: -0.2 },
    { name: 'ParamMouthForm', value: -0.3 },
  ],
  angry: [
    { name: 'ParamEyeLOpen', value: 0.8 },
    { name: 'ParamEyeROpen', value: 0.8 },
    { name: 'ParamBrowLY', value: 0.4 },
    { name: 'ParamBrowRY', value: 0.4 },
    { name: 'ParamBrowLAngle', value: -0.3 },
    { name: 'ParamBrowRAngle', value: 0.3 },
    { name: 'ParamMouthForm', value: -0.2 },
  ],
  surprised: [
    { name: 'ParamEyeLOpen', value: 1.5 },
    { name: 'ParamEyeROpen', value: 1.5 },
    { name: 'ParamBrowLY', value: -0.5 },
    { name: 'ParamBrowRY', value: -0.5 },
    { name: 'ParamMouthForm', value: 0.3 },
  ],
};

export function Live2DRenderer({
  config,
  className = '',
  onModelLoaded,
  onError,
}: Live2DRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize PixiJS application and load Live2D model
  useEffect(() => {
    if (!canvasRef.current) return;

    let app: PIXI.Application;
    let model: any = null;

    const initPixi = async () => {
      try {
        console.log('[Live2D] Initializing PixiJS...');

        // Check if Live2D library is available
        if (typeof (window as any).Live2D === 'undefined') {
          throw new Error('Live2D Cubism 2 SDK not loaded. Please ensure live2d.min.js is loaded before the app.');
        }
        console.log('[Live2D] Live2D SDK found:', (window as any).Live2D);

        // Configure PIXI renderer for Live2D compatibility
        const rendererOptions = {
          view: canvasRef.current,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          // Allow complex shaders for Live2D
          maxTextures: 32,
          maxTextureSize: 4096,
        };

        // Create PixiJS application
        app = new PIXI.Application(rendererOptions);

        appRef.current = app;
        console.log('[Live2D] PixiJS Application created');

        // Load Live2D model from model.json
        console.log('[Live2D] Loading model from:', config.modelUrl);
        model = await Live2DModel.from(config.modelUrl);
        modelRef.current = model;
        console.log('[Live2D] Model loaded successfully');

        // Add model to stage
        app.stage.addChild(model);

        // Apply layout settings from model.json if available
        if (model.layout) {
          const { width, center_x, center_y } = model.layout;
          if (width !== undefined) {
            const scale = (window.innerWidth * 0.8) / (model.width * width);
            model.scale.set(scale * width);
          } else {
            const scale = Math.min(
              (window.innerWidth * 0.8) / model.width,
              (window.innerHeight * 0.8) / model.height
            );
            model.scale.set(scale);
          }
          if (center_x !== undefined) model.x = window.innerWidth / 2 + center_x * window.innerWidth;
          else model.x = window.innerWidth / 2;
          if (center_y !== undefined) model.y = window.innerHeight / 2 + center_y * window.innerHeight;
          else model.y = window.innerHeight / 2;
        } else {
          // Scale and center the model
          const scale = Math.min(
            (window.innerWidth * 0.8) / model.width,
            (window.innerHeight * 0.8) / model.height
          );
          model.scale.set(scale);
          model.x = window.innerWidth / 2;
          model.y = window.innerHeight / 2;
        }

        // Enable auto-breathing (idle motion)
        model.motion('idle', 0);

        // Check if component is still mounted before updating state
        if (mountedRef.current) {
          setIsLoaded(true);
          onModelLoaded?.(model);
        }
        console.log('[Live2D] Initialization complete');
      } catch (error) {
        console.error('[Live2D] Failed to load model:', error);
        // Check if component is still mounted before updating state
        if (mountedRef.current) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setLoadError(errorMsg);
          onError?.(error as Error);
        }
      }
    };

    initPixi();

    // Handle window resize
    const handleResize = () => {
      if (!app || !app.renderer || !model) return;

      try {
        app.renderer.resize(window.innerWidth, window.innerHeight);

        if (model.layout) {
          const { width, center_x, center_y } = model.layout;
          if (width !== undefined) {
            const scale = (window.innerWidth * 0.8) / (model.width * width);
            model.scale.set(scale * width);
          } else {
            const scale = Math.min(
              (window.innerWidth * 0.8) / model.width,
              (window.innerHeight * 0.8) / model.height
            );
            model.scale.set(scale);
          }
          if (center_x !== undefined) model.x = window.innerWidth / 2 + center_x * window.innerWidth;
          else model.x = window.innerWidth / 2;
          if (center_y !== undefined) model.y = window.innerHeight / 2 + center_y * window.innerHeight;
          else model.y = window.innerHeight / 2;
        } else {
          const scale = Math.min(
            (window.innerWidth * 0.8) / model.width,
            (window.innerHeight * 0.8) / model.height
          );
          model.scale.set(scale);
          model.x = window.innerWidth / 2;
          model.y = window.innerHeight / 2;
        }
      } catch (e) {
        console.warn('[Live2D] Resize error:', e);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      // Mark component as unmounted
      mountedRef.current = false;

      window.removeEventListener('resize', handleResize);

      // Clean up model
      if (model) {
        try {
          if (app && app.stage) {
            app.stage.removeChild(model);
          }
          model.destroy({ children: true });
        } catch (e) {
          console.warn('[Live2D] Model cleanup error:', e);
        }
      }

      // Clean up PIXI app
      // Note: removeView=false is crucial - React manages the canvas element
      if (app) {
        try {
          app.destroy(false, {
            children: true,
            texture: true
          });
        } catch (e) {
          console.warn('[Live2D] App cleanup error:', e);
        }
      }

      console.log('[Live2D] Cleanup complete');
    };
  }, [config, onModelLoaded, onError]);

  // Expose model control methods via ref
  useEffect(() => {
    if (!modelRef.current) return;

    // Make model methods available globally for debugging
    (window as any).live2dModel = modelRef.current;
    console.log('[Live2D] Model exposed to window.live2dModel');
  }, [isLoaded]);

  // Show placeholder when Live2D fails to load
  if (loadError) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
        }}>🎭</div>
        <p style={{fontSize: '18px', marginBottom: '10px'}}>Live2D 模型加载中...</p>
        <p style={{fontSize: '12px', opacity: 0.7, maxWidth: '400px'}}>
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`live2d-canvas ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}

// Helper functions for model control
export function setModelParams(model: any, params: Live2DParam[]): void {
  if (!model) {
    console.warn('[Live2D] Model is null or undefined');
    return;
  }

  params.forEach(({ name, value }) => {
    try {
      // pixi-live2d-display for Cubism 2.0
      // Access the internal Live2D model directly
      if (model.internalModel && model.internalModel.live2DModel) {
        const settings = model.internalModel.settings;
        if (settings) {
          // Get parameter index by name
          const paramIndex = settings.getParamIndex(name);
          if (paramIndex !== undefined && paramIndex >= 0) {
            model.internalModel.live2DModel.setParamFloat(paramIndex, value);
            console.log('[Live2D] Set param:', name, '=', value, '(index:', paramIndex, ')');
          } else {
            console.warn('[Live2D] Parameter not found:', name);
          }
        }
      } else {
        // Try direct property access as fallback
        console.warn('[Live2D] internalModel not available, trying direct access');
        if (typeof model.setParameter === 'function') {
          model.setParameter(name, value);
        }
      }
    } catch (e) {
      console.warn('[Live2D] Failed to set param:', name, value, e);
    }
  });
}

export function setModelEmotion(model: any, emotion: Emotion): void {
  const params = EMOTION_PARAMS[emotion] || EMOTION_PARAMS.neutral;
  setModelParams(model, params);
}

export function triggerMotion(
  model: any,
  group: string,
  index: number,
  priority = 3
): void {
  if (!model) {
    console.warn('[Live2D] Model is null, cannot trigger motion');
    return;
  }

  try {
    // pixi-live2d-display motion API
    if (typeof model.motion === 'function') {
      model.motion(group, index, priority);
      console.log('[Live2D] Triggered motion:', group, index, 'priority:', priority);
    } else if (model.motionManager && typeof model.motionManager.startMotion === 'function') {
      // Alternative API via motionManager
      model.motionManager.startMotion(group, index, priority);
      console.log('[Live2D] Triggered motion via motionManager:', group, index);
    } else {
      console.warn('[Live2D] No motion method available on model');
    }
  } catch (e) {
    console.error('[Live2D] Failed to trigger motion:', group, index, e);
  }
}
