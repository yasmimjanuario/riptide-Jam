import { describe, expect, it } from 'vitest';
import {
  canExitInLevel,
  computeProgress,
  getActiveColorIds,
  getAvailableMovesInLevel,
  getLevelStatus,
  isGoalComplete,
  isLevelWon,
  tryMoveEntityInLevel,
} from '../goals';
import type { Board, ColorGoal, Entity, Level } from '../types';

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: 'e',
    colorId: 'red',
    length: 1,
    orientation: 'horizontal',
    direction: 'right',
    row: 0,
    col: 0,
    value: 1,
    ...overrides,
  };
}

function makeLevel(
  entities: Entity[],
  goals: ColorGoal[],
  activeSlots: number,
  exits?: Board['exits'],
): Level {
  const initialValueByColor: Record<string, number> = {};
  for (const e of entities) initialValueByColor[e.colorId] = (initialValueByColor[e.colorId] ?? 0) + e.value;

  const board: Board = {
    width: 5,
    height: 5,
    entities,
    obstacles: [],
    exits: exits ?? goals.map((g, i) => ({ direction: 'right' as const, lineIndex: i, colorId: g.colorId })),
  };
  return { board, goals, activeSlots, initialValueByColor };
}

describe('computeProgress / isGoalComplete', () => {
  it('derives removed value from which entities are still present', () => {
    const red1 = entity({ id: 'red1', colorId: 'red', row: 0, value: 3 });
    const red2 = entity({ id: 'red2', colorId: 'red', row: 0, col: 3, value: 4 });
    const level = makeLevel([red1, red2], [{ colorId: 'red', target: 5 }], 1);

    const beforeAny = computeProgress(level, [red1, red2]);
    expect(beforeAny.removedValueByColor.red).toBe(0);

    const afterRed1Exits = computeProgress(level, [red2]);
    expect(afterRed1Exits.removedValueByColor.red).toBe(3);
    expect(isGoalComplete(level.goals[0], afterRed1Exits)).toBe(false);

    const afterBothExit = computeProgress(level, []);
    expect(afterBothExit.removedValueByColor.red).toBe(7);
    expect(isGoalComplete(level.goals[0], afterBothExit)).toBe(true);
  });
});

describe('getActiveColorIds', () => {
  it('only opens the earliest activeSlots incomplete goals in queue order', () => {
    const goals: ColorGoal[] = [
      { colorId: 'red', target: 2 },
      { colorId: 'blue', target: 2 },
      { colorId: 'green', target: 2 },
    ];
    const level = makeLevel([], goals, 2);
    const freshProgress = computeProgress(level, []);
    expect(getActiveColorIds(level, freshProgress)).toEqual(new Set(['red', 'blue']));
  });

  it('slides the window forward as the active goals complete, in queue order', () => {
    const goals: ColorGoal[] = [
      { colorId: 'red', target: 2 },
      { colorId: 'blue', target: 2 },
      { colorId: 'green', target: 2 },
    ];
    const level = makeLevel([], goals, 2);
    const redDone = { removedValueByColor: { red: 2, blue: 0, green: 0 } };
    expect(getActiveColorIds(level, redDone)).toEqual(new Set(['blue', 'green']));
  });

  it('a caller-provided activeSlots override widens the window without mutating the level', () => {
    const goals: ColorGoal[] = [
      { colorId: 'red', target: 2 },
      { colorId: 'blue', target: 2 },
      { colorId: 'green', target: 2 },
    ];
    const level = makeLevel([], goals, 2);
    const fresh = { removedValueByColor: {} };
    expect(getActiveColorIds(level, fresh, 3)).toEqual(new Set(['red', 'blue', 'green']));
    expect(level.activeSlots).toBe(2);
  });
});

describe('canExitInLevel / tryMoveEntityInLevel', () => {
  it('blocks an entity whose color is not yet active, even with a clear geometric path', () => {
    const red = entity({ id: 'red1', colorId: 'red', row: 0, col: 3, value: 5 });
    const blue = entity({ id: 'blue1', colorId: 'blue', row: 1, col: 3, value: 5 });
    const level = makeLevel([red, blue], [{ colorId: 'red', target: 5 }, { colorId: 'blue', target: 5 }], 1);

    expect(canExitInLevel(level, level.board, red)).toBe(true);
    expect(canExitInLevel(level, level.board, blue)).toBe(false); // blue isn't active yet (slot=1)

    const result = tryMoveEntityInLevel(level, level.board, 'blue1');
    expect(result.moved).toBe(false);
    expect(result.board).toBe(level.board);
  });

  it('activates the next queued color once the current one completes', () => {
    const red = entity({ id: 'red1', colorId: 'red', row: 0, col: 3, value: 5 });
    const blue = entity({ id: 'blue1', colorId: 'blue', row: 1, col: 3, value: 5 });
    const level = makeLevel([red, blue], [{ colorId: 'red', target: 5 }, { colorId: 'blue', target: 5 }], 1);

    const afterRed = tryMoveEntityInLevel(level, level.board, 'red1');
    expect(afterRed.moved).toBe(true);

    const afterBlue = tryMoveEntityInLevel(level, afterRed.board, 'blue1');
    expect(afterBlue.moved).toBe(true);

    expect(isLevelWon(level, computeProgress(level, afterBlue.board.entities))).toBe(true);
  });

  it('leftover value beyond the target still completes the goal (quota, not headcount)', () => {
    const a = entity({ id: 'a', colorId: 'red', row: 0, col: 3, value: 3 });
    const b = entity({ id: 'b', colorId: 'red', row: 1, col: 3, value: 3 });
    // Two independent same-color exits so a/b don't geometrically block each
    // other — isolates the quota behavior from queueing.
    const exits: Board['exits'] = [
      { direction: 'right', lineIndex: 0, colorId: 'red' },
      { direction: 'right', lineIndex: 1, colorId: 'red' },
    ];
    // target is 5, but a+b = 6 — only one of them is strictly required.
    const level = makeLevel([a, b], [{ colorId: 'red', target: 5 }], 1, exits);

    const afterA = tryMoveEntityInLevel(level, level.board, 'a');
    expect(afterA.moved).toBe(true);
    const progress = computeProgress(level, afterA.board.entities);
    expect(progress.removedValueByColor.red).toBe(3);
    expect(isGoalComplete(level.goals[0], progress)).toBe(false); // 3 < 5, b still needed

    const afterB = tryMoveEntityInLevel(level, afterA.board, 'b');
    expect(afterB.moved).toBe(true);
    expect(isLevelWon(level, computeProgress(level, afterB.board.entities))).toBe(true);
  });
});

describe('getLevelStatus', () => {
  it('reports deadlock when the only movable entities belong to inactive colors', () => {
    // blue's exit is geometrically clear, but blue is not in the active window.
    const blue = entity({ id: 'blue1', colorId: 'blue', row: 1, col: 3, value: 5 });
    const level = makeLevel([blue], [{ colorId: 'red', target: 5 }, { colorId: 'blue', target: 5 }], 1);
    expect(getAvailableMovesInLevel(level, level.board)).toHaveLength(0);
    expect(getLevelStatus(level, level.board)).toBe('deadlock');
  });

  it('reports won once every goal is complete, even with entities still on the board', () => {
    const red = entity({ id: 'red1', colorId: 'red', row: 0, col: 3, value: 5 });
    // an already-complete color's leftover entity has no bearing on status.
    const leftoverBlue = entity({ id: 'blue1', colorId: 'blue', row: 2, col: 3, value: 1 });
    const level = makeLevel(
      [red, leftoverBlue],
      [{ colorId: 'red', target: 5 }, { colorId: 'blue', target: 0 }],
      2,
    );
    const afterRed = tryMoveEntityInLevel(level, level.board, 'red1');
    expect(getLevelStatus(level, afterRed.board)).toBe('won');
  });
});
