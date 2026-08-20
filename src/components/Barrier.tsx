import { useTranslation } from 'react-i18next';
import type { Obstacle } from '../engine';

interface BarrierProps {
  obstacle: Obstacle;
}

/** A fixed traffic cone — never moves, never tappable. */
export default function Barrier({ obstacle }: BarrierProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center justify-center"
      style={{
        gridColumn: `${obstacle.col + 1} / span 1`,
        gridRow: `${obstacle.row + 1} / span 1`,
      }}
      role="img"
      aria-label={t('game.obstacleAria')}
    >
      <svg viewBox="0 0 100 100" className="h-[74%] w-[74%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
        <ellipse cx="50" cy="88" rx="30" ry="7" fill="#1a1a1a" opacity={0.4} />
        <rect x="18" y="80" width="64" height="10" rx="3" fill="#e8580c" />
        <path d="M50 14 L74 82 L26 82 Z" fill="#f3721c" />
        <path d="M42 50 L58 50 L62 62 L38 62 Z" fill="#f4f4f4" />
        <path d="M46 30 L54 30 L57 40 L43 40 Z" fill="#f4f4f4" />
      </svg>
    </div>
  );
}
