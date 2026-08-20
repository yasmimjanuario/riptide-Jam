import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CSSProperties } from 'react';
import type { Direction, Entity, Orientation } from '../engine';
import { getSwatch } from '../theme/palette';
import { VEHICLE_KIND_BY_LENGTH } from '../theme/vehicleKind';

interface VehicleProps {
  entity: Entity;
  boardWidth: number;
  boardHeight: number;
  /** Nonce that increments each time this vehicle's tap was blocked; 0 = never. */
  blockedNonce: number;
  onTap: () => void;
}

function getExitOffset(direction: Direction, boardWidth: number, boardHeight: number) {
  // Travel far enough (relative to the vehicle's own size) to clear the lot
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

/**
 * Builds coordinate helpers for drawing vehicle art in a single square
 * (0-100 × 0-100) viewBox that gets non-uniformly stretched
 * (`preserveAspectRatio="none"`) to exactly fill the piece's actual grid
 * span — which is already the correct N:1 (horizontal) or 1:N (vertical)
 * box from CSS grid placement. Art is authored in normalized "along the
 * travel axis" (`a`, 0=back → 1=front) / "across it" (`c`, 0..1) terms, so
 * the same drawing logic works for every orientation and direction: no
 * separate templates, no rotation-induced distortion for multi-cell
 * vertical pieces.
 */
function makeMapper(orientation: Orientation, direction: Direction) {
  const forward = direction === 'right' || direction === 'down';
  const alongOf = (a: number) => (forward ? a : 1 - a) * 100;

  if (orientation === 'horizontal') {
    return {
      rect: (a0: number, a1: number, c0: number, c1: number) => {
        const xa = alongOf(a0);
        const xb = alongOf(a1);
        return { x: Math.min(xa, xb), y: c0 * 100, width: Math.abs(xb - xa), height: (c1 - c0) * 100 };
      },
      point: (a: number, c: number) => ({ x: alongOf(a), y: c * 100 }),
    };
  }
  return {
    rect: (a0: number, a1: number, c0: number, c1: number) => {
      const ya = alongOf(a0);
      const yb = alongOf(a1);
      return { x: c0 * 100, y: Math.min(ya, yb), width: (c1 - c0) * 100, height: Math.abs(yb - ya) };
    },
    point: (a: number, c: number) => ({ x: c * 100, y: alongOf(a) }),
  };
}

type Mapper = ReturnType<typeof makeMapper>;

function VehicleArt({ entity, colorHex }: { entity: Entity; colorHex: string }) {
  const map: Mapper = makeMapper(entity.orientation, entity.direction);
  const body = map.rect(0.04, 0.96, 0.16, 0.84);

  // Wheel pairs, positioned along the body — more pairs for longer vehicles,
  // spaced further apart, which reads as "longer wheelbase" automatically
  // since the container itself is proportionally longer.
  const wheelPositions = entity.length === 3 ? [0.18, 0.5, 0.82] : entity.length === 2 ? [0.2, 0.8] : [0.28, 0.72];

  const wheelRects = wheelPositions.flatMap((a) => {
    const near = map.rect(a - 0.06, a + 0.06, -0.04, 0.06);
    const far = map.rect(a - 0.06, a + 0.06, 0.94, 1.04);
    return [near, far];
  });

  const headlights = [map.point(0.97, 0.28), map.point(0.97, 0.72)];
  const taillights = [map.point(0.03, 0.28), map.point(0.03, 0.72)];

  // Window pattern differs by vehicle kind: motorcycle gets a seat mark,
  // car a single cabin, bus a row of windows.
  const windows =
    entity.length === 1
      ? [map.rect(0.38, 0.6, 0.32, 0.68)]
      : entity.length === 2
        ? [map.rect(0.26, 0.72, 0.26, 0.74)]
        : [0.14, 0.36, 0.58, 0.8].map((a) => map.rect(a, a + 0.16, 0.26, 0.74));

  return (
    <>
      {wheelRects.map((w, i) => (
        <rect key={`wheel-${i}`} x={w.x} y={w.y} width={w.width} height={w.height} rx={2} fill="#171b21" />
      ))}
      <rect x={body.x} y={body.y} width={body.width} height={body.height} rx={9} fill={colorHex} />
      {windows.map((w, i) => (
        <rect key={`window-${i}`} x={w.x} y={w.y} width={w.width} height={w.height} rx={3} fill="#17202b" opacity={0.82} />
      ))}
      {headlights.map((p, i) => (
        <circle key={`head-${i}`} cx={p.x} cy={p.y} r={3.4} fill="#fff2b8" />
      ))}
      {taillights.map((p, i) => (
        <circle key={`tail-${i}`} cx={p.x} cy={p.y} r={2.8} fill="#7a1f1f" />
      ))}
    </>
  );
}

export default function Vehicle({ entity, boardWidth, boardHeight, blockedNonce, onTap }: VehicleProps) {
  const { t } = useTranslation();
  const swatch = getSwatch(entity.colorId);
  const kind = VEHICLE_KIND_BY_LENGTH[entity.length];

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
      className="relative flex cursor-pointer items-center justify-center p-[6%]"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ ...exitOffset, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
      whileTap={{ scale: 0.94 }}
      onClick={onTap}
      aria-label={t('game.vehicleAria', { color: t(swatch.labelKey), kind: t(kind.labelKey) })}
    >
      {/* Shake wrapper: remounts (and replays its keyframes) every time
          blockedNonce changes, giving the "nope" feedback without any
          imperative animation-controls bookkeeping. */}
      <motion.div
        key={blockedNonce}
        className="relative h-full w-full"
        animate={blockedNonce > 0 ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {/* Idle suspension bounce, always running, subtle. */}
        <motion.div
          className="h-full w-full"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]">
            <VehicleArt entity={entity} colorHex={swatch.hex} />
          </svg>
        </motion.div>

        {/* Blocked feedback: a little "!" bubble that pops and fades. */}
        {blockedNonce > 0 && (
          <motion.div
            key={`bubble-${blockedNonce}`}
            className="pointer-events-none absolute -top-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-900"
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
