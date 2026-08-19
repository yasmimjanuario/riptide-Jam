import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Exit } from '../engine';
import { getSwatch } from '../theme/palette';

export type ExitMarkerStatus = 'active' | 'locked' | 'completed';

interface ExitMarkerProps {
  exit: Exit;
  width: number;
  height: number;
  status: ExitMarkerStatus;
}

/**
 * A colored opening in the tank wall. Positioned along whichever edge
 * `exit.direction` points out of, at `exit.lineIndex` (row for a
 * left/right exit, column for an up/down exit).
 *
 * `status` reflects the goal layer: `active` currents glow and pulse,
 * `locked` ones (their color's goal hasn't opened yet) sit dim and still,
 * `completed` ones (goal already met) fade to a faint outline — closed for
 * good, even if fish of that color remain on the board.
 */
export default function ExitMarker({ exit, width, height, status }: ExitMarkerProps) {
  const swatch = getSwatch(exit.colorId);

  const alongAxisSize = exit.direction === 'up' || exit.direction === 'down' ? width : height;
  const centerPercent = ((exit.lineIndex + 0.5) / alongAxisSize) * 100;

  const base = 'absolute rounded-full';
  let style: CSSProperties;
  let sizeClass: string;

  switch (exit.direction) {
    case 'right':
      style = { top: `${centerPercent}%`, right: -5, transform: 'translateY(-50%)' };
      sizeClass = 'h-[9%] w-2.5';
      break;
    case 'left':
      style = { top: `${centerPercent}%`, left: -5, transform: 'translateY(-50%)' };
      sizeClass = 'h-[9%] w-2.5';
      break;
    case 'down':
      style = { left: `${centerPercent}%`, bottom: -5, transform: 'translateX(-50%)' };
      sizeClass = 'w-[9%] h-2.5';
      break;
    case 'up':
      style = { left: `${centerPercent}%`, top: -5, transform: 'translateX(-50%)' };
      sizeClass = 'w-[9%] h-2.5';
      break;
  }

  if (status === 'active') {
    return (
      <motion.div
        className={`${base} ${sizeClass} shadow-[0_0_8px_var(--glow)]`}
        style={{
          ...style,
          backgroundColor: swatch.hex,
          // @ts-expect-error -- custom property consumed by the shadow above
          '--glow': swatch.glow,
        }}
        animate={{ opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  return (
    <div
      className={`${base} ${sizeClass} border`}
      style={{
        ...style,
        backgroundColor: status === 'completed' ? 'transparent' : `${swatch.hex}55`,
        borderColor: status === 'completed' ? `${swatch.hex}66` : 'transparent',
        opacity: status === 'completed' ? 0.5 : 0.85,
      }}
    />
  );
}
