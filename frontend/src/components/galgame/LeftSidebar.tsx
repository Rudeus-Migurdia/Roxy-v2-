/**
 * LeftSidebar - Gemini-style collapsible navigation sidebar
 */

import { useEffect, useState } from 'react';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface LeftSidebarProps {
  chatHistory?: { id: string; title: string }[];
  onSettingsClick?: () => void;
}

const defaultChatHistory: { id: string; title: string }[] = [];

export function LeftSidebar({
  chatHistory = defaultChatHistory,
  onSettingsClick,
}: LeftSidebarProps) {
  const { leftSidebarOpen, leftSidebarCollapsed, toggleLeftSidebar, toggleLeftSidebarCollapse } = useSidebarContext();
  const { t } = useLanguage();

  // Delay text display until after sidebar expansion animation completes (150ms)
  const [showText, setShowText] = useState(leftSidebarCollapsed === false);

  useEffect(() => {
    if (!leftSidebarCollapsed) {
      const timer = setTimeout(() => {
        setShowText(true);
      }, 90);
      return () => clearTimeout(timer);
    } else {
      setShowText(false);
    }
  }, [leftSidebarCollapsed]);

  return (
    <aside
      className={`galgame-sidebar galgame-sidebar--left ${
        leftSidebarOpen ? 'galgame-sidebar--open' : ''
      } ${leftSidebarCollapsed ? 'galgame-sidebar--collapsed' : ''}`}
    >
      {/* Top: Collapse/Expand button */}
      <div className="galgame-sidebar__top">
        <button
          className="galgame-sidebar__toggle-btn"
          onClick={toggleLeftSidebarCollapse}
          aria-label={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={leftSidebarCollapsed ? '展开' : '折叠'}
        >
          {leftSidebarCollapsed ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Middle: New chat button */}
      <div className="galgame-sidebar__middle">
        <button className="galgame-sidebar__new-chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="galgame-sidebar__icon-plus">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
          <span className="galgame-sidebar__text">{t.newChat}</span>
        </button>
      </div>

      {/* Chat history list */}
      <div className="galgame-sidebar__history">
        {showText && (
          <div className="galgame-sidebar__history-title">{t.recentHistory}</div>
        )}
        {chatHistory.map((chat) => (
          <a
            key={chat.id}
            href="#"
            className="galgame-sidebar__history-item"
          >
            <span className="galgame-sidebar__history-icon">💬</span>
            <span className="galgame-sidebar__text">{chat.title}</span>
          </a>
        ))}
      </div>

      {/* Bottom: Settings */}
      <div className="galgame-sidebar__bottom">
        <button className="galgame-sidebar__bottom-item" onClick={onSettingsClick}>
          <span className="galgame-sidebar__bottom-icon">⚙</span>
          <span className="galgame-sidebar__text">{t.settings}</span>
        </button>
      </div>
    </aside>
  );
}
