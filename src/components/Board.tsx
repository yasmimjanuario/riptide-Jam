import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Board as BoardModel } from '../engine';
import Barrier from './Barrier';
import ExitMarker from './ExitMarker';
import Vehicle from './Vehicle';

interface BoardProps {
  board: BoardModel;
  blockedEntityId: string | null;
  blockedNonce: number;
  onTapEntity: (entityId: string) => void;
}

export default function Board({ board, blockedEntityId, blockedNonce, onTapEntity }: BoardProps) {
  const { t } = useTranslation();
  const { width, height } = board;

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border-4 border-slate-950/70 bg-gradient-to-b from-slate-600 to-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
      role="grid"
      aria-label={t('game.boardLabel')}
    >
      {/* asphalt texture */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_85%,rgba(0,0,0,0.35),transparent_55%)]" />

      {board.exits.map((exit) => (
        <ExitMarker key={`exit-${exit.direction}-${exit.lineIndex}`} exit={exit} width={width} height={height} />
      ))}

      {/* lane markings: the grid gap itself reads as painted lines between bays */}
      <div
        className="absolute inset-[4%] grid gap-[3px] rounded bg-white/25 p-[3px]"
        style={{
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        }}
      >
        {Array.from({ length: width * height }).map((_, i) => (
          <div key={`bay-${i}`} className="rounded-[3px] bg-slate-700/95" />
        ))}
      </div>

      <div
        className="absolute inset-[4%] grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        }}
      >
        {board.obstacles.map((obstacle, index) => (
          <Barrier key={`obstacle-${index}-${obstacle.row}-${obstacle.col}`} obstacle={obstacle} />
        ))}

        <AnimatePresence>
          {board.entities.map((entity) => (
            <Vehicle
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
