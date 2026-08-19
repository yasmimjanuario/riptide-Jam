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
 *
 * `value` is how much this entity contributes to its color's goal when it
 * exits (see `ColorGoal`) — a bigger piece is typically worth more, the
 * same way a bus carries more than a car in the genre this is drawn from.
 * Plain movement/exit rules never look at `value`; only the goal layer
 * (`goals.ts`) does.
 */
export interface Entity {
  id: string;
  colorId: ColorId;
  length: EntityLength;
  orientation: Orientation;
  direction: Direction;
  row: number;
  col: number;
  value: number;
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

/**
 * A goal for one color in a `Level`: its exit stays open until the total
 * `value` of the entities of that color that have exited reaches `target`.
 * Extra entities of that color beyond what's needed to hit the target are
 * legal (and common) — they just become permanent blockers once the goal
 * closes.
 */
export interface ColorGoal {
  colorId: ColorId;
  target: number;
}

/**
 * A full level: a static `board` (every entity + every goal color's exit,
 * all present from the start — nothing is added later) plus an ordered
 * queue of `goals`.
 *
 * At most `activeSlots` goals are open at once, always the earliest
 * `activeSlots` goals (in queue order) that aren't complete yet. When an
 * open goal completes, its exit closes and the next queued goal takes the
 * freed slot. `board.exits` itself is never mutated — it holds the full,
 * fixed geometry for every goal color for the whole game; which of those
 * exits are currently usable is entirely determined by `goals` + how much
 * of each color has exited so far (see `goals.ts`).
 */
export interface Level {
  board: Board;
  goals: ColorGoal[];
  activeSlots: number;
  /** Total value of each color present in the level at the start (required + any overflow). */
  initialValueByColor: Record<ColorId, number>;
}

export type LevelStatus = 'playing' | 'won' | 'deadlock';
