/**
 * Notebook Context
 * State management for three-panel layout UI
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  SidebarState,
  Live2DState,
  Live2DMode,
  NotebookUIState,
  Source,
  GeneratedContent,
} from '../types/notebook';

interface NotebookContextValue {
  // UI State
  uiState: NotebookUIState;

  // Sources
  sources: Source[];
  setSources: (sources: Source[]) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;

  // Generated Content
  generatedContent: GeneratedContent[];
  setGeneratedContent: (content: GeneratedContent[]) => void;
  addGeneratedContent: (content: GeneratedContent) => void;

  // Sidebar controls
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebar: (state: SidebarState) => void;
  setRightSidebar: (state: SidebarState) => void;

  // Live2D controls
  live2dState: Live2DState;
  setLive2DMode: (mode: Live2DMode) => void;
  setLive2DPosition: (position: { x: number; y: number }) => void;
  setLive2DOpacity: (opacity: number) => void;
  setLive2DScale: (scale: number) => void;
  updateLive2DState: (updates: Partial<Live2DState>) => void;
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

const defaultLive2DState: Live2DState = {
  mode: 'minimized',
  position: { x: 20, y: 20 },
  opacity: 0.8,
  scale: 0.5,
};

const defaultUIState: NotebookUIState = {
  leftSidebar: 'expanded',
  rightSidebar: 'collapsed',
  live2d: defaultLive2DState,
  activeSourceId: null,
};

interface NotebookProviderProps {
  children: ReactNode;
  initialState?: Partial<NotebookUIState>;
}

export function NotebookProvider({ children, initialState }: NotebookProviderProps) {
  // UI State
  const [uiState, setUIState] = useState<NotebookUIState>({
    ...defaultUIState,
    ...initialState,
  });

  // Sources
  const [sources, setSources] = useState<Source[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Generated Content
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);

  // Computed states
  const leftSidebarOpen = uiState.leftSidebar !== 'collapsed' && uiState.leftSidebar !== 'hidden';
  const rightSidebarOpen = uiState.rightSidebar !== 'collapsed' && uiState.rightSidebar !== 'hidden';

  // Sidebar controls
  const toggleLeftSidebar = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      leftSidebar: prev.leftSidebar === 'expanded' ? 'collapsed' : 'expanded',
    }));
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      rightSidebar: prev.rightSidebar === 'expanded' ? 'collapsed' : 'expanded',
    }));
  }, []);

  const setLeftSidebar = useCallback((state: SidebarState) => {
    setUIState(prev => ({ ...prev, leftSidebar: state }));
  }, []);

  const setRightSidebar = useCallback((state: SidebarState) => {
    setUIState(prev => ({ ...prev, rightSidebar: state }));
  }, []);

  // Source management
  const addSource = useCallback((source: Source) => {
    setSources(prev => [...prev, source]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    if (activeSourceId === id) {
      setActiveSourceId(null);
    }
  }, [activeSourceId]);

  // Generated content management
  const addGeneratedContent = useCallback((content: GeneratedContent) => {
    setGeneratedContent(prev => [...prev, content]);
  }, []);

  // Live2D controls
  const setLive2DMode = useCallback((mode: Live2DMode) => {
    setUIState(prev => ({
      ...prev,
      live2d: { ...prev.live2d, mode },
    }));
  }, []);

  const setLive2DPosition = useCallback((position: { x: number; y: number }) => {
    setUIState(prev => ({
      ...prev,
      live2d: { ...prev.live2d, position },
    }));
  }, []);

  const setLive2DOpacity = useCallback((opacity: number) => {
    setUIState(prev => ({
      ...prev,
      live2d: { ...prev.live2d, opacity },
    }));
  }, []);

  const setLive2DScale = useCallback((scale: number) => {
    setUIState(prev => ({
      ...prev,
      live2d: { ...prev.live2d, scale },
    }));
  }, []);

  const updateLive2DState = useCallback((updates: Partial<Live2DState>) => {
    setUIState(prev => ({
      ...prev,
      live2d: { ...prev.live2d, ...updates },
    }));
  }, []);

  const value: NotebookContextValue = {
    uiState,
    sources,
    setSources,
    addSource,
    removeSource,
    activeSourceId,
    setActiveSourceId,
    generatedContent,
    setGeneratedContent,
    addGeneratedContent,
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebar,
    setRightSidebar,
    live2dState: uiState.live2d,
    setLive2DMode,
    setLive2DPosition,
    setLive2DOpacity,
    setLive2DScale,
    updateLive2DState,
  };

  return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
}

export function useNotebookContext(): NotebookContextValue {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error('useNotebookContext must be used within NotebookProvider');
  }
  return context;
}
