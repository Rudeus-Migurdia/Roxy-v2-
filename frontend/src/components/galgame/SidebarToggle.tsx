/**
 * SidebarToggle - Toggle buttons for opening/closing sidebars with P5R styling
 */

import { useSidebarContext } from '../../contexts/SidebarContext';

export function SidebarToggle() {
  const { leftSidebarOpen, toggleLeftSidebar } = useSidebarContext();

  return (
    <div className="galgame-sidebar-toggle">
      {/* Left Sidebar Toggle Button */}
      <button
        className={`galgame-sidebar-toggle__button ${leftSidebarOpen ? 'galgame-sidebar-toggle__button--active' : ''}`}
        onClick={toggleLeftSidebar}
        aria-label="Toggle menu"
        title="Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}
