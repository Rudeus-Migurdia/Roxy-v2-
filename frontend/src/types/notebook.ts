/**
 * Notebook Layout Type Definitions
 * Three-panel layout similar to Google NotebookLM
 */

import type { ReactNode } from 'react';

// ===== Sidebar States =====
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

// ===== Source Types =====
export type SourceType = 'pdf' | 'text' | 'website' | 'youtube' | 'docx';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  size?: number;
  url?: string;
  thumbnail?: string;
  addedAt: number;
  metadata?: {
    pageCount?: number;
    author?: string;
    description?: string;
  };
}

// ===== Generated Content Types =====
export type GeneratedContentType = 'study_guide' | 'briefing_doc' | 'faq' | 'timeline' | 'summary' | 'quiz';

export interface GeneratedContent {
  id: string;
  type: GeneratedContentType;
  title: string;
  content: string;
  createdAt: number;
  sourceId?: string;
}

// ===== Live2D Display States =====
export type Live2DMode = 'full' | 'minimized' | 'transparent' | 'hidden';

export interface Live2DState {
  mode: Live2DMode;
  position: { x: number; y: number };
  opacity: number;
  scale: number;
}

// ===== Notebook UI State =====
export interface NotebookUIState {
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  live2d: Live2DState;
  activeSourceId: string | null;
}

// ===== Quick Action Types =====
export type QuickActionType =
  | 'study_guide'
  | 'briefing_doc'
  | 'faq'
  | 'timeline'
  | 'summary'
  | 'quiz'
  | 'audio_overview'
  | 'mind_map';

export interface QuickAction {
  id: QuickActionType;
  label: string;
  icon: string;
  description: string;
}

// ===== Component Props =====
export interface NotebookLayoutProps {
  children: ReactNode;
  className?: string;
}

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

export interface SidebarHeaderProps {
  title: string;
  icon?: string;
  action?: ReactNode;
}

export interface CollapseButtonProps {
  direction: 'left' | 'right';
  isCollapsed: boolean;
  onToggle: () => void;
}

export interface CenterPanelProps {
  leftOpen: boolean;
  rightOpen: boolean;
  children: ReactNode;
}

export interface Live2DWrapperProps {
  state: Live2DState;
  onStateChange: (state: Partial<Live2DState>) => void;
  onModelLoaded?: (model?: any) => void;
  onError?: (error: Error) => void;
}
