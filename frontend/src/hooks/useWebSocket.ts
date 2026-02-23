/**
 * WebSocket hook for real-time communication with nakari backend
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  WSMessage,
  ConnectionState,
  WSMessageType,
} from '../types';

// 常量配置
const DEFAULT_RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

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
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const sendMessageRef = useRef<((type: WSMessageType, data: unknown) => void) | null>(null);
  const latestOptionsRef = useRef<UseWebSocketOptions>(options);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // 检查重连次数限制
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[useWebSocket] Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      setConnectionState('error');
      latestOptionsRef.current.onStateChange?.('error');
      return;
    }

    console.log('[useWebSocket] Connecting to:', url);
    setConnectionState('connecting');
    latestOptionsRef.current.onStateChange?.('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        latestOptionsRef.current.onStateChange?.('connected');
        reconnectAttemptsRef.current = 0; // 重置重连计数器

        // 清除任何待处理的重连超时
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('[useWebSocket] Received:', message.type, message);
          latestOptionsRef.current.onMessage?.(message);

          // 处理ping/pong以维持连接健康
          if (message.type === 'ping') {
            // 使用ref来确保调用最新的sendMessage
            sendMessageRef.current?.('pong', { timestamp: Date.now() });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (_error) => {
        console.error('WebSocket error occurred');
        setConnectionState('error');
        latestOptionsRef.current.onStateChange?.('error');
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        latestOptionsRef.current.onStateChange?.('disconnected');
        wsRef.current = null;

        // 自动重连（如果启用）
        const currentOptions = latestOptionsRef.current;
        if (currentOptions.autoReconnect !== false) {
          reconnectAttemptsRef.current += 1;

          // 指数退避重连延迟
          const baseInterval = currentOptions.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL;
          const backoffDelay = Math.min(
            baseInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1),
            30000 // 最大30秒
          );

          setConnectionState('reconnecting');
          latestOptionsRef.current.onStateChange?.('reconnecting');

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, backoffDelay);

          console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${backoffDelay}ms`);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionState('error');
      latestOptionsRef.current.onStateChange?.('error');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    // 清除所有超时和引用
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 重置重连计数器
    reconnectAttemptsRef.current = 0;

    // 关闭WebSocket连接
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
      } catch (e) {
        console.warn('Error closing WebSocket:', e);
      }
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    latestOptionsRef.current.onStateChange?.('disconnected');
  }, []);

  const sendMessage = useCallback(
    (type: WSMessageType, data: unknown) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Backend expects "payload" field for user_text messages
        const message: WSMessage = type === 'user_text'
          ? { type, payload: data, timestamp: Date.now() }
          : { type, data, timestamp: Date.now() };
        console.log('[useWebSocket] Sending:', message);
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('[useWebSocket] Cannot send message: WebSocket not connected, state:', wsRef.current?.readyState);
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

  // 更新ref以跟踪最新的options和函数 (必须在函数定义之后)
  useEffect(() => {
    latestOptionsRef.current = options;
    sendMessageRef.current = sendMessage;
  }, [options, sendMessage]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect();
      // 清理所有ref引用
      sendMessageRef.current = null;
      // 注意：不清除latestOptionsRef，因为它可能在其他地方使用
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
