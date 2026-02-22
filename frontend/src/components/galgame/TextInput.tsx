/**
 * TextInput - P5R styled input area for user messages
 * With integrated voice input support
 */

import { useState, useRef } from 'react';
import { VoiceInputButton } from '../voice/VoiceInputButton';
import type { WSMessage, WSMessageType } from '../../types';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  wsSend?: (type: WSMessageType, data: unknown) => void;
}

export function TextInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  className = '',
  wsSend,
}: TextInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim()) {
      handleSend();
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  // 处理录音完成
  const handleRecordingComplete = async (blob: Blob, base64Audio: string) => {
    if (!wsSend) {
      console.warn('WebSocket send function not available');
      return;
    }

    // 获取 MIME 类型
    const mimeType = blob.type || 'audio/webm';

    // 发送 audio_blob 消息到后端
    const message: WSMessage = {
      type: 'audio_blob',
      payload: {
        audio_uri: `data:${mimeType};base64,${base64Audio}`,
        mime_type: mimeType,
        metadata: {
          size: blob.size,
          type: mimeType,
        },
      },
      timestamp: Date.now(),
    };

    // 发送到后端
    try {
      wsSend('audio_blob' as WSMessageType, message.payload);
    } catch (error) {
      console.error('Failed to send audio:', error);
    }

    setIsRecording(false);
  };

  // 录音状态变化
  const handleRecordingStateChange = (isRecordingNow: boolean) => {
    setIsRecording(isRecordingNow);
  };

  return (
    <div className={`galgame-input-container ${className} ${isRecording ? 'recording' : ''}`}>
      {/* 语音输入按钮 */}
      {wsSend && (
        <VoiceInputButton
          onRecordingComplete={handleRecordingComplete}
          disabled={disabled || isRecording}
          className="voice-input-wrapper"
        />
      )}

      <input
        ref={inputRef}
        type="text"
        className="galgame-input"
        placeholder={isRecording ? '录音中...' : placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isRecording}
      />

      <button
        className="galgame-send-button"
        onClick={handleSend}
        disabled={disabled || !text.trim() || isRecording}
      >
        Send
      </button>
    </div>
  );
}
