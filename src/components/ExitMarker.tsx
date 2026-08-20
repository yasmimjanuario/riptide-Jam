import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Exit } from '../engine';
import { getSwatch } from '../theme/palette';

interface ExitMarkerProps {
  exit: Exit;
  width: number;
  height: number;
}

/**
 * A colored opening in the tank wall. Positioned along whichever edge
 * `exit.direction` points out of, at `exit.lineIndex` (row for a
 * left/right exit, column for an up/down exit).
 */
export default function ExitMarker({ exit, width, height }: ExitMarkerProps) {
  const swatch = getSwatch(exit.colorId);

  const alongAxisSize = exit.direction === 'up' || exit.direction === 'down' ? width : height;
  const centerPercent = ((exit.lineIndex + 0.5) / alongAxisSize) * 100;

  const base = 'absolute rounded-full shadow-[0_0_10px_var(--glow)]';
  let style: CSSProperties;
  let sizeClass: string;

  switch (exit.direction) {
    case 'right':
      style = { top: `${centerPercent}%`, right: -6, transform: 'translateY(-50%)' };
      sizeClass = 'h-[14%] w-3';
      break;
    case 'left':
      style = { top: `${centerPercent}%`, left: -6, transform: 'translateY(-50%)' };
      sizeClass = 'h-[14%] w-3';
      break;
    case 'down':
      style = { left: `${centerPercent}%`, bottom: -6, transform: 'translateX(-50%)' };
      sizeClass = 'w-[14%] h-3';
      break;
    case 'up':
      style = { left: `${centerPercent}%`, top: -6, transform: 'translateX(-50%)' };
      sizeClass = 'w-[14%] h-3';
      break;
  }

  return (
    <motion.div
      className={`${base} ${sizeClass}`}
      style={{
        ...style,
        backgroundColor: swatch.hex,
        // @ts-expect-error -- custom property consumed by the shadow above
        '--glow': swatch.glow,
      }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
