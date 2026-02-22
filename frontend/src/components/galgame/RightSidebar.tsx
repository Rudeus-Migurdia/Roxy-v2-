/**
 * RightSidebar - Chat history sidebar with P5R styling
 */

import { useEffect, useRef } from 'react';
import { useSidebarContext } from '../../contexts/SidebarContext';
import type { DialogState } from '../../types';
import { ChatBubble } from './ChatBubble';

interface RightSidebarProps {
  messages: DialogState[];
}

export function RightSidebar({ messages }: RightSidebarProps) {
  const { rightSidebarOpen, toggleRightSidebar } = useSidebarContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && rightSidebarOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, rightSidebarOpen]);

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
      <div ref={scrollRef} className="galgame-sidebar__content">
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
