/**
 * WebSocket hook for real-time communication with nakari backend
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  WSMessage,
  ConnectionState,
  WSMessageType,
} from '../types';

interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (message: WSMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  sendMessage: (type: WSMessageType, data: unknown) => void;
  sendText: (text: string, isUser: boolean) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoReconnect = true,
    reconnectInterval = 3000,
    onMessage,
    onStateChange,
  } = options;

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        onStateChange?.('connected');

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          onMessage?.(message);

          // Handle ping/pong for connection health
          if (message.type === 'ping') {
            sendMessage('pong', { timestamp: Date.now() });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
        onStateChange?.('error');
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        onStateChange?.('disconnected');
        wsRef.current = null;

        // Auto reconnect if enabled
        if (autoReconnect) {
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionState('error');
    }
  }, [url, autoReconnect, reconnectInterval, onMessage, onStateChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  const sendMessage = useCallback(
    (type: WSMessageType, data: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Backend expects "payload" field for user_text messages
        const message: WSMessage = type === 'user_text'
          ? { type, payload: data, timestamp: Date.now() }
          : { type, data, timestamp: Date.now() };
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('Cannot send message: WebSocket not connected');
      }
    },
    []
  );

  const sendText = useCallback((text: string, isUser: boolean) => {
    if (isUser) {
      // User text input - format expected by backend WebSocketInput
      sendMessage('user_text', { content: text });
    } else {
      // AI reply - format for display
      sendMessage('text', { text, isUser: false });
    }
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    sendMessage,
    sendText,
    connect,
    disconnect,
  };
}
