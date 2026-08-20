import { cellKey, getEntityCells, getFrontCell, getPathCells, orientationForDirection } from './grid';
import { createSeededRandom, pickRandom, randomInt, shuffle, type RandomFn } from './rng';
import { solveBoard } from './solver';
import type { Board, ColorId, Direction, Entity, EntityLength, Exit, Obstacle } from './types';

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

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
 * Generates a random, guaranteed-solvable level.
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

  const exits = generateExits(width, height, colors, extraExits, rng);
  if (exits.length === 0) return null;

  const obstacles = placeObstacles(width, height, obstacleCount, rng);

  const occupied = new Set<string>(obstacles.map((o) => cellKey(o)));
  const entities: Entity[] = [];

  for (let i = 0; i < entityCount; i++) {
    const placed = placeOneEntity({
      id: `entity-${i}`,
      width,
      height,
      exits,
      lengths,
      occupied,
      placedEntities: entities,
      rng,
    });
    if (!placed) return null; // couldn't fit this entity — abandon the attempt
    entities.push(placed);
    for (const cell of getEntityCells(placed)) occupied.add(cellKey(cell));
  }

  return { width, height, entities, obstacles, exits };
}

/** One exit per color, plus `extraExits` additional random ones, all on unique wall slots. */
function generateExits(
  width: number,
  height: number,
  colors: ColorId[],
  extraExits: number,
  rng: RandomFn,
): Exit[] {
  const used = new Set<string>(); // `${direction}:${lineIndex}`
  const exits: Exit[] = [];

  const tryAddExit = (colorId: ColorId): boolean => {
    const candidates = shuffle(ALL_DIRECTIONS, rng);
    for (const direction of candidates) {
      const axisSize = orientationForDirection(direction) === 'horizontal' ? height : width;
      const lineIndexes = shuffle(
        Array.from({ length: axisSize }, (_, idx) => idx),
        rng,
      );
      for (const lineIndex of lineIndexes) {
        const slotKey = `${direction}:${lineIndex}`;
        if (used.has(slotKey)) continue;
        used.add(slotKey);
        exits.push({ direction, lineIndex, colorId });
        return true;
      }
    }
    return false;
  };

  for (const color of colors) {
    if (!tryAddExit(color)) return [];
  }
  for (let i = 0; i < extraExits; i++) {
    const color = pickRandom(colors, rng);
    tryAddExit(color); // best-effort; running out of wall slots just skips it
  }

  return exits;
}

function placeObstacles(width: number, height: number, count: number, rng: RandomFn): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const occupied = new Set<string>();
  let guard = 0;
  while (obstacles.length < count && guard < count * 50) {
    guard++;
    const row = randomInt(rng, height);
    const col = randomInt(rng, width);
    const key = cellKey({ row, col });
    if (occupied.has(key)) continue;
    occupied.add(key);
    obstacles.push({ row, col });
  }
  return obstacles;
}

interface PlaceOneEntityArgs {
  id: string;
  width: number;
  height: number;
  exits: Exit[];
  lengths: EntityLength[];
  occupied: Set<string>;
  placedEntities: Entity[];
  rng: RandomFn;
}

/**
 * Finds a valid placement for one new entity, trying random colors/exits/
 * lengths/anchors until one fits given the cells already occupied. Returns
 * null if nothing fits after exhausting reasonable options.
 */
function placeOneEntity(args: PlaceOneEntityArgs): Entity | null {
  const { id, width, height, exits, lengths, occupied, rng } = args;

  const exitOrder = shuffle(exits, rng);
  for (const exit of exitOrder) {
    const orientation = orientationForDirection(exit.direction);
    const lengthOrder = shuffle(lengths, rng);
    for (const length of lengthOrder) {
      const axisSize = orientation === 'horizontal' ? width : height;
      if (length > axisSize) continue;

      const anchorOrder = shuffle(
        Array.from({ length: axisSize - length + 1 }, (_, idx) => idx),
        rng,
      );

      for (const anchor of anchorOrder) {
        const candidate: Entity = {
          id,
          colorId: exit.colorId,
          length: length as EntityLength,
          orientation,
          direction: exit.direction,
          row: orientation === 'horizontal' ? exit.lineIndex : anchor,
          col: orientation === 'horizontal' ? anchor : exit.lineIndex,
        };

        if (isPlacementValid(candidate, occupied, width, height)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function isPlacementValid(
  candidate: Entity,
  occupied: Set<string>,
  width: number,
  height: number,
): boolean {
  const ownCells = getEntityCells(candidate);
  if (ownCells.some((cell) => occupied.has(cellKey(cell)))) return false;

  const path = getPathCells(candidate, width, height);
  if (path.some((cell) => occupied.has(cellKey(cell)))) return false;

  // Defensive: front cell must actually be inside the board (guaranteed by
  // construction, but cheap to assert).
  const front = getFrontCell(candidate);
  if (front.row < 0 || front.row >= height || front.col < 0 || front.col >= width) return false;

  return true;
}
