import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { Direction, Entity } from '../engine';
import { getSwatch } from '../theme/palette';

interface FishProps {
  entity: Entity;
  boardWidth: number;
  boardHeight: number;
  /** Nonce that increments each time this fish's tap was blocked; 0 = never. */
  blockedNonce: number;
  onTap: () => void;
}

// The fish artwork (head/eye on the left, tail fin on the right) faces
// left by default; rotate it to face its fixed swim direction.
const DIRECTION_ROTATION: Record<Direction, number> = {
  left: 0,
  up: 90,
  right: 180,
  down: -90,
};

function getExitOffset(direction: Direction, boardWidth: number, boardHeight: number) {
  // Travel far enough (relative to the fish's own size) to clear the tank
  // from anywhere on the board, regardless of how large the piece is.
  const horizontal = `${(boardWidth + 2) * 100}%`;
  const vertical = `${(boardHeight + 2) * 100}%`;
  switch (direction) {
    case 'right':
      return { x: horizontal, y: '0%' };
    case 'left':
      return { x: `-${horizontal}`, y: '0%' };
    case 'down':
      return { x: '0%', y: vertical };
    case 'up':
      return { x: '0%', y: `-${vertical}` };
  }
}

export default function Fish({ entity, boardWidth, boardHeight, blockedNonce, onTap }: FishProps) {
  const { t } = useTranslation();
  const swatch = getSwatch(entity.colorId);

  const gridStyle: CSSProperties =
    entity.orientation === 'horizontal'
      ? { gridColumn: `${entity.col + 1} / span ${entity.length}`, gridRow: `${entity.row + 1} / span 1` }
      : { gridColumn: `${entity.col + 1} / span 1`, gridRow: `${entity.row + 1} / span ${entity.length}` };

  const exitOffset = getExitOffset(entity.direction, boardWidth, boardHeight);

  return (
    <motion.button
      type="button"
      layout
      style={gridStyle}
      className="relative flex cursor-pointer items-center justify-center p-[8%]"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ ...exitOffset, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
      whileTap={{ scale: 0.92 }}
      onClick={onTap}
      aria-label={t('game.fishAria', { color: t(swatch.labelKey) })}
    >
      {/* Shake wrapper: remounts (and replays its keyframes) every time
          blockedNonce changes, giving the "nope" feedback without any
          imperative animation-controls bookkeeping. */}
      <motion.div
        key={blockedNonce}
        className="relative h-full w-full"
        animate={blockedNonce > 0 ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* Idle bob, always running. */}
        <motion.div
          className="h-full w-full"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            viewBox="0 0 100 60"
            className="h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
            style={{ transform: `rotate(${DIRECTION_ROTATION[entity.direction]}deg)` }}
          >
            <motion.polygon
              points="78,30 100,12 100,48"
              fill={swatch.hex}
              opacity={0.85}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '80px 30px' }}
            />
            <ellipse cx="42" cy="30" rx="40" ry="23" fill={swatch.hex} />
            <ellipse cx="30" cy="22" rx="14" ry="9" fill="#ffffff" opacity={0.18} />
            <circle cx="18" cy="24" r="4.2" fill="#0c1b2a" />
          </svg>
        </motion.div>

        {/* Blocked feedback: a little "!" bubble that pops and fades. */}
        {blockedNonce > 0 && (
          <motion.div
            key={`bubble-${blockedNonce}`}
            className="pointer-events-none absolute -top-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold text-sky-900"
            initial={{ opacity: 0, scale: 0.4, y: 4 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.8], y: [4, -6, -10, -16] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            !
          </motion.div>
        )}
      </motion.div>
    </motion.button>
  );
}
