import { create } from 'zustand';
import {
  generateLevel,
  getBoardStatus,
  tryMoveEntity,
  type Board,
  type BoardStatus,
} from '../engine';
import { PALETTE_COLOR_IDS } from '../theme/palette';

interface GameState {
  board: Board | null;
  status: BoardStatus;
  /** Entity id of the most recent blocked tap, for the shake/bubble feedback. */
  blockedEntityId: string | null;
  /** Bumped on every blocked tap so the UI can replay the shake even for repeats. */
  blockedNonce: number;
  levelSeed: number;
  startNewLevel: (seed?: number) => void;
  /** Tap a fish: exits it if legal, otherwise triggers the blocked feedback. Never costs a life on its own — that only happens on deadlock. */
  attemptMove: (entityId: string) => void;
}

const LEVEL_CONFIG = {
  width: 6,
  height: 6,
  colors: PALETTE_COLOR_IDS,
  entityCount: 8,
  obstacleCount: 2,
} as const;

function buildLevel(seed: number, fallbackDepth = 0): Board {
  const { board } = generateLevel({ ...LEVEL_CONFIG, seed });
  if (board) return board;
  // Practically never hit for this board size/palette, but never hand the
  // UI a null level — try a different seed instead of failing silently.
  if (fallbackDepth > 20) {
    throw new Error('Unable to generate a level after 20 fallback attempts');
  }
  return buildLevel(seed + 1, fallbackDepth + 1);
}

export const useGameStore = create<GameState>((set, get) => ({
  board: null,
  status: 'playing',
  blockedEntityId: null,
  blockedNonce: 0,
  levelSeed: 0,

  startNewLevel: (seed) => {
    const nextSeed = seed ?? Date.now();
    const board = buildLevel(nextSeed);
    set({
      board,
      status: getBoardStatus(board),
      levelSeed: nextSeed,
      blockedEntityId: null,
    });
  },

  attemptMove: (entityId) => {
    const { board } = get();
    if (!board) return;

    const result = tryMoveEntity(board, entityId);
    if (!result.moved) {
      set((state) => ({
        blockedEntityId: entityId,
        blockedNonce: state.blockedNonce + 1,
      }));
      return;
    }

    set({
      board: result.board,
      status: getBoardStatus(result.board),
      blockedEntityId: null,
    });
  },
}));
