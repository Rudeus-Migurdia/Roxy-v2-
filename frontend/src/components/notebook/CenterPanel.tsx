/**
 * CenterPanel - Flexible width panel for main content
 */

import type { CenterPanelProps } from '../../types/notebook';

export function CenterPanel({ children }: CenterPanelProps) {
  return (
    <main className="center-panel">
      {children}
    </main>
  );
}
