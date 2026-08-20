import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Direction, Exit } from '../engine';
import { getSwatch } from '../theme/palette';

interface ExitMarkerProps {
  exit: Exit;
  width: number;
  height: number;
}

const ARROW_ROTATION: Record<Direction, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: -90,
};

/**
 * A colored exit gate on the lot's edge. Positioned along whichever edge
 * `exit.direction` points out of, at `exit.lineIndex` (row for a
 * left/right exit, column for an up/down exit).
 */
export default function ExitMarker({ exit, width, height }: ExitMarkerProps) {
  const swatch = getSwatch(exit.colorId);

  const alongAxisSize = exit.direction === 'up' || exit.direction === 'down' ? width : height;
  const centerPercent = ((exit.lineIndex + 0.5) / alongAxisSize) * 100;

  const base = 'absolute flex items-center justify-center rounded-md shadow-[0_0_8px_var(--glow)]';
  let style: CSSProperties;
  let sizeClass: string;

  switch (exit.direction) {
    case 'right':
      style = { top: `${centerPercent}%`, right: -10, transform: 'translateY(-50%)' };
      sizeClass = 'h-[13%] w-4';
      break;
    case 'left':
      style = { top: `${centerPercent}%`, left: -10, transform: 'translateY(-50%)' };
      sizeClass = 'h-[13%] w-4';
      break;
    case 'down':
      style = { left: `${centerPercent}%`, bottom: -10, transform: 'translateX(-50%)' };
      sizeClass = 'w-[13%] h-4';
      break;
    case 'up':
      style = { left: `${centerPercent}%`, top: -10, transform: 'translateX(-50%)' };
      sizeClass = 'w-[13%] h-4';
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
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" style={{ transform: `rotate(${ARROW_ROTATION[exit.direction]}deg)` }}>
        <path d="M6 4 L18 12 L6 20 Z" fill="#ffffff" opacity={0.9} />
      </svg>
    </motion.div>
  );
}
