/**
 * ChatHistoryContext - Manages chat sessions and history
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ChatSession, DialogState } from '../types';

// Storage keys
const CURRENT_SESSION_KEY = 'nakari_current_session';
const SESSIONS_CACHE_KEY = 'nakari_sessions_cache';
const SESSIONS_CACHE_TIME_KEY = 'nakari_sessions_cache_time';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get HTTP API URL from WebSocket URL
const getHttpApiUrl = (): string => {
  const wsUrl = import.meta.env.VITE_API_URL;
  if (wsUrl) {
    // Convert ws:// to http:// and wss:// to https://
    const baseUrl = wsUrl.replace(/^wss?:\/\//, '').replace(/\/api\/ws$/, '');
    return `http://${baseUrl}/api`;
  }
  const host = import.meta.env.VITE_API_HOST || 'localhost';
  const port = import.meta.env.VITE_API_PORT || '8002';
  return `http://${host}:${port}/api`;
};

const API_BASE = getHttpApiUrl();

interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ChatHistoryContextType {
  state: ChatHistoryState;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<DialogState[]>;
  createSession: () => Promise<string>;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  newConversation: () => Promise<void>;
  getCurrentSession: () => ChatSession | null;
  getSessionTitle: (sessionId: string) => string;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | null>(null);

export function useChatHistory(): ChatHistoryContextType {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error('useChatHistory must be used within ChatHistoryProvider');
  }
  return context;
}

interface ChatHistoryProviderProps {
  children: ReactNode;
}

export function ChatHistoryProvider({ children }: ChatHistoryProviderProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current session ID from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_SESSION_KEY);
    if (saved) {
      setCurrentSessionId(saved);
    }
  }, []);

  // Save current session ID to localStorage when it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  }, [currentSessionId]);

  // Helper: fetch from API
  const fetchApi = async (endpoint: string, options?: RequestInit) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  };

  // Load sessions list
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try cache first
      const cachedTime = localStorage.getItem(SESSIONS_CACHE_TIME_KEY);
      const now = Date.now();
      if (cachedTime && now - parseInt(cachedTime) < CACHE_TTL) {
        const cached = localStorage.getItem(SESSIONS_CACHE_KEY);
        if (cached) {
          setSessions(JSON.parse(cached));
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const data = await fetchApi('/sessions');
      setSessions(data.sessions || []);

      // Cache the result
      localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(data.sessions || []));
      localStorage.setItem(SESSIONS_CACHE_TIME_KEY, now.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load specific session messages
  const loadSession = useCallback(async (sessionId: string): Promise<DialogState[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi(`/sessions/${sessionId}`);
      // Convert backend messages to DialogState format
      const messages: DialogState[] = (data.messages || [])
        .filter((m: { role: string; content: string | null }) =>
          m.role === 'user' || m.role === 'assistant'
        )
        .map((m: { role: string; content: string | null; created_at: number }) => ({
          text: m.content || '',
          speaker: m.role === 'user' ? 'User' : 'Roxy',
          isUser: m.role === 'user',
          timestamp: Math.floor(m.created_at * 1000),
        }));
      return messages;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new session
  const createSession = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchApi('/sessions', { method: 'POST' });
      return data.session_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Switch to a session
  const switchSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setCurrentSessionId(sessionId);
      // Invalidate cache so we reload sessions
      localStorage.removeItem(SESSIONS_CACHE_KEY);
      localStorage.removeItem(SESSIONS_CACHE_TIME_KEY);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch session');
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchApi(`/sessions/${sessionId}`, { method: 'DELETE' });
      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      // If deleting current session, clear current session ID
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      // Invalidate cache
      localStorage.removeItem(SESSIONS_CACHE_KEY);
      localStorage.removeItem(SESSIONS_CACHE_TIME_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId]);

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, title: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchApi(`/sessions/${sessionId}/title`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      // Update local state
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, title } : s))
      );
      // Invalidate cache
      localStorage.removeItem(SESSIONS_CACHE_KEY);
      localStorage.removeItem(SESSIONS_CACHE_TIME_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start new conversation (creates session and switches to it)
  const newConversation = useCallback(async () => {
    try {
      const newId = await createSession();
      await switchSession(newId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create new conversation');
    }
  }, [createSession, switchSession]);

  // Get current session object
  const getCurrentSession = useCallback((): ChatSession | null => {
    if (!currentSessionId) return null;
    return sessions.find(s => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Get session title
  const getSessionTitle = useCallback((sessionId: string): string => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.title || `Conversation ${sessionId.slice(0, 8)}`;
  }, [sessions]);

  const value: ChatHistoryContextType = {
    state: { sessions, currentSessionId, isLoading, error },
    loadSessions,
    loadSession,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    newConversation,
    getCurrentSession,
    getSessionTitle,
  };

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
}
