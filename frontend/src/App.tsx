/**
 * Main App component - nakari Live2D frontend with Galgame/P5R styling
 * Integrates WebSocket communication with Live2D rendering in visual novel style
 */

import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
import { config } from './config';
import { Live2DRenderer } from './live2d/Live2DRenderer';
import { AudioProcessor } from './utils/AudioProcessor';
import { useWebSocket } from './hooks/useWebSocket';
import type { Live2DState, WSMessage, DialogState } from './types';
import { useTransition } from './components/transitions';
import { P5RTheme, TRANSITION_TYPES } from './utils/styles/theme';

// Galgame components
import {
  GalgameLayout,
  BackgroundLayer,
  DialogBox,
  CharacterName,
  TextInput,
  LeftSidebar,
  MainViewContainer,
} from './components/galgame';

// UI components
import { StatusIndicator } from './components/ui';

// Context providers
import { SidebarProvider, useSidebarContext } from './contexts/SidebarContext';

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
        <div style={{
          padding: '20px',
          color: P5RTheme.colors.primary.red,
          fontFamily: 'monospace',
          background: P5RTheme.colors.primary.black,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <h2 style={{color: P5RTheme.colors.primary.red}}>Application Error</h2>
          <pre style={{color: P5RTheme.colors.primary.white}}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // Core state
  const [currentState, setCurrentState] = useState<Live2DState>('idle');
  const [currentDialog, setCurrentDialog] = useState<DialogState | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [live2dReady, setLive2dReady] = useState(false);
  const [messageHistory, setMessageHistory] = useState<DialogState[]>([]);

  // Sidebar state
  const { leftSidebarOpen, leftSidebarCollapsed } = useSidebarContext();

  // Refs
  const modelRef = useRef<any>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const modelRefCallback = useRef(modelRef);
  const audioProcessorRefCallback = useRef(audioProcessorRef);
  modelRefCallback.current = modelRef;
  audioProcessorRefCallback.current = audioProcessorRef;

  // Transition hook
  const { transition, trigger } = useTransition();

  // Stable message handler using useCallback
  const handleMessage = useCallback((message: WSMessage) => {
    // Use payload for all message types (backend sends payload, not data)
    const payload = (message as any).payload || message.data;
    console.log('WS Message:', message.type, payload);
    switch (message.type) {
      case 'connected': {
        // 'connected' is not in WSMessageType but is sent by backend
        console.log('WebSocket connected:', payload);
        break;
      }
      case 'state':
        const newState = (payload as { state: Live2DState }).state;
        // Trigger transition on state change
        if (newState !== currentState && newState === 'speaking') {
          trigger(TRANSITION_TYPES.SLASH_DOWN, 300);
        }
        setCurrentState(newState);
        break;

      case 'text':
        const textData = payload as { text: string; isUser: boolean };
        // Only update if text is valid
        if (textData.text && textData.text !== 'undefined' && textData.text !== 'null') {
          const newDialog: DialogState = {
            text: textData.text,
            speaker: textData.isUser ? 'You' : 'Roxy',
            isUser: textData.isUser,
            timestamp: Date.now(),
          };
          // Add to history
          setMessageHistory(prev => [...prev, newDialog]);
          // Update current dialog
          setCurrentDialog(newDialog);
        }
        break;

      case 'user_text':
        console.log('User text received:', payload);
        break;

      case 'audio':
        console.log('Audio received:', payload);
        // Play audio if enabled
        if (config.enableAudio && audioProcessorRefCallback.current?.current) {
          const audioData = payload as { audio: string; format: string; sampleRate: number };
          audioProcessorRefCallback.current.current.play(audioData.audio)
            .then(() => console.log('[App] Audio playback started'))
            .catch(e => console.error('[App] Audio playback failed:', e));
        }
        break;

      case 'emotion':
        const newEmotion = (payload as { emotion: string }).emotion;
        console.log('Emotion:', newEmotion);
        // Trigger transition on emotion change
        if (newEmotion !== currentEmotion && newEmotion !== 'neutral') {
          trigger(TRANSITION_TYPES.SLASH_DOWN, 300);
        }
        setCurrentEmotion(newEmotion);
        // Apply emotion to Live2D model if available
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ setModelEmotion }) => {
            setModelEmotion(modelRefCallback.current.current, newEmotion as any);
          });
        }
        break;

      case 'motion':
        console.log('Motion:', payload);
        // Trigger motion on Live2D model if available
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ triggerMotion }) => {
            const motionData = payload as { group: string; index: number };
            triggerMotion(modelRefCallback.current.current, motionData.group, motionData.index);
          });
        }
        break;

      case 'param':
        console.log('Param:', payload);
        // Direct parameter setting
        if (modelRefCallback.current?.current) {
          import('./live2d/Live2DRenderer').then(({ setModelParams }) => {
            const paramData = payload as { params: Array<{ name: string; value: number }> };
            setModelParams(modelRefCallback.current.current, paramData.params);
          });
        }
        break;

      default:
        console.log('[App] Unknown message type:', message.type);
    }
  }, [config.enableAudio, currentState, currentEmotion, trigger]);

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
      const newUserDialog: DialogState = {
        text,
        speaker: 'You',
        isUser: true,
        timestamp: Date.now(),
      };
      // Add to history
      setMessageHistory(prev => [...prev, newUserDialog]);
      // Update current dialog
      setCurrentDialog(newUserDialog);
    }
  }, [sendText]);

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
    <GalgameLayout>
      {/* Background Layer */}
      <BackgroundLayer />

      {/* Left Sidebar - Navigation */}
      <LeftSidebar />

      {/* Main View Container - shifts as a unit when sidebar opens */}
      <MainViewContainer
        sidebarOpen={leftSidebarOpen}
        sidebarCollapsed={leftSidebarCollapsed}
      >
        {/* Live2D Character Layer */}
        <Live2DRenderer
          className="galgame-character-layer"
          config={config.modelConfig}
          onModelLoaded={handleModelLoaded}
          onError={handleLive2DError}
        />

        {/* Dialog Section */}
        {live2dReady && (
          <div className="galgame-dialog-container">
            <CharacterName name={currentDialog?.speaker} />
            <DialogBox
              text={currentDialog?.text ?? 'Hello! I am Roxy. How can I help you today?'}
            />
          </div>
        )}

        {/* Input Area */}
        <TextInput
          onSend={handleSendMessage}
          disabled={connectionState !== 'connected'}
          placeholder="Type a message..."
        />
      </MainViewContainer>

      {/* P5R Transition Overlay */}
      {transition && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 200, pointerEvents: 'none' }}>
          {transition}
        </div>
      )}

      {/* Header with Status */}
      <header className="galgame-header">
        <StatusIndicator connectionState={connectionState} live2dReady={live2dReady} />
      </header>
    </GalgameLayout>
  );
}

function AppWithProviders() {
  return (
    <SidebarProvider defaultLeftOpen={true} defaultRightOpen={false} defaultLeftCollapsed={true}>
      <App />
    </SidebarProvider>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AppWithProviders />
    </ErrorBoundary>
  );
}
