/**
 * MainViewContainer - Container for all main view elements (character, dialog, input)
 * Shifts as a unit when sidebar opens/closes
 */

import { useEffect, useRef, type ReactNode } from 'react';

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
  const isFirstRender = useRef(true);

  // After first render, enable transitions for subsequent state changes
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  // Determine shift class based on sidebar state
  const shiftClass =
    sidebarOpen && !sidebarCollapsed
      ? 'galgame-main-view--shift-right'
      : '';

  // Only add transition class after first render to prevent initial animation
  const animateClass = isFirstRender.current ? '' : 'can-animate';

  return (
    <div className={`galgame-main-view ${shiftClass} ${animateClass} ${className}`}>
      {children}
    </div>
  );
}
