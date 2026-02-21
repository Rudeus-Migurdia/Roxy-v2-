/**
 * MenuButton - P5R styled menu button with sharp edges and hover effects
 */

import type { ReactNode } from 'react';

interface MenuButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function MenuButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
}: MenuButtonProps) {
  return (
    <button
      className={`galgame-menu-button ${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
