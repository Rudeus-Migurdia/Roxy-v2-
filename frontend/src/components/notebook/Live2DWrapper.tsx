/**
 * Live2DWrapper - Wraps Live2DRenderer with minimize/expand functionality
 * Positioned on the left side of the input area
 */

import { useState, useEffect } from 'react';
import { Live2DRenderer } from '../../live2d/Live2DRenderer';
import { config } from '../../config';
import type { Live2DWrapperProps } from '../../types/notebook';

export function Live2DWrapper({ state, onStateChange, onModelLoaded, onError }: Live2DWrapperProps) {
  const [isDragging, setIsDragging] = useState(false);

  const { mode, opacity, scale } = state;

  // Handle drag start (only for full screen mode)
  const handleDragStart = (e: React.MouseEvent) => {
    if (mode !== 'full') return; // Only drag in full screen mode
    if (e.target instanceof HTMLElement && e.target.closest('.live2d-wrapper__controls')) {
      return; // Don't drag when clicking controls
    }
    setIsDragging(true);
  };

  // Handle drag move
  useEffect(() => {
    const handleDragMove = () => {
      if (!isDragging) return;
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  const handleToggleMode = () => {
    const modeCycle: Record<typeof mode, typeof mode> = {
      full: 'minimized',
      minimized: 'transparent',
      transparent: 'hidden',
      hidden: 'minimized',
    };
    onStateChange({ mode: modeCycle[mode] });
  };

  if (mode === 'hidden') {
    return null; // Don't show anything when hidden
  }

  const isFullScreen = mode === 'full';
  const isTransparent = mode === 'transparent';

  const wrapperClass = `live2d-wrapper ${isFullScreen ? 'live2d-wrapper--full' : 'live2d-wrapper--minimized'} ${isDragging ? 'live2d-wrapper--dragging' : ''}`;
  const wrapperStyle = { opacity: isFullScreen ? opacity : (isTransparent ? 0.3 : 1) };

  return (
    <div
      className={wrapperClass}
      style={wrapperStyle}
      onMouseDown={handleDragStart}
    >
      <div className="live2d-wrapper__canvas">
        <Live2DRenderer
          config={config.modelConfig}
          onModelLoaded={onModelLoaded}
          onError={onError}
        />
      </div>

      {/* Controls - only show minimal controls in normal mode, full controls in fullscreen */}
      {isFullScreen && (
        <div className="live2d-wrapper__controls">
          <button
            className="live2d-wrapper__btn"
            onClick={handleToggleMode}
            title="退出全屏"
          >
            −
          </button>

          <div className="live2d-wrapper__sliders">
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => onStateChange({ opacity: parseFloat(e.target.value) })}
              className="live2d-wrapper__slider"
              title="透明度"
            />
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={scale}
              onChange={(e) => onStateChange({ scale: parseFloat(e.target.value) })}
              className="live2d-wrapper__slider"
              title="缩放"
            />
          </div>

          <button
            className="live2d-wrapper__btn live2d-wrapper__btn--close"
            onClick={() => onStateChange({ mode: 'hidden' })}
            title="隐藏"
          >
            ×
          </button>
        </div>
      )}

      {/* Minimal expand button for normal mode */}
      {!isFullScreen && (
        <div className="live2d-wrapper__controls live2d-wrapper__controls--minimal">
          <button
            className="live2d-wrapper__btn"
            onClick={handleToggleMode}
            title={isTransparent ? '显示' : '全屏显示'}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
