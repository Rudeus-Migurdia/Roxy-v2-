/**
 * RightSidebar - Chat history sidebar with P5R styling
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { DialogState } from '../../types';
import { ChatBubble } from './ChatBubble';

interface RightSidebarProps {
  messages: DialogState[];
}

export function RightSidebar({ messages }: RightSidebarProps) {
  const { rightSidebarOpen, toggleRightSidebar } = useSidebarContext();
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Check if user is near bottom (within 100px)
  const isNearBottom = useCallback((): boolean => {
    const element = scrollRef.current;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  }, []);

  // Auto-scroll to bottom when new messages arrive (respects user setting and manual scroll)
  useEffect(() => {
    if (scrollRef.current && rightSidebarOpen && settings.general.autoScrollChat) {
      // Only auto-scroll if user hasn't manually scrolled up
      if (isNearBottom() || messages.length === 0) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, rightSidebarOpen, settings.general.autoScrollChat, isNearBottom]);

  // Detect user manual scrolling
  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = !isNearBottom();
  }, [isNearBottom]);

  return (
    <aside className={`galgame-sidebar galgame-sidebar--right ${rightSidebarOpen ? 'galgame-sidebar--open' : ''}`}>
      {/* Sidebar Header */}
      <div className="galgame-sidebar__header">
        <h2 className="galgame-sidebar__title">CHAT HISTORY</h2>
        <button
          className="galgame-sidebar__close"
          onClick={toggleRightSidebar}
          aria-label="Close chat history"
        >
          ✕
        </button>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="galgame-sidebar__content" onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="galgame-sidebar__empty">
            <div className="galgame-sidebar__empty-icon">💬</div>
            <p className="galgame-sidebar__empty-text">No messages yet</p>
            <p className="galgame-sidebar__empty-hint">Start a conversation to see chat history here</p>
          </div>
        ) : (
          <div className="galgame-sidebar__messages">
            {messages.map((msg, index) => (
              <div
                key={`${msg.timestamp}-${index}`}
                className={`galgame-sidebar__message-row ${msg.isUser ? 'user' : 'ai'}`}
              >
                <div className="galgame-sidebar__message-speaker">
                  {msg.speaker}
                </div>
                <ChatBubble message={msg} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Counter */}
      {messages.length > 0 && (
        <div className="galgame-sidebar__footer">
          <div className="galgame-sidebar__counter">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </div>
        </div>
      )}
    </aside>
  );
}
