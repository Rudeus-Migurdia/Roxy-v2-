/**
 * CollapseButton - Chevron button for sidebar collapse/expand
 */

import type { CollapseButtonProps } from '../../types/notebook';

export function CollapseButton({ direction, isCollapsed, onToggle }: CollapseButtonProps) {
  return (
    <button
      className={`collapse-button collapse-button--${direction} ${isCollapsed ? 'collapse-button--collapsed' : ''}`}
      onClick={onToggle}
      aria-label={isCollapsed ? 'Expand' : 'Collapse'}
      type="button"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {direction === 'left' ? (
          <path
            d={isCollapsed ? 'M10 12L6 8L10 4' : 'M6 12L10 8L6 4'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d={isCollapsed ? 'M6 4L10 8L6 12' : 'M10 4L6 8L10 12'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
