import { describe, expect, it } from 'vitest';
import { isSolvable, solveBoard } from '../solver';
import type { Board, Entity } from '../types';

function board(overrides: Partial<Board>): Board {
  return { width: 4, height: 4, entities: [], obstacles: [], exits: [], ...overrides };
}

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

describe('solveBoard', () => {
  it('solves an already-empty board trivially', () => {
    const result = solveBoard(board({}));
    expect(result.solvable).toBe(true);
    expect(result.moves).toEqual([]);
  });

  it('finds the forced order for a queued pair blocking each other', () => {
    const blocker = entity({ id: 'blocker', colorId: 'red', col: 3 });
    const mover = entity({ id: 'mover', colorId: 'red', col: 1 });
    const b = board({
      entities: [blocker, mover],
      exits: [{ direction: 'right', lineIndex: 0, colorId: 'red' }],
    });

    const result = solveBoard(b);
    expect(result.solvable).toBe(true);
    expect(result.moves).toEqual(['blocker', 'mover']);
  });

  it('reports an unsolvable board when an entity has no matching exit at all', () => {
    const stuck = entity({ id: 'stuck', colorId: 'green', col: 3 });
    const b = board({ entities: [stuck], exits: [{ direction: 'right', lineIndex: 0, colorId: 'red' }] });

    const result = solveBoard(b);
    expect(result.solvable).toBe(false);
    expect(result.moves).toBeNull();
  });

  it('reports an unsolvable board on a true deadlock (mutual, unrelated blockers)', () => {
    const a = entity({ id: 'a', colorId: 'red', row: 0, col: 0 });
    const wall = entity({
      id: 'wall',
      colorId: 'blue',
      orientation: 'vertical',
      direction: 'down',
      row: 0,
      col: 1,
      length: 1,
    });
    const b = board({ entities: [a, wall], exits: [] });

    expect(isSolvable(b)).toBe(false);
  });

  it('handles independent entities exiting in either order', () => {
    const a = entity({ id: 'a', colorId: 'red', row: 0, col: 0 });
    const c = entity({ id: 'c', colorId: 'blue', row: 1, col: 0 });
    const b = board({
      entities: [a, c],
      exits: [
        { direction: 'right', lineIndex: 0, colorId: 'red' },
        { direction: 'right', lineIndex: 1, colorId: 'blue' },
      ],
    });

    const result = solveBoard(b);
    expect(result.solvable).toBe(true);
    expect(result.moves).toHaveLength(2);
    expect(new Set(result.moves)).toEqual(new Set(['a', 'c']));
  });
});
