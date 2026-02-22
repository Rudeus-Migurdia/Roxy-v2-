/**
 * SourceList - List of sources in the left sidebar
 */

import type { Source } from '../../types/notebook';
import { SourceItem } from './SourceItem';
import { useNotebookContext } from '../../contexts/NotebookContext';

interface SourceListProps {
  sources?: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  const { sources: contextSources } = useNotebookContext();
  const displaySources = sources || contextSources;

  const handleAddSource = () => {
    // Placeholder for file upload functionality
    console.log('Add source clicked');
  };

  return (
    <div className="source-list">
      <button className="source-list__add-btn" onClick={handleAddSource}>
        <span className="source-list__add-icon">+</span>
        添加来源
      </button>

      {displaySources.length === 0 ? (
        <div className="source-list__empty">
          <p>还没有来源资料</p>
          <p className="source-list__empty-hint">点击上方按钮添加文件、链接或文本</p>
        </div>
      ) : (
        <ul className="source-list__items">
          {displaySources.map(source => (
            <SourceItem key={source.id} source={source} />
          ))}
        </ul>
      )}
    </div>
  );
}
