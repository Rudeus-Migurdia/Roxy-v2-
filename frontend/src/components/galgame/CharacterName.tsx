/**
 * CharacterName - Displays speaker name tag above dialog box
 */

interface CharacterNameProps {
  name?: string;
  className?: string;
}

export function CharacterName({ name, className = '' }: CharacterNameProps) {
  if (!name) {
    return <div className={`galgame-character-name empty ${className}`} />;
  }

  return (
    <div className={`galgame-character-name ${className}`}>
      {name}
    </div>
  );
}
