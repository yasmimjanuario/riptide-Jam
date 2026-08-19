import type { Cell, Direction, Entity, Orientation } from './types';

/** The orientation implied by a direction. */
export function orientationForDirection(direction: Direction): Orientation {
  return direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';
}

/** Whether a direction is valid for a given orientation. */
export function isDirectionValidForOrientation(
  direction: Direction,
  orientation: Orientation,
): boolean {
  return orientationForDirection(direction) === orientation;
}

/** All cells currently occupied by an entity, in grid order. */
export function getEntityCells(entity: Entity): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < entity.length; i++) {
    if (entity.orientation === 'horizontal') {
      cells.push({ row: entity.row, col: entity.col + i });
    } else {
      cells.push({ row: entity.row + i, col: entity.col });
    }
  }
  return cells;
}

/**
 * The entity's leading cell in its swim direction — the cell closest to the
 * edge it is trying to exit through.
 */
export function getFrontCell(entity: Entity): Cell {
  switch (entity.direction) {
    case 'right':
      return { row: entity.row, col: entity.col + entity.length - 1 };
    case 'left':
      return { row: entity.row, col: entity.col };
    case 'down':
      return { row: entity.row + entity.length - 1, col: entity.col };
    case 'up':
      return { row: entity.row, col: entity.col };
  }
}

/**
 * The line index an entity travels along: its row for a horizontal
 * (left/right) mover, its column for a vertical (up/down) mover. This is
 * the same axis used to key an `Exit`.
 */
export function getTravelLineIndex(entity: Entity): number {
  return entity.orientation === 'horizontal' ? entity.row : entity.col;
}

/**
 * The cells strictly between the entity's front and the board edge, in
 * travel order (nearest to farthest from the entity). Does not include any
 * cell occupied by the entity itself. This is the path that must be fully
 * clear for the entity to exit.
 */
export function getPathCells(entity: Entity, width: number, height: number): Cell[] {
  const front = getFrontCell(entity);
  const cells: Cell[] = [];
  switch (entity.direction) {
    case 'right':
      for (let c = front.col + 1; c < width; c++) cells.push({ row: front.row, col: c });
      break;
    case 'left':
      for (let c = front.col - 1; c >= 0; c--) cells.push({ row: front.row, col: c });
      break;
    case 'down':
      for (let r = front.row + 1; r < height; r++) cells.push({ row: r, col: front.col });
      break;
    case 'up':
      for (let r = front.row - 1; r >= 0; r--) cells.push({ row: r, col: front.col });
      break;
  }
  return cells;
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function isCellInBounds(cell: Cell, width: number, height: number): boolean {
  return cell.row >= 0 && cell.row < height && cell.col >= 0 && cell.col < width;
}
