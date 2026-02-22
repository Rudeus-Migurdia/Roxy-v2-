/**
 * StudioPanel - Content generation panel in right sidebar
 */

import { QuickActionButtons } from './QuickActionButtons';
import { useNotebookContext } from '../../contexts/NotebookContext';

export function StudioPanel() {
  const { generatedContent } = useNotebookContext();

  const handleQuickAction = (actionId: string) => {
    console.log('Quick action clicked:', actionId);
    // TODO: Implement quick action handling
  };

  return (
    <div className="studio-panel">
      <QuickActionButtons onAction={handleQuickAction} />

      {generatedContent.length > 0 && (
        <div className="studio-panel__content">
          <h3 className="studio-panel__content-title">生成的内容</h3>
          <ul className="studio-panel__items">
            {generatedContent.map(content => (
              <li key={content.id} className="studio-panel__item">
                <span className="studio-panel__item-icon">📄</span>
                <span className="studio-panel__item-title">{content.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
