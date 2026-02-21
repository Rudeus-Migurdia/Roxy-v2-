/**
 * BackgroundLayer - Handles scene backgrounds with transitions
 */

interface BackgroundLayerProps {
  imageUrl?: string;
  className?: string;
}

export function BackgroundLayer({ imageUrl, className = '' }: BackgroundLayerProps) {
  const backgroundStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : { backgroundColor: '#0a0a0a' };

  return (
    <div
      className={`galgame-background ${className}`}
      style={backgroundStyle}
    />
  );
}
