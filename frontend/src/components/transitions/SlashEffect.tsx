/**
 * SlashEffect - P5R style diagonal slash transition
 */

import { useState, useEffect } from 'react';

interface SlashEffectProps {
  type: 'slash_down' | 'slash_up';
  duration: number;
}

export function SlashEffect({ type, duration }: SlashEffectProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Two-phase animation: line passes, then fill
    const timer1 = setTimeout(() => setPhase(1), duration * 0.4);
    const timer2 = setTimeout(() => setPhase(2), duration * 0.6);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [duration]);

  return (
    <div className={`p5r-slash-overlay p5r-slash-${type}`}>
      {/* Slash line */}
      <div
        className="p5r-slash-line"
        style={{ animationDuration: `${duration * 0.4}ms` }}
      />

      {/* Fill overlay (appears after line passes) */}
      {phase >= 1 && (
        <div
          className="p5r-slash-fill"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#000',
            opacity: phase >= 2 ? 1 : 0,
            transition: `opacity ${duration * 0.2}ms ease`,
          }}
        />
      )}
    </div>
  );
}
