/**
 * ControlPanel - Visual novel style control buttons
 * Auto, Skip, Log, Save, Load, Config, etc.
 */

import { useState } from 'react';

interface ControlButton {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}

interface ControlPanelProps {
  onAutoToggle?: () => void;
  onSkip?: () => void;
  onLog?: () => void;
  onConfig?: () => void;
  className?: string;
}

const DEFAULT_BUTTONS: Omit<ControlButton, 'onClick'>[] = [
  { id: 'auto', label: 'Auto', icon: '▶' },
  { id: 'skip', label: 'Skip', icon: '⏩' },
  { id: 'log', label: 'Log', icon: '📜' },
  { id: 'config', label: 'Config', icon: '⚙' },
];

export function ControlPanel({
  onAutoToggle,
  onSkip,
  onLog,
  onConfig,
  className = '',
}: ControlPanelProps) {
  const [autoActive, setAutoActive] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  const handleButtonClick = (buttonId: string) => {
    setActiveButton(buttonId);

    switch (buttonId) {
      case 'auto':
        setAutoActive(!autoActive);
        onAutoToggle?.();
        break;
      case 'skip':
        onSkip?.();
        break;
      case 'log':
        onLog?.();
        break;
      case 'config':
        onConfig?.();
        break;
    }

    // Clear active state after animation
    setTimeout(() => setActiveButton(null), 200);
  };

  const getButtonHandler = (buttonId: string) => {
    return () => handleButtonClick(buttonId);
  };

  const handlers = {
    auto: onAutoToggle ? getButtonHandler('auto') : undefined,
    skip: onSkip ? getButtonHandler('skip') : undefined,
    log: onLog ? getButtonHandler('log') : undefined,
    config: onConfig ? getButtonHandler('config') : undefined,
  };

  return (
    <div className={`galgame-control-panel ${className}`}>
      {DEFAULT_BUTTONS.map((button) => {
        const isActive =
          (button.id === 'auto' && autoActive) || activeButton === button.id;
        const handler = handlers[button.id as keyof typeof handlers];

        return (
          <button
            key={button.id}
            className={`galgame-control-button ${isActive ? 'active' : ''}`}
            onClick={handler}
            title={button.label}
            disabled={!handler}
          >
            {button.icon}
          </button>
        );
      })}
    </div>
  );
}
