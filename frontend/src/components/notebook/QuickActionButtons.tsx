/**
 * QuickActionButtons - Quick action buttons for content generation
 */

import { QUICK_ACTIONS } from '../../utils/styles/notebookTheme';

interface QuickActionButtonsProps {
  onAction: (actionId: string) => void;
}

export function QuickActionButtons({ onAction }: QuickActionButtonsProps) {
  return (
    <div className="quick-actions">
      <h3 className="quick-actions__title">快速生成</h3>
      <div className="quick-actions__grid">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.id}
            className="quick-action-btn"
            onClick={() => onAction(action.id)}
            title={action.description}
          >
            <span className="quick-action-btn__icon">{action.icon}</span>
            <span className="quick-action-btn__label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
