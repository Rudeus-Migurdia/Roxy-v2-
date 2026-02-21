/**
 * StatusIndicator - Connection state display with color-coded status
 */

import type { ConnectionState } from '../../types';

interface StatusIndicatorProps {
  connectionState: ConnectionState;
  live2dReady?: boolean;
  className?: string;
}

export function StatusIndicator({
  connectionState,
  live2dReady = false,
  className = '',
}: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'connected';
      case 'connecting':
      case 'reconnecting':
        return 'connecting';
      case 'error':
      case 'disconnected':
        return 'error';
      default:
        return '';
    }
  };

  return (
    <div className={`galgame-status-indicator ${className}`}>
      <span className={`galgame-status-dot ${getStatusColor()}`} />
      <span>{connectionState}</span>
      {live2dReady && <span> • Live2D Ready</span>}
    </div>
  );
}
