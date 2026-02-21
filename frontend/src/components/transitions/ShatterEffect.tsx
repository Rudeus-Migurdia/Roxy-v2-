/**
 * ShatterEffect - P5R style geometric shatter transition
 * Uses CSS clip-path to create fragment animations
 */

import { useEffect, useState } from 'react';

interface ShatterEffectProps {
  type: 'shatter_out' | 'shatter_in';
  duration: number;
}

interface Fragment {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  tx: number;
  ty: number;
  delay: number;
}

// Generate random fragments for shatter effect
function generateFragments(count: number, width: number, height: number): Fragment[] {
  const fragments: Fragment[] = [];

  // Create irregular grid-based fragments
  const cols = Math.ceil(Math.sqrt(count * (width / height)));
  const rows = Math.ceil(count / cols);

  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Add some randomness to position
    const x = col * cellWidth + (Math.random() - 0.5) * cellWidth * 0.3;
    const y = row * cellHeight + (Math.random() - 0.5) * cellHeight * 0.3;

    // Random size
    const size = Math.max(cellWidth, cellHeight) * (0.8 + Math.random() * 0.4);

    // Random explosion velocity
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 300;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    // Random rotation
    const rotation = (Math.random() - 0.5) * 720;

    // Stagger delays
    const delay = Math.random() * 100;

    fragments.push({
      id: i,
      x,
      y,
      size,
      rotation,
      tx,
      ty,
      delay,
    });
  }

  return fragments;
}

export function ShatterEffect({ duration }: ShatterEffectProps) {
  const [fragments, setFragments] = useState<Fragment[]>([]);

  useEffect(() => {
    // Generate fragments on mount
    const width = window.innerWidth;
    const height = window.innerHeight;
    const fragmentCount = Math.min(50, Math.floor((width * height) / 30000));
    setFragments(generateFragments(fragmentCount, width, height));
  }, []);

  return (
    <div className="p5r-shatter-container">
      {fragments.map((frag) => (
        <div
          key={frag.id}
          className="p5r-fragment shatter-out"
          style={
            {
              left: `${frag.x}px`,
              top: `${frag.y}px`,
              width: `${frag.size}px`,
              height: `${frag.size}px`,
              '--tx': `${frag.tx}px`,
              '--ty': `${frag.ty}px`,
              '--rot': `${frag.rotation}deg`,
              animationDelay: `${frag.delay}ms`,
              animationDuration: `${duration}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
