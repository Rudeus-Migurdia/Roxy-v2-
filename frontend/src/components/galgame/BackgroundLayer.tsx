/**
 * BackgroundLayer - Handles scene backgrounds with transitions
 */

interface BackgroundLayerProps {
  imageUrl?: string;
  className?: string;
}

export function BackgroundLayer({ imageUrl, className = '' }: BackgroundLayerProps) {
  // Only set style when imageUrl is provided
  // Otherwise, let CSS handle the background using var(--theme-bg)
  const backgroundStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : undefined;

  return (
    <div
      className={`galgame-background ${className}`}
      style={backgroundStyle}
    />
  );
}
