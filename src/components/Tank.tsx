import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Board } from '../engine';
import Bubbles from './Bubbles';
import ExitMarker from './ExitMarker';
import Fish from './Fish';
import ObstacleMark from './ObstacleMark';

interface TankProps {
  board: Board;
  blockedEntityId: string | null;
  blockedNonce: number;
  onTapEntity: (entityId: string) => void;
}

export default function Tank({ board, blockedEntityId, blockedNonce, onTapEntity }: TankProps) {
  const { t } = useTranslation();
  const { width, height } = board;

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[28px] border-4 border-sky-950/50 bg-gradient-to-b from-sky-600 via-sky-800 to-sky-950 shadow-[0_20px_60px_rgba(2,20,40,0.55)]"
      role="grid"
      aria-label={t('game.tankLabel')}
    >
      {/* caustic light shimmer */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.35),transparent_55%),radial-gradient(circle_at_75%_65%,rgba(255,255,255,0.18),transparent_50%)]" />

      <Bubbles />

      {board.exits.map((exit) => (
        <ExitMarker key={`exit-${exit.direction}-${exit.lineIndex}`} exit={exit} width={width} height={height} />
      ))}

      <div
        className="absolute inset-[5%] grid gap-[3%]"
        style={{
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        }}
      >
        {board.obstacles.map((obstacle, index) => (
          <ObstacleMark key={`obstacle-${index}-${obstacle.row}-${obstacle.col}`} obstacle={obstacle} />
        ))}

        <AnimatePresence>
          {board.entities.map((entity) => (
            <Fish
              key={entity.id}
              entity={entity}
              boardWidth={width}
              boardHeight={height}
              blockedNonce={blockedEntityId === entity.id ? blockedNonce : 0}
              onTap={() => onTapEntity(entity.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
