import { create } from 'zustand';
import {
  computeProgress,
  generateQuestLevel,
  getActiveColorIds,
  getLevelStatus,
  tryMoveEntityInLevel,
  type Board,
  type Level,
  type LevelProgress,
  type LevelStatus,
} from '../engine';
import { PALETTE_COLOR_IDS } from '../theme/palette';

/** How many extra goal slots the player can unlock (mock "watch ad" for now). */
export const MAX_BONUS_SLOTS = 2;

interface GameState {
  level: Level | null;
  /** Current, mutable board — starts as `level.board`, shrinks as fish exit. */
  board: Board | null;
  progress: LevelProgress | null;
  activeColorIds: Set<string>;
  status: LevelStatus;
  /** Extra goal slots unlocked this level, beyond `level.activeSlots`. */
  bonusSlots: number;
  /** Entity id of the most recent blocked tap, for the shake/bubble feedback. */
  blockedEntityId: string | null;
  /** Bumped on every blocked tap so the UI can replay the shake even for repeats. */
  blockedNonce: number;
  levelSeed: number;
  startNewLevel: (seed?: number) => void;
  /** Tap a fish: exits it if its color is currently open and its path is clear, otherwise triggers the blocked feedback. */
  attemptMove: (entityId: string) => void;
  /** Mock "watch ad" — unlocks one more concurrently-open goal slot, up to MAX_BONUS_SLOTS. */
  unlockBonusSlot: () => void;
}

const LEVEL_CONFIG = {
  width: 10,
  height: 10,
  colors: PALETTE_COLOR_IDS,
  goalCount: 5,
  activeSlots: 3,
  obstacleCount: 2,
} as const;

function buildLevel(seed: number, fallbackDepth = 0): Level {
  const { level } = generateQuestLevel({ ...LEVEL_CONFIG, seed });
  if (level) return level;
  // Practically never hit for this size/palette, but never hand the UI a
  // null level — try a different seed instead of failing silently.
  if (fallbackDepth > 20) {
    throw new Error('Unable to generate a level after 20 fallback attempts');
  }
  return buildLevel(seed + 1, fallbackDepth + 1);
}

function deriveState(level: Level, board: Board, bonusSlots: number) {
  const progress = computeProgress(level, board.entities);
  const activeSlots = level.activeSlots + bonusSlots;
  const activeColorIds = getActiveColorIds(level, progress, activeSlots);
  const status = getLevelStatus(level, board, activeSlots);
  return { progress, activeColorIds, status };
}

export const useGameStore = create<GameState>((set, get) => ({
  level: null,
  board: null,
  progress: null,
  activeColorIds: new Set(),
  status: 'playing',
  bonusSlots: 0,
  blockedEntityId: null,
  blockedNonce: 0,
  levelSeed: 0,

  startNewLevel: (seed) => {
    const nextSeed = seed ?? Date.now();
    const level = buildLevel(nextSeed);
    const { progress, activeColorIds, status } = deriveState(level, level.board, 0);
    set({
      level,
      board: level.board,
      progress,
      activeColorIds,
      status,
      bonusSlots: 0,
      levelSeed: nextSeed,
      blockedEntityId: null,
    });
  },

  attemptMove: (entityId) => {
    const { level, board, bonusSlots } = get();
    if (!level || !board) return;

    const activeSlots = level.activeSlots + bonusSlots;
    const result = tryMoveEntityInLevel(level, board, entityId, activeSlots);
    if (!result.moved) {
      set((state) => ({
        blockedEntityId: entityId,
        blockedNonce: state.blockedNonce + 1,
      }));
      return;
    }

    const { progress, activeColorIds, status } = deriveState(level, result.board, bonusSlots);
    set({ board: result.board, progress, activeColorIds, status, blockedEntityId: null });
  },

  unlockBonusSlot: () => {
    const { level, board, bonusSlots } = get();
    if (!level || !board || bonusSlots >= MAX_BONUS_SLOTS) return;
    const nextBonusSlots = bonusSlots + 1;
    const { progress, activeColorIds, status } = deriveState(level, board, nextBonusSlots);
    set({ bonusSlots: nextBonusSlots, progress, activeColorIds, status });
  },
}));
