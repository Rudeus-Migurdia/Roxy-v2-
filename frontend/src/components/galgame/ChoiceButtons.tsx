/**
 * ChoiceButtons - Visual novel style choice selection overlay
 */

interface Choice {
  id: string;
  text: string;
  disabled?: boolean;
}

interface ChoiceButtonsProps {
  choices: Choice[];
  onSelect: (choiceId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function ChoiceButtons({
  choices,
  onSelect,
  onClose,
  className = '',
}: ChoiceButtonsProps) {
  const handleChoiceSelect = (choiceId: string) => {
    if (!choices.find((c) => c.id === choiceId)?.disabled) {
      onSelect(choiceId);
      onClose?.();
    }
  };

  return (
    <div className={`galgame-choice-overlay ${className}`} onClick={() => onClose?.()}>
      {choices.map((choice) => (
        <button
          key={choice.id}
          className="galgame-choice-button"
          onClick={(e) => {
            e.stopPropagation();
            handleChoiceSelect(choice.id);
          }}
          disabled={choice.disabled}
        >
          {choice.text}
        </button>
      ))}
    </div>
  );
}
