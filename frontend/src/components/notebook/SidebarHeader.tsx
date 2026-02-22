/**
 * SidebarHeader - Consistent header for both sidebars
 */

import type { SidebarHeaderProps } from '../../types/notebook';

export function SidebarHeader({ title, icon, action }: SidebarHeaderProps) {
  return (
    <div className="sidebar-header">
      <div className="sidebar-header__title">
        {icon && <span className="sidebar-header__icon">{icon}</span>}
        <h2 className="sidebar-header__text">{title}</h2>
      </div>
      {action && <div className="sidebar-header__action">{action}</div>}
    </div>
  );
}
