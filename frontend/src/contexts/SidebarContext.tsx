/**
 * Sidebar Context
 * State management for galgame layout sidebars
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type SidebarState = 'expanded' | 'collapsed';

interface SidebarContextValue {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  closeBothSidebars: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
  defaultLeftOpen?: boolean;
  defaultRightOpen?: boolean;
}

export function SidebarProvider({
  children,
  defaultLeftOpen = false,
  defaultRightOpen = false,
}: SidebarProviderProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(defaultLeftOpen);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(defaultRightOpen);

  const toggleLeftSidebar = useCallback(() => {
    setLeftSidebarOpen(prev => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setRightSidebarOpen(prev => !prev);
  }, []);

  const closeBothSidebars = useCallback(() => {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }, []);

  const value: SidebarContextValue = {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
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
