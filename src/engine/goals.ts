import { canExit, tryMoveEntity } from './rules';
import type { Board, ColorGoal, ColorId, Entity, Level, LevelStatus, MoveResult } from './types';

/**
 * The goal/quota layer, sitting on top of the plain movement rules in
 * `rules.ts` (which those functions are unchanged and still fully reused —
 * they only ever look at `board.exits`, never at goals). This layer adds
 * one extra gate: an entity can only leave through its exit while its
 * color's goal is currently "active" (one of the `activeSlots` earliest
 * incomplete goals in the level's queue).
 */

export interface LevelProgress {
  /** Total value exited so far, per color. */
  removedValueByColor: Record<ColorId, number>;
}

/**
 * Derives progress from which entities are still on the board — there is no
 * separate mutable "progress" state to keep in sync: removed value for a
 * color is always `initial - stillRemaining`.
 */
export function computeProgress(level: Level, remainingEntities: Entity[]): LevelProgress {
  const remainingValueByColor: Record<ColorId, number> = {};
  for (const entity of remainingEntities) {
    remainingValueByColor[entity.colorId] = (remainingValueByColor[entity.colorId] ?? 0) + entity.value;
  }

  const removedValueByColor: Record<ColorId, number> = {};
  for (const [colorId, initial] of Object.entries(level.initialValueByColor)) {
    removedValueByColor[colorId] = initial - (remainingValueByColor[colorId] ?? 0);
  }
  return { removedValueByColor };
}

export function isGoalComplete(goal: ColorGoal, progress: LevelProgress): boolean {
  return (progress.removedValueByColor[goal.colorId] ?? 0) >= goal.target;
}

export function isLevelWon(level: Level, progress: LevelProgress): boolean {
  return level.goals.every((goal) => isGoalComplete(goal, progress));
}

/**
 * The colors currently allowed to exit: the earliest (in queue order)
 * `activeSlots` goals that aren't complete yet. `activeSlots` defaults to
 * `level.activeSlots` but can be overridden — the UI passes a boosted
 * number when the player has unlocked bonus slots. A boosted count only
 * ever adds more simultaneously-open colors on top of the base set, so it
 * can never make an already-solvable level unsolvable.
 */
export function getActiveColorIds(
  level: Level,
  progress: LevelProgress,
  activeSlots: number = level.activeSlots,
): Set<ColorId> {
  const active = new Set<ColorId>();
  for (const goal of level.goals) {
    if (active.size >= activeSlots) break;
    if (!isGoalComplete(goal, progress)) active.add(goal.colorId);
  }
  return active;
}

export function canExitInLevel(level: Level, board: Board, entity: Entity, activeSlots?: number): boolean {
  const progress = computeProgress(level, board.entities);
  const active = getActiveColorIds(level, progress, activeSlots);
  return active.has(entity.colorId) && canExit(board, entity);
}

export function getAvailableMovesInLevel(level: Level, board: Board, activeSlots?: number): Entity[] {
  const progress = computeProgress(level, board.entities);
  const active = getActiveColorIds(level, progress, activeSlots);
  return board.entities.filter((entity) => active.has(entity.colorId) && canExit(board, entity));
}

/**
 * Attempts to move (exit) the entity with the given id, respecting both the
 * geometric rules (clear path) and the goal layer (its color must be
 * active). Same contract as `rules.tryMoveEntity`: blocked/inactive moves
 * return `moved: false` with the board unchanged, never costing a life on
 * their own.
 */
export function tryMoveEntityInLevel(
  level: Level,
  board: Board,
  entityId: string,
  activeSlots?: number,
): MoveResult {
  const entity = board.entities.find((e) => e.id === entityId);
  if (!entity || !canExitInLevel(level, board, entity, activeSlots)) {
    return { board, moved: false };
  }
  return tryMoveEntity(board, entityId);
}

export function getLevelStatus(level: Level, board: Board, activeSlots?: number): LevelStatus {
  const progress = computeProgress(level, board.entities);
  if (isLevelWon(level, progress)) return 'won';
  if (getAvailableMovesInLevel(level, board, activeSlots).length === 0) return 'deadlock';
  return 'playing';
}
