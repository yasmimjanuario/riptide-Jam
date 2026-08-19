import { findPlacementForExit, generateOneExitPerColor, markOccupied, placeObstacles } from './placement';
import { createSeededRandom, pickRandom, shuffle, type RandomFn } from './rng';
import { solveBoard } from './solver';
import type { Board, ColorId, Entity, EntityLength, Exit } from './types';

export interface GeneratorConfig {
  width: number;
  height: number;
  /** Color palette to draw from; also determines how many exits get created. */
  colors: ColorId[];
  /** How many entities ("fish") the finished level should contain. */
  entityCount: number;
  /** Extra colored exits beyond one-per-color, for queueing difficulty. Default 0. */
  extraExits?: number;
  /** Fixed single-cell blockers ("coral"). Default 0. */
  obstacleCount?: number;
  /** Allowed entity lengths to draw from. Default [1, 2, 3]. */
  lengths?: EntityLength[];
  /** How many full attempts to make before giving up. Default 200. */
  maxAttempts?: number;
  /** Injectable RNG for deterministic/reproducible generation (e.g. a daily seed). */
  rng?: RandomFn;
  /** Convenience alternative to `rng`: seed a deterministic PRNG. */
  seed?: number;
}

export interface GeneratorResult {
  board: Board | null;
  attempts: number;
}

/**
 * Generates a random, guaranteed-solvable "classic" level: every exit is
 * open from the start, every entity is worth 1 (no goal/value layer). This
 * is the simplest possible mode and mainly exists as a baseline/testing
 * utility now — `questGenerator.ts` builds the staged, goal-based levels
 * actually used by the game.
 *
 * Levels are built back-to-front: we decide the exits first, then place
 * entities one at a time, always checking that each new entity has a clear
 * path to its assigned exit *given only the entities already placed*.
 *
 * Why that guarantees solvability: removing an entity can only ever free up
 * cells, never occupy new ones, so once an entity's path is clear it stays
 * clear regardless of what happens to entities placed *after* it. Reading
 * the placement order backwards therefore gives a valid play-order: the
 * last entity placed is always removable first (nothing was placed after it
 * to block it), and so on back to the first entity placed, which is
 * removable last. So generation order is the reverse of a valid solution
 * order.
 *
 * As a final safety net (and because it's cheap for these small boards) the
 * finished board is still re-checked with the BFS solver before being
 * returned; if that ever disagrees, the attempt is discarded and retried.
 */
export function generateLevel(config: GeneratorConfig): GeneratorResult {
  const {
    width,
    height,
    colors,
    entityCount,
    extraExits = 0,
    obstacleCount = 0,
    lengths = [1, 2, 3],
    maxAttempts = 200,
  } = config;

  if (colors.length === 0) {
    throw new Error('generateLevel requires at least one color');
  }

  const rng = config.rng ?? createSeededRandom(config.seed ?? Date.now());

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const board = tryGenerateOnce({
      width,
      height,
      colors,
      entityCount,
      extraExits,
      obstacleCount,
      lengths,
      rng,
    });

    if (board && solveBoard(board).solvable) {
      return { board, attempts: attempt };
    }
  }

  return { board: null, attempts: maxAttempts };
}

interface InternalConfig {
  width: number;
  height: number;
  colors: ColorId[];
  entityCount: number;
  extraExits: number;
  obstacleCount: number;
  lengths: EntityLength[];
  rng: RandomFn;
}

function tryGenerateOnce(config: InternalConfig): Board | null {
  const { width, height, colors, entityCount, extraExits, obstacleCount, lengths, rng } = config;

  const exits = generateExitsWithExtras(width, height, colors, extraExits, rng);
  if (!exits) return null;

  const obstacles = placeObstacles(width, height, obstacleCount, rng);

  const occupied = new Set<string>(obstacles.map((o) => `${o.row},${o.col}`));
  const entities: Entity[] = [];

  for (let i = 0; i < entityCount; i++) {
    // Try every exit (shuffled) rather than committing to one random pick,
    // so a single cramped exit doesn't sink the whole attempt when another
    // exit still has room.
    let placed: Entity | null = null;
    for (const exit of shuffle(exits, rng)) {
      placed = findPlacementForExit(
        { id: `entity-${i}`, colorId: exit.colorId, value: 1, exit, lengths },
        width,
        height,
        occupied,
        rng,
      );
      if (placed) break;
    }
    if (!placed) return null; // couldn't fit this entity anywhere — abandon the attempt
    entities.push(placed);
    markOccupied(occupied, placed);
  }

  return { width, height, entities, obstacles, exits };
}

/** One exit per color, plus `extraExits` additional random ones, all on unique wall slots. */
function generateExitsWithExtras(
  width: number,
  height: number,
  colors: ColorId[],
  extraExits: number,
  rng: RandomFn,
): Exit[] | null {
  const used = new Set<string>();
  const exits = generateOneExitPerColor(width, height, colors, rng, used);
  if (!exits) return null;

  for (let i = 0; i < extraExits; i++) {
    const color = pickRandom(colors, rng);
    // Shares `used` with the call above, so an extra can never collide with
    // a wall slot a primary (or earlier extra) exit already claimed.
    const extra = generateOneExitPerColor(width, height, [color], rng, used);
    if (extra) exits.push(...extra); // best-effort; running out of wall slots just skips it
  }

  return exits;
}
