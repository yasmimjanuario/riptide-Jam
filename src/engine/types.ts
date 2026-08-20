/**
 * Pure puzzle engine — core types.
 *
 * This module (and everything under `engine/`) is intentionally theme-agnostic:
 * it knows about "entities" and "pieces" on a grid, never about "fish" or
 * "tanks". The UI layer is responsible for painting these generic concepts as
 * an aquarium. This keeps the engine trivially portable (e.g. to React
 * Native later) and easy to reskin.
 */

/** The four cardinal directions an entity can swim/travel. */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** An entity is either laid out horizontally or vertically on the grid. */
export type Orientation = 'horizontal' | 'vertical';

/** Length in cells. Kept intentionally narrow to match design intent (1-3). */
export type EntityLength = 1 | 2 | 3;

/** Opaque color identifier. The engine never assigns meaning to these. */
export type ColorId = string;

/** A single grid coordinate. Row/col are zero-indexed from the top-left. */
export interface Cell {
  row: number;
  col: number;
}

/**
 * A movable piece on the board ("fish" in the UI layer).
 *
 * `row`/`col` is the anchor cell: for a horizontal piece it's the leftmost
 * cell (row fixed, col is the anchor); for a vertical piece it's the topmost
 * cell (col fixed, row is the anchor). The piece occupies `length`
 * consecutive cells starting at the anchor.
 *
 * `direction` is fixed at generation time and never changes during play —
 * it must be consistent with `orientation`:
 *   - horizontal → 'left' | 'right'
 *   - vertical   → 'up' | 'down'
 */
export interface Entity {
  id: string;
  colorId: ColorId;
  length: EntityLength;
  orientation: Orientation;
  direction: Direction;
  row: number;
  col: number;
}

/** A fixed, immovable single-cell blocker ("coral"/"rock" in the UI layer). */
export interface Obstacle {
  row: number;
  col: number;
}

/**
 * A colored opening in the tank wall. An entity can only leave through an
 * exit that matches its fixed `direction`, sits on the same `lineIndex`
 * (the row for a left/right exit, the column for an up/down exit), and
 * shares its `colorId`.
 */
export interface Exit {
  direction: Direction;
  lineIndex: number;
  colorId: ColorId;
}

/** The full puzzle state: dimensions, remaining entities, obstacles, exits. */
export interface Board {
  width: number;
  height: number;
  entities: Entity[];
  obstacles: Obstacle[];
  exits: Exit[];
}

/** Result of attempting to move a single entity. */
export interface MoveResult {
  board: Board;
  moved: boolean;
  /** id of the entity that left the board, if `moved` is true. */
  exitedEntityId?: string;
}

export type BoardStatus = 'playing' | 'won' | 'deadlock';
