import { cellKey, getEntityCells, getPathCells, getTravelLineIndex } from './grid';
import type { Board, BoardStatus, Entity, MoveResult } from './types';

/** Builds a lookup set of every cell currently occupied by an entity or obstacle. */
export function buildOccupancy(board: Board, excludeEntityId?: string): Set<string> {
  const occupied = new Set<string>();
  for (const entity of board.entities) {
    if (entity.id === excludeEntityId) continue;
    for (const cell of getEntityCells(entity)) occupied.add(cellKey(cell));
  }
  for (const obstacle of board.obstacles) {
    occupied.add(cellKey(obstacle));
  }
  return occupied;
}

/**
 * Whether every cell between `entity` and the board edge (in its fixed swim
 * direction) is free of other entities and obstacles.
 */
export function isPathClear(board: Board, entity: Entity): boolean {
  const occupied = buildOccupancy(board, entity.id);
  const path = getPathCells(entity, board.width, board.height);
  return path.every((cell) => !occupied.has(cellKey(cell)));
}

/** Whether there is a colored exit matching this entity's direction, line and color. */
export function hasMatchingExit(board: Board, entity: Entity): boolean {
  const lineIndex = getTravelLineIndex(entity);
  return board.exits.some(
    (exit) =>
      exit.direction === entity.direction &&
      exit.lineIndex === lineIndex &&
      exit.colorId === entity.colorId,
  );
}

/** Whether this entity can leave the board right now. */
export function canExit(board: Board, entity: Entity): boolean {
  return hasMatchingExit(board, entity) && isPathClear(board, entity);
}

/** All entities on the board that can currently exit. */
export function getAvailableMoves(board: Board): Entity[] {
  return board.entities.filter((entity) => canExit(board, entity));
}

/**
 * Attempts to move (exit) the entity with the given id.
 *
 * If the move is legal, returns a new board with that entity removed. If
 * not, returns the original board unchanged with `moved: false` — this is
 * the "blocked" case the UI should render as a shake/bubble, and it must
 * never cost the player a life on its own.
 */
export function tryMoveEntity(board: Board, entityId: string): MoveResult {
  const entity = board.entities.find((e) => e.id === entityId);
  if (!entity || !canExit(board, entity)) {
    return { board, moved: false };
  }
  const nextBoard: Board = {
    ...board,
    entities: board.entities.filter((e) => e.id !== entityId),
  };
  return { board: nextBoard, moved: true, exitedEntityId: entityId };
}

/** True once every entity has left the board. */
export function isSolved(board: Board): boolean {
  return board.entities.length === 0;
}

/**
 * True when entities remain but none of them can currently exit — an
 * unrecoverable dead end that should cost the player a life.
 */
export function isDeadlock(board: Board): boolean {
  return board.entities.length > 0 && getAvailableMoves(board).length === 0;
}

export function getBoardStatus(board: Board): BoardStatus {
  if (isSolved(board)) return 'won';
  if (isDeadlock(board)) return 'deadlock';
  return 'playing';
}
