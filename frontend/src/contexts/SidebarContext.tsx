/**
 * Sidebar Context
 * State management for galgame layout sidebars
 * Supports both open/close and collapsed/expanded states
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type SidebarState = 'expanded' | 'collapsed';

interface SidebarContextValue {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleLeftSidebarCollapse: () => void;
  closeBothSidebars: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
  defaultLeftOpen?: boolean;
  defaultRightOpen?: boolean;
  defaultLeftCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultLeftOpen = false,
  defaultRightOpen = false,
  defaultLeftCollapsed = false,
}: SidebarProviderProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(defaultLeftOpen);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(defaultRightOpen);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(defaultLeftCollapsed);

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen(prev => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarOpen(prev => !prev);
  }, []);

  const toggleLeftSidebarCollapse = useCallback(() => {
    setLeftSidebarCollapsed(prev => !prev);
  }, []);

  const closeBothSidebars = useCallback(() => {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }, []);

  const value: SidebarContextValue = {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarCollapsed,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleLeftSidebarCollapse,
    closeBothSidebars,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within SidebarProvider');
  }
  return context;
}
