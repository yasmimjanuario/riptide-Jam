import { cellKey, getEntityCells, getFrontCell, getPathCells, orientationForDirection } from './grid';
import { shuffle, type RandomFn } from './rng';
import type { ColorId, Direction, Entity, EntityLength, Exit, Obstacle } from './types';

const ALL_DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/**
 * Shared placement/generation primitives used by both `generator.ts` (flat,
 * all-exits-open levels) and `questGenerator.ts` (staged, goal-based
 * levels). Kept separate from both so neither generator has to duplicate
 * the geometry-fitting logic.
 */

export function isPlacementValid(
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

export interface PlacementRequest {
  id: string;
  colorId: ColorId;
  value: number;
  exit: Exit;
  lengths: EntityLength[];
}

/**
 * Finds a valid placement for one new entity assigned to a specific exit,
 * trying random lengths/anchors until one fits given the cells already
 * occupied. Returns null if nothing fits.
 */
export function findPlacementForExit(
  request: PlacementRequest,
  width: number,
  height: number,
  occupied: Set<string>,
  rng: RandomFn,
): Entity | null {
  const { exit } = request;
  const orientation = orientationForDirection(exit.direction);
  const lengthOrder = shuffle(request.lengths, rng);

  for (const length of lengthOrder) {
    const axisSize = orientation === 'horizontal' ? width : height;
    if (length > axisSize) continue;

    const anchorOrder = shuffle(
      Array.from({ length: axisSize - length + 1 }, (_, idx) => idx),
      rng,
    );

    for (const anchor of anchorOrder) {
      const candidate: Entity = {
        id: request.id,
        colorId: request.colorId,
        value: request.value,
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

  return null;
}

export function markOccupied(occupied: Set<string>, entity: Entity): void {
  for (const cell of getEntityCells(entity)) occupied.add(cellKey(cell));
}

/**
 * Assigns one exit per color in `colors`, each on a unique, randomly chosen
 * wall slot (`direction` + `lineIndex`). Returns null if some color can't
 * get a slot (only possible if there are more colors than wall slots).
 *
 * Pass a shared `used` set (mutated in place) when calling this more than
 * once for the same board, so later calls don't collide with slots claimed
 * by earlier ones.
 */
export function generateOneExitPerColor(
  width: number,
  height: number,
  colors: ColorId[],
  rng: RandomFn,
  used: Set<string> = new Set(),
): Exit[] | null {
  const exits: Exit[] = [];

  for (const colorId of colors) {
    const directionOrder = shuffle(ALL_DIRECTIONS, rng);
    let placed = false;

    for (const direction of directionOrder) {
      const axisSize = orientationForDirection(direction) === 'horizontal' ? height : width;
      const lineIndexOrder = shuffle(
        Array.from({ length: axisSize }, (_, idx) => idx),
        rng,
      );

      for (const lineIndex of lineIndexOrder) {
        const slotKey = `${direction}:${lineIndex}`;
        if (used.has(slotKey)) continue;
        used.add(slotKey);
        exits.push({ direction, lineIndex, colorId });
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) return null;
  }

  return exits;
}

export function placeObstacles(width: number, height: number, count: number, rng: RandomFn): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const occupied = new Set<string>();
  let guard = 0;
  while (obstacles.length < count && guard < count * 50) {
    guard++;
    const row = Math.floor(rng() * height);
    const col = Math.floor(rng() * width);
    const key = cellKey({ row, col });
    if (occupied.has(key)) continue;
    occupied.add(key);
    obstacles.push({ row, col });
  }
  return obstacles;
}
