/**
 * MainViewContainer - Container for all main view elements (character, dialog, input)
 * Shifts as a unit when sidebar opens/closes
 */

import type { ReactNode } from 'react';

interface MainViewContainerProps {
  children: ReactNode;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  className?: string;
}

export function MainViewContainer({
  children,
  sidebarOpen,
  sidebarCollapsed,
  className = '',
}: MainViewContainerProps) {
  // Determine shift class based on sidebar state
  const shiftClass =
    sidebarOpen && !sidebarCollapsed
      ? 'galgame-main-view--shift-right'
      : '';

  return (
    <div className={`galgame-main-view ${shiftClass} ${className}`}>
      {children}
    </div>
  );
}
