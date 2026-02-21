/**
 * GalgameLayout - Main layout wrapper for visual novel style interface
 * Organizes Live2D character, dialog box, controls, and transitions
 */

import type { ReactNode } from 'react';

interface GalgameLayoutProps {
  children: ReactNode;
  className?: string;
}

export function GalgameLayout({ children, className = '' }: GalgameLayoutProps) {
  return (
    <div className={`galgame-container ${className}`}>
      {children}
    </div>
  );
}
