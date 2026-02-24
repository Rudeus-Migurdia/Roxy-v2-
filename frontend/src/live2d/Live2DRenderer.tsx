/**
 * Live2D Renderer - Handles Live2D model rendering with PixiJS
 * Supports Cubism 2.0 models (.model.json format with .moc)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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
  }
} catch (e) {
  // Silently ignore patch errors
}

interface Live2DRendererProps {
  config: Live2DModelConfig;
  className?: string;
  onModelLoaded?: (model?: any) => void;
  onError?: (error: Error) => void;
  live2dSettings?: {
    modelScale: number;
    positionX: number;
    positionY: number;
    idleMotion: boolean;
    breathingAnimation: boolean;
  };
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
  live2dSettings,
}: Live2DRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const breathingAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const live2dSettingsRef = useRef(live2dSettings);
  const configRef = useRef(config);
  const onModelLoadedRef = useRef(onModelLoaded);
  const onErrorRef = useRef(onError);
  // Store original model dimensions (before anchor/scale changes)
  const originalDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const anchorSetRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep refs in sync with props
  useEffect(() => {
    live2dSettingsRef.current = live2dSettings;
    configRef.current = config;
    onModelLoadedRef.current = onModelLoaded;
    onErrorRef.current = onError;
  }, [live2dSettings, config, onModelLoaded, onError]);

  // Helper function to apply scale to model (only when modelScale changes)
  const applyScale = useCallback((model: any) => {
    if (!model) return;

    const settings = live2dSettingsRef.current;
    // Use default value if settings are undefined
    const modelScale = settings?.modelScale ?? 1;

    // IMPORTANT: Get original dimensions BEFORE setting anchor
    // Because changing anchor affects how model.width/height are calculated
    if (!originalDimensionsRef.current) {
      // Temporarily reset scale to get original dimensions
      const currentScale = model.scale.x;
      model.scale.set(1);
      const modelWidth = model.width || 1;
      const modelHeight = model.height || 1;
      // Restore scale
      model.scale.set(currentScale);
      // Store original dimensions
      originalDimensionsRef.current = { width: modelWidth, height: modelHeight };
    }

    // Set anchor to center (only once, AFTER getting dimensions)
    if (!anchorSetRef.current) {
      model.anchor.set(0.5, 0.5);
      anchorSetRef.current = true;
    }

    const { width: modelWidth, height: modelHeight } = originalDimensionsRef.current;

    // Calculate scale to fit 80% of viewport (shorter dimension determines scale)
    const scaleX = (window.innerWidth * 0.8) / modelWidth;
    const scaleY = (window.innerHeight * 0.8) / modelHeight;
    const baseScale = Math.min(scaleX, scaleY);

    // Apply modelScale multiplier
    model.scale.set(baseScale * modelScale);
  }, []);

  // Helper function to apply position to model (only when positionX/Y changes)
  const applyPosition = useCallback((model: any) => {
    if (!model) return;

    const settings = live2dSettingsRef.current;
    // Use default values if settings are undefined (positionX = 0 means centered)
    const positionX = settings?.positionX ?? 0;
    const positionY = settings?.positionY ?? 0;

    // Use the model's actual current width/height for position calculation
    // This accounts for any Live2D model-specific offsets or characteristics
    const scaledWidth = model.width || 1;
    const scaledHeight = model.height || 1;

    // New position logic: positionX = 0 means centered
    // positionX is a percentage of screen width (-0.5 to 0.5)
    // Calculate center position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // positionX = 0 → model centered
    // positionX = -0.5 → model moves left by 50% of screen width
    // positionX = 0.5 → model moves right by 50% of screen width
    const newX = centerX + positionX * window.innerWidth;
    const newY = centerY + positionY * window.innerHeight;

    model.x = newX;
    model.y = newY;
  }, []);

  // Combined function for initial setup
  const applySettings = useCallback((model: any) => {
    if (!model) return;
    applyScale(model);
    applyPosition(model);
  }, [applyScale, applyPosition]);

  // Initialize PixiJS application and load Live2D model (run once)
  useEffect(() => {
    if (!canvasRef.current) return;

    let app: PIXI.Application;
    let model: any = null;

    const initPixi = async () => {
      try {
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

        // Load Live2D model from model.json
        const currentConfig = configRef.current;
        model = await Live2DModel.from(currentConfig.modelUrl);
        modelRef.current = model;

        // Add model to stage
        app.stage.addChild(model);

        // Apply Live2D settings (scale, position)
        applySettings(model);

        // Enable idle motion based on settings
        const currentSettings = live2dSettingsRef.current;
        if (currentSettings?.idleMotion !== false) {
          model.motion('idle', 0);
        }

        // Check if component is still mounted before updating state
        if (mountedRef.current) {
          setIsLoaded(true);
          onModelLoadedRef.current?.(model);
        }
      } catch (error) {
        console.error('[Live2D] Failed to load model:', error);
        // Check if component is still mounted before updating state
        if (mountedRef.current) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          setLoadError(errorMsg);
          onErrorRef.current?.(error as Error);
        }
      }
    };

    initPixi();

    // Handle window resize
    const handleResize = () => {
      if (!app || !app.renderer || !model) return;

      try {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        applySettings(model);
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
    };
  }, []); // Run only once

  // Expose model control methods via ref
  useEffect(() => {
    if (!modelRef.current) return;
    // Model is ready
  }, [isLoaded]);

  // Apply scale when it changes (also update position since scale affects valid position range)
  useEffect(() => {
    if (modelRef.current) {
      applyScale(modelRef.current);
      // Re-apply position since scale affects the valid position bounds
      applyPosition(modelRef.current);
    }
  }, [live2dSettings?.modelScale, applyScale, applyPosition]);

  // Apply position when it changes
  useEffect(() => {
    if (modelRef.current) {
      applyPosition(modelRef.current);
    }
  }, [live2dSettings?.positionX, live2dSettings?.positionY, applyPosition]);

  // Handle idleMotion setting changes
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    if (live2dSettings?.idleMotion !== false) {
      // Start idle motion if not already running
      // Using a low priority motion that won't interrupt important motions
      model.motion('idle', 0, 1);
    }
    // Note: We don't stop idle motion when disabled since Live2D handles this internally
    // and stopping it might interrupt other motions
  }, [live2dSettings?.idleMotion]);

  // Breathing animation control
  useEffect(() => {
    if (!modelRef.current || live2dSettings === undefined) return;

    if (live2dSettings.breathingAnimation) {
      // Start breathing animation
      breathingAnimationRef.current = setInterval(() => {
        const model = modelRef.current;
        if (!model) return;

        // Breathing cycle: expand and contract
        const cycle = (Date.now() % 3000) / 3000; // 3 second cycle
        const breathValue = Math.sin(cycle * Math.PI * 2) * 0.1;
        setModelParams(model, [{ name: 'ParamBreath', value: breathValue }]);
      }, 50); // Update every 50ms
    } else {
      // Stop breathing animation
      if (breathingAnimationRef.current) {
        clearInterval(breathingAnimationRef.current);
        breathingAnimationRef.current = null;
      }
      // Reset breathing parameter
      if (modelRef.current) {
        setModelParams(modelRef.current, [{ name: 'ParamBreath', value: 0 }]);
      }
    }

    return () => {
      if (breathingAnimationRef.current) {
        clearInterval(breathingAnimationRef.current);
      }
    };
  }, [live2dSettings?.breathingAnimation]);

  // Cleanup breathing animation on unmount
  useEffect(() => {
    return () => {
      if (breathingAnimationRef.current) {
        clearInterval(breathingAnimationRef.current);
      }
    };
  }, []);

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
        <p style={{fontSize: '18px', marginBottom: '10px'}}>Live2D 模型加载失败</p>
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
  if (!model) return;

  params.forEach(({ name, value }) => {
    try {
      // pixi-live2d-display (auto-detects Cubism version)
      const internalModel = model.internalModel;

      if (!internalModel) return;

      // Check for Cubism 4.0 (has coreModel)
      if (internalModel.coreModel) {
        const coreModel = internalModel.coreModel;

        // Cubism 4: Find parameter by name and get its ID
        const paramCount = coreModel.getParameterCount?.() ?? coreModel._parameterCount ?? 0;
        let paramId: number | undefined;

        for (let i = 0; i < paramCount; i++) {
          const paramName = coreModel.getParameterName?.(i);
          if (paramName === name) {
            paramId = i;
            break;
          }
        }

        if (paramId !== undefined) {
          coreModel.setParameterValue?.(paramId, value);
        }
      }
      // Check for Cubism 2.0 (has live2DModel)
      else if (internalModel.live2DModel) {
        const live2DModel = internalModel.live2DModel;
        const settings = internalModel.settings;

        if (settings) {
          // Cubism 2: Get parameter index by name
          const paramIndex = settings.getParamIndex(name);
          if (paramIndex !== undefined && paramIndex >= 0) {
            live2DModel.setParamFloat(paramIndex, value);
          }
        }
      }
    } catch (e) {
      // Silently fail for parameter setting errors
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
  if (!model) return;

  try {
    // pixi-live2d-display motion API
    if (typeof model.motion === 'function') {
      model.motion(group, index, priority);
    } else if (model.motionManager && typeof model.motionManager.startMotion === 'function') {
      // Alternative API via motionManager
      model.motionManager.startMotion(group, index, priority);
    }
  } catch (e) {
    console.error('[Live2D] Failed to trigger motion:', group, index, e);
  }
}
