/**
 * NotebookLayout - Main three-panel grid container
 * Similar to Google NotebookLM layout with collapsible sidebars
 */

import { useNotebookContext } from '../../contexts/NotebookContext';
import type { NotebookLayoutProps } from '../../types/notebook';

export function NotebookLayout({ children, className = '' }: NotebookLayoutProps) {
  const { leftSidebarOpen, rightSidebarOpen } = useNotebookContext();

  const layoutClasses = [
    'notebook-layout',
    !leftSidebarOpen && 'notebook-layout--left-collapsed',
    !rightSidebarOpen && 'notebook-layout--right-collapsed',
    !leftSidebarOpen && !rightSidebarOpen && 'notebook-layout--both-collapsed',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses}>
      {children}
    </div>
  );
}
