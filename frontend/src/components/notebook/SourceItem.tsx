/**
 * SourceItem - Individual source item in the source list
 */

import type { Source } from '../../types/notebook';
import { useNotebookContext } from '../../contexts/NotebookContext';

interface SourceItemProps {
  source: Source;
}

const SOURCE_TYPE_ICONS: Record<Source['type'], string> = {
  pdf: '📄',
  text: '📝',
  website: '🌐',
  youtube: '🎬',
  docx: '📄',
};

export function SourceItem({ source }: SourceItemProps) {
  const { activeSourceId, setActiveSourceId, removeSource } = useNotebookContext();
  const isActive = activeSourceId === source.id;

  const handleClick = () => {
    setActiveSourceId(isActive ? null : source.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSource(source.id);
  };

  const icon = SOURCE_TYPE_ICONS[source.type] || '📄';

  return (
    <li
      className={`source-item ${isActive ? 'source-item--active' : ''}`}
      onClick={handleClick}
    >
      <div className="source-item__icon">{icon}</div>
      <div className="source-item__content">
        <span className="source-item__name">{source.name}</span>
        {source.size && (
          <span className="source-item__meta">
            {formatFileSize(source.size)}
          </span>
        )}
      </div>
      <button
        className="source-item__remove"
        onClick={handleRemove}
        aria-label="Remove source"
      >
        ×
      </button>
    </li>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
