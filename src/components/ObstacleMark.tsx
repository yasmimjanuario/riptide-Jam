import { useTranslation } from 'react-i18next';
import type { Obstacle } from '../engine';

interface ObstacleMarkProps {
  obstacle: Obstacle;
}

/** A fixed coral/rock blocker — never moves, never tappable. */
export default function ObstacleMark({ obstacle }: ObstacleMarkProps) {
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
      <svg viewBox="0 0 100 100" className="h-[78%] w-[78%] opacity-90">
        <path
          d="M50 12 C68 12 82 26 84 42 C86 58 76 70 60 76 C46 81 30 78 20 66 C10 54 12 36 24 24 C32 16 41 12 50 12 Z"
          fill="#c9633b"
        />
        <path
          d="M50 12 C68 12 82 26 84 42 C86 58 76 70 60 76 C46 81 30 78 20 66"
          fill="none"
          stroke="#a6472a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
