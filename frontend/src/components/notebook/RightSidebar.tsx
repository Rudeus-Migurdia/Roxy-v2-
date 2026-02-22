/**
 * RightSidebar - Studio panel with content generation tools
 */

import { useNotebookContext } from '../../contexts/NotebookContext';
import { CollapseButton } from './CollapseButton';
import { SidebarHeader } from './SidebarHeader';
import type { SidebarProps } from '../../types/notebook';

export function RightSidebar({ children, className = '' }: Omit<SidebarProps, 'isOpen' | 'onToggle'>) {
  const { rightSidebarOpen, toggleRightSidebar } = useNotebookContext();

  const sidebarClasses = [
    'sidebar',
    'sidebar--right',
    !rightSidebarOpen && 'sidebar--collapsed',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      <div className="sidebar__inner">
        <SidebarHeader
          title="工作室"
          icon="✨"
          action={<CollapseButton direction="right" isCollapsed={!rightSidebarOpen} onToggle={toggleRightSidebar} />}
        />
        <div className="sidebar__content">
          {children}
        </div>
      </div>
    </aside>
  );
}
