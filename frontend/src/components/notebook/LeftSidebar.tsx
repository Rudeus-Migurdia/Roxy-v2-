/**
 * LeftSidebar - Sources panel with file list
 */

import { useNotebookContext } from '../../contexts/NotebookContext';
import { CollapseButton } from './CollapseButton';
import { SidebarHeader } from './SidebarHeader';
import type { SidebarProps } from '../../types/notebook';

export function LeftSidebar({ children, className = '' }: Omit<SidebarProps, 'isOpen' | 'onToggle'>) {
  const { leftSidebarOpen, toggleLeftSidebar } = useNotebookContext();

  const sidebarClasses = [
    'sidebar',
    'sidebar--left',
    !leftSidebarOpen && 'sidebar--collapsed',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      <div className="sidebar__inner">
        <SidebarHeader
          title="来源资料"
          icon="📚"
          action={<CollapseButton direction="left" isCollapsed={!leftSidebarOpen} onToggle={toggleLeftSidebar} />}
        />
        <div className="sidebar__content">
          {children}
        </div>
      </div>
    </aside>
  );
}
