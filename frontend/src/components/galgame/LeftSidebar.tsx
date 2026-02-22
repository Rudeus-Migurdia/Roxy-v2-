/**
 * LeftSidebar - Navigation menu sidebar with P5R styling
 */

import { useSidebarContext } from '../../contexts/SidebarContext';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

interface LeftSidebarProps {
  navItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: '⌂', onClick: () => console.log('Home clicked') },
  { id: 'chat', label: 'Chat', icon: '💬', onClick: () => console.log('Chat clicked') },
  { id: 'history', label: 'History', icon: '📜', onClick: () => console.log('History clicked') },
  { id: 'settings', label: 'Settings', icon: '⚙', onClick: () => console.log('Settings clicked') },
];

export function LeftSidebar({ navItems = defaultNavItems }: LeftSidebarProps) {
  const { leftSidebarOpen, toggleLeftSidebar } = useSidebarContext();

  return (
    <aside className={`galgame-sidebar galgame-sidebar--left ${leftSidebarOpen ? 'galgame-sidebar--open' : ''}`}>
      {/* Sidebar Header */}
      <div className="galgame-sidebar__header">
        <h2 className="galgame-sidebar__title">MENU</h2>
        <button
          className="galgame-sidebar__close"
          onClick={toggleLeftSidebar}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="galgame-sidebar__nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className="galgame-sidebar__nav-item"
            onClick={item.onClick}
          >
            <span className="galgame-sidebar__nav-icon">{item.icon}</span>
            <span className="galgame-sidebar__nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="galgame-sidebar__footer">
        <div className="galgame-sidebar__version">v1.0.0</div>
      </div>
    </aside>
  );
}
