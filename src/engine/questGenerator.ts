import { computeProgress, isLevelWon, tryMoveEntityInLevel } from './goals';
import { findPlacementForExit, generateOneExitPerColor, markOccupied, placeObstacles } from './placement';
import { createSeededRandom, randomInt, shuffle, type RandomFn } from './rng';
import type { ColorGoal, ColorId, Entity, EntityLength, Exit, Level } from './types';

/**
 * The staged, goal-based level generator actually used by the game (see
 * `goals.ts` for the runtime rules this builds levels for).
 *
 * A level is a queue of `ColorGoal`s (e.g. green needs 10, blue needs 8,
 * ...). Only the earliest `activeSlots` incomplete goals are open at once;
 * finishing one slides the next queued color into the freed slot. Every
 * entity for the whole level is placed on the board up front — nothing is
 * added later — and each is worth a `value` toward its color's goal when it
 * exits (a longer piece is worth more, the same way a bus counts for more
 * than a car in this genre). A color's goal can need more value than a
 * single piece can carry, so most goals are met by several pieces; any
 * extra ("overflow") pieces of an already-completed color just become
 * permanent blockers for later, still-open colors.
 */

/** Base value for a 1/2/3-cell piece, before the rare "deluxe" bump below. */
const BASE_VALUE_BY_LENGTH: Record<EntityLength, number> = { 1: 1, 2: 2, 3: 4 };
/** Chance a piece is a flashier "deluxe" variant worth extra toward the goal. */
const DELUXE_CHANCE = 0.15;
const DELUXE_BONUS_BY_LENGTH: Record<EntityLength, number> = { 1: 1, 2: 2, 3: 2 };

function rollValueForLength(length: EntityLength, rng: RandomFn): number {
  const base = BASE_VALUE_BY_LENGTH[length];
  return rng() < DELUXE_CHANCE ? base + DELUXE_BONUS_BY_LENGTH[length] : base;
}

export interface QuestGeneratorConfig {
  width: number;
  height: number;
  /** Full palette to draw goal colors from. */
  colors: ColorId[];
  /** How many color goals this level has (queue length). */
  goalCount: number;
  /** How many goals are concurrently open at the start. */
  activeSlots: number;
  /** Minimum/maximum quota for each goal. Defaults: 6 / 12. */
  minTarget?: number;
  maxTarget?: number;
  /** Chance (0-1) each goal spawns one extra never-required "overflow" blocker. Default 0.4. */
  overflowChance?: number;
  /**
   * How many wall openings each goal color gets. A color's required pieces
   * are spread across its own exits (not crammed onto a single row/column),
   * the same way multiple pieces of one color already coexist in the
   * classic mode — just via several same-colored openings instead of one.
   * Default 4.
   */
  exitsPerGoal?: number;
  /** Fixed single-cell blockers ("coral"). Default 2. */
  obstacleCount?: number;
  lengths?: EntityLength[];
  /** How many full attempts to make before giving up. Default 400. */
  maxAttempts?: number;
  rng?: RandomFn;
  seed?: number;
}

export interface QuestGeneratorResult {
  level: Level | null;
  attempts: number;
}

export function generateQuestLevel(config: QuestGeneratorConfig): QuestGeneratorResult {
  const {
    width,
    height,
    colors,
    goalCount,
    activeSlots,
    minTarget = 6,
    maxTarget = 12,
    overflowChance = 0.4,
    exitsPerGoal = 4,
    obstacleCount = 2,
    lengths = [1, 2, 3],
    maxAttempts = 400,
  } = config;

  if (colors.length < goalCount) {
    throw new Error(`generateQuestLevel needs at least ${goalCount} colors, got ${colors.length}`);
  }

  const rng = config.rng ?? createSeededRandom(config.seed ?? Date.now());

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const level = tryGenerateQuestOnce({
      width,
      height,
      colors,
      goalCount,
      activeSlots,
      minTarget,
      maxTarget,
      overflowChance,
      exitsPerGoal,
      obstacleCount,
      lengths,
      rng,
    });
    if (level) return { level, attempts: attempt };
  }

  return { level: null, attempts: maxAttempts };
}

interface InternalConfig {
  width: number;
  height: number;
  colors: ColorId[];
  goalCount: number;
  activeSlots: number;
  minTarget: number;
  maxTarget: number;
  overflowChance: number;
  exitsPerGoal: number;
  obstacleCount: number;
  lengths: EntityLength[];
  rng: RandomFn;
}

function tryGenerateQuestOnce(cfg: InternalConfig): Level | null {
  const { width, height, rng, lengths } = cfg;

  const goalColors = shuffle(cfg.colors, rng).slice(0, cfg.goalCount);
  const goals: ColorGoal[] = goalColors.map((colorId) => ({
    colorId,
    target: cfg.minTarget + randomInt(rng, cfg.maxTarget - cfg.minTarget + 1),
  }));

  // Several wall slots per goal color, so a color's required pieces can
  // spread across different rows/columns instead of all competing for one.
  const usedSlots = new Set<string>();
  const exitRequests = goalColors.flatMap((colorId) => Array<ColorId>(cfg.exitsPerGoal).fill(colorId));
  const exits = generateOneExitPerColor(width, height, exitRequests, rng, usedSlots);
  if (!exits) return null;

  const exitsByColor = new Map<ColorId, Exit[]>();
  for (const exit of exits) {
    const list = exitsByColor.get(exit.colorId) ?? [];
    list.push(exit);
    exitsByColor.set(exit.colorId, list);
  }

  const obstacles = placeObstacles(width, height, cfg.obstacleCount, rng);
  const occupied = new Set<string>(obstacles.map((o) => `${o.row},${o.col}`));
  const entities: Entity[] = [];
  const initialValueByColor: Record<ColorId, number> = {};
  for (const goal of goals) initialValueByColor[goal.colorId] = 0;
  let idCounter = 0;

  // Tries every (exit, length) combination for `colorId` (both shuffled)
  // until one fits — retrying across exits alone isn't enough, since a
  // pre-rolled length might not fit any of them while a different length
  // would; only once a length actually lands do we roll its value, so the
  // value always matches the piece that was actually placeable.
  function placeOnAnyExit(id: string, colorId: ColorId): Entity | null {
    for (const exit of shuffle(exitsByColor.get(colorId)!, rng)) {
      for (const length of shuffle(lengths, rng)) {
        const placed = findPlacementForExit(
          { id, colorId, value: 0, exit, lengths: [length] },
          width,
          height,
          occupied,
          rng,
        );
        if (placed) {
          placed.value = rollValueForLength(placed.length, rng);
          return placed;
        }
      }
    }
    return null;
  }

  // 1. Overflow entities first (deepest in placement order = never required
  //    to move = permanent blockers once their own color's goal closes).
  for (const goal of shuffle(goals, rng)) {
    if (rng() >= cfg.overflowChance) continue;
    const placed = placeOnAnyExit(`entity-${idCounter++}`, goal.colorId);
    if (!placed) continue; // overflow is a nice-to-have, not required to fit
    entities.push(placed);
    markOccupied(occupied, placed);
    initialValueByColor[goal.colorId] += placed.value;
  }

  // 2. Required entities, processed in REVERSE queue order (goalN's group
  //    placed first/deepest, goal1's group placed last/most accessible) —
  //    see the module doc + generator.ts for why reversing placement order
  //    yields a guaranteed-valid forward removal order.
  const requiredIdsByGoal = new Map<ColorId, string[]>();
  for (const goal of [...goals].reverse()) {
    const ids: string[] = [];
    let accumulated = 0;
    let guard = 0;
    while (accumulated < goal.target) {
      guard++;
      if (guard > 200) return null; // pathological: can't fit enough value, abandon attempt
      const id = `entity-${idCounter++}`;
      const placed = placeOnAnyExit(id, goal.colorId);
      if (!placed) return null; // couldn't fit a required piece — abandon the attempt
      entities.push(placed);
      markOccupied(occupied, placed);
      initialValueByColor[goal.colorId] += placed.value;
      accumulated += placed.value;
      ids.push(id);
    }
    requiredIdsByGoal.set(goal.colorId, ids);
  }

  const level: Level = {
    board: { width, height, entities, obstacles, exits },
    goals,
    activeSlots: cfg.activeSlots,
    initialValueByColor,
  };

  // Canonical removal order: forward queue order, each goal's own ids
  // reversed (since within a goal's group, placement order also needs
  // reversing to get a valid removal order — same rule applied one level
  // deeper).
  const canonicalOrder = goals.flatMap((goal) => [...requiredIdsByGoal.get(goal.colorId)!].reverse());

  return verifyCanonicalSolution(level, canonicalOrder) ? level : null;
}

/**
 * Fast, deterministic safety net: replays the exact removal order the
 * generator constructed the level to support, through the real
 * `tryMoveEntityInLevel` rules, and confirms it reaches a won state. This
 * is O(n) moves rather than an exponential search — appropriate here
 * because we're verifying one specific known-good answer, not searching
 * for one (unlike `solveBoard`'s BFS, which searches blind).
 */
function verifyCanonicalSolution(level: Level, order: string[]): boolean {
  let board = level.board;
  for (const entityId of order) {
    const result = tryMoveEntityInLevel(level, board, entityId);
    if (!result.moved) return false;
    board = result.board;
  }
  return isLevelWon(level, computeProgress(level, board.entities));
}
