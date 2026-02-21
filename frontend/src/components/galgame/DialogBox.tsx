/**
 * DialogBox - Visual novel style dialogue display
 */

import { useState, useEffect, useRef } from 'react';

interface DialogBoxProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export function DialogBox({
  text,
  className = '',
  speed = 10,
  onComplete,
}: DialogBoxProps) {
  const prevTextRef = useRef<string>('');

  // Debug log
  useEffect(() => {
    console.log('[DialogBox] text received:', text, typeof text);
    console.log('[DialogBox] text === undefined:', text === undefined);
    console.log('[DialogBox] text === "undefined":', text === 'undefined');
  }, [text]);

  // Clean and validate text - handle all undefined/null cases
  let cleanText = '';
  if (text === undefined || text === null) {
    cleanText = '';
    console.log('[DialogBox] text is undefined/null, using empty string');
  } else if (typeof text !== 'string') {
    cleanText = String(text);
    console.log('[DialogBox] text is not string, converted to:', cleanText);
  } else if (text === 'undefined' || text === 'null' || text.trim() === 'undefined' || text.trim() === 'null') {
    cleanText = '';
    console.log('[DialogBox] text is "undefined"/"null" string, using empty string');
  } else {
    cleanText = text;
  }

  const [displayText, setDisplayText] = useState(cleanText);

  // Update display when clean text changes
  useEffect(() => {
    if (cleanText !== prevTextRef.current) {
      prevTextRef.current = cleanText;
      setDisplayText(cleanText);
      console.log('[DialogBox] displayText set to:', cleanText);
      onComplete?.();
    }
  }, [cleanText, onComplete]);

  return (
    <div className={`galgame-dialog-box ${className}`}>
      <span className="galgame-dialog-text" style={{ display: 'block' }}>
        {displayText}
      </span>
    </div>
  );
}
