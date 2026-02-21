/**
 * Main App component - nakari Live2D frontend
 * Integrates WebSocket communication with Live2D rendering
 */

import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
import { config } from './config';
import { Live2DRenderer } from './live2d/Live2DRenderer';
import { AudioProcessor } from './utils/AudioProcessor';
import { useWebSocket } from './hooks/useWebSocket';
import type { Live2DState, WSMessage } from './types';

// Error Boundary
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'red', fontFamily: 'monospace'}}>
          <h2>Application Error</h2>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [currentState, setCurrentState] = useState<Live2DState>('idle');
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [live2dReady, setLive2dReady] = useState(false);

  const modelRef = useRef<any>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);

  // Use refs for callbacks to avoid dependency issues
  const modelRefCallback = useRef(modelRef);
  const audioProcessorRefCallback = useRef(audioProcessorRef);
  modelRefCallback.current = modelRef;
  audioProcessorRefCallback.current = audioProcessorRef;

  // Stable message handler using useCallback
  const handleMessage = useCallback((message: WSMessage) => {
    console.log('WS Message:', message.type);
    switch (message.type) {
      case 'state':
        setCurrentState((message.data as { state: Live2DState }).state);
        break;
      case 'text':
        setMessages(prev => [...prev, (message.data as { text: string; isUser: boolean })]);
        break;
      case 'audio':
        console.log('Audio received:', message.data);
        // Play audio if enabled
        if (config.enableAudio && audioProcessorRefCallback.current?.current) {
          const audioData = message.data as { audio: string; format: string; sampleRate: number };
          audioProcessorRefCallback.current.current.play(audioData.audio)
            .then(() => console.log('[App] Audio playback started'))
            .catch(e => console.error('[App] Audio playback failed:', e));
        }
        break;
      case 'emotion':
        console.log('Emotion:', message.data);
        // Apply emotion to Live2D model if available
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ setModelEmotion }) => {
            setModelEmotion(modelRefCallback.current.current, (message.data as { emotion: string }).emotion as any);
          });
        }
        break;
      case 'motion':
        console.log('Motion:', message.data);
        // Trigger motion on Live2D model if available
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ triggerMotion }) => {
            const motionData = message.data as { group: string; index: number };
            triggerMotion(modelRefCallback.current.current, motionData.group, motionData.index);
          });
        }
        break;
      case 'param':
        console.log('Param:', message.data);
        // Direct parameter setting
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ setModelParams }) => {
            const paramData = message.data as { params: Array<{ name: string; value: number }> };
            setModelParams(modelRefCallback.current.current, paramData.params);
          });
        }
        break;
      default:
        console.log('[App] Unknown message type:', message.type);
    }
  }, [config.enableAudio]);

  // Stable state change handler
  const handleStateChange = useCallback((state: string) => {
    console.log('WS State:', state);
  }, []);

  // Use WebSocket hook with stable callbacks
  const { connectionState, sendText, connect } = useWebSocket(config.wsUrl, {
    autoReconnect: true,
    reconnectInterval: 3000,
    onMessage: handleMessage,
    onStateChange: handleStateChange,
  });

  // Log configuration on mount and connect
  useEffect(() => {
    console.log('App mounted');
    console.log('Config:', config);
    console.log('[App] Connecting to WebSocket:', config.wsUrl);
    // Auto-connect on mount (only once)
    connect();
  }, []); // Empty deps - run once on mount

  // Handle user input
  const handleSendMessage = useCallback((text: string) => {
    if (text.trim()) {
      sendText(text, true);
      setMessages(prev => [...prev, { text, isUser: true }]);
    }
  }, [sendText]);

  // Get connection status color
  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected': return '#22c55e';
      case 'connecting': case 'reconnecting': return '#eab308';
      case 'error': case 'disconnected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Handle Live2D model loaded
  const handleModelLoaded = useCallback((model?: any) => {
    console.log('Live2D model loaded', model ? '(with model reference)' : '(no model reference)');
    if (model) {
      modelRef.current = model;
      console.log('[App] Model reference stored:', model);
    }
    setLive2dReady(true);

    // Initialize AudioProcessor with lip-sync callback
    if (!audioProcessorRef.current && config.enableLipSync) {
      audioProcessorRef.current = new AudioProcessor((mouthParam) => {
        // Apply mouth parameter to Live2D model for lip-sync
        if (modelRef.current) {
          try {
            // Use the same parameter setting logic
            import('./live2d/Live2DRenderer').then(({ setModelParams }) => {
              setModelParams(modelRef.current, [{ name: 'ParamMouthOpenY', value: mouthParam }]);
            });
          } catch (e) {
            console.warn('[App] Failed to update lip-sync:', e);
          }
        }
      });
      console.log('[App] AudioProcessor initialized for lip-sync');
    }
  }, [config.enableLipSync]);

  // Handle Live2D error
  const handleLive2DError = useCallback((error: Error) => {
    console.error('Live2D error:', error);
  }, []);

  return (
    <div className="app-container">
      {/* Connection status indicator */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '20px',
        color: getConnectionColor(),
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getConnectionColor(),
        }}></span>
        {connectionState}
      </div>

      {/* Live2D Renderer */}
      <Live2DRenderer
        config={config.modelConfig}
        onModelLoaded={handleModelLoaded}
        onError={handleLive2DError}
      />

      {/* State display */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        borderRadius: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: live2dReady ? '#22c55e' : '#eab308',
        fontSize: '14px',
        zIndex: 10,
      }}>
        {live2dReady ? `Live2D: Ready • State: ${currentState}` : `Live2D: Loading... • State: ${currentState}`}
      </div>

      {/* Message display */}
      <div className="messages-container" style={{
        position: 'fixed',
        bottom: '160px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        maxWidth: '600px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10,
      }}>
        {messages.slice(-3).map((msg, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: msg.isUser
              ? 'rgba(59, 130, 246, 0.8)'
              : 'rgba(100, 116, 139, 0.8)',
            color: 'white',
            alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            backdropFilter: 'blur(10px)',
            fontSize: '14px',
          }}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input area */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        zIndex: 10,
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }}
          disabled={connectionState !== 'connected'}
          style={{
            padding: '12px 20px',
            borderRadius: '25px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            width: '300px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => {
            const input = document.querySelector('input') as HTMLInputElement;
            handleSendMessage(input.value);
            input.value = '';
          }}
          disabled={connectionState !== 'connected'}
          style={{
            padding: '12px 24px',
            borderRadius: '25px',
            border: 'none',
            background: connectionState === 'connected' ? '#3b82f6' : '#9ca3af',
            color: 'white',
            fontSize: '14px',
            cursor: connectionState === 'connected' ? 'pointer' : 'not-allowed',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
