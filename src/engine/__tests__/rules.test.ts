import { describe, expect, it } from 'vitest';
import { canExit, getAvailableMoves, getBoardStatus, isDeadlock, isPathClear, isSolved, tryMoveEntity } from '../rules';
import type { Board, Entity } from '../types';

function board(overrides: Partial<Board>): Board {
  return {
    width: 4,
    height: 4,
    entities: [],
    obstacles: [],
    exits: [],
    ...overrides,
  };
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

describe('isPathClear', () => {
  it('is true when nothing sits between the entity and the edge', () => {
    const b = board({ entities: [entity({ id: 'a', col: 3 })] });
    expect(isPathClear(b, b.entities[0])).toBe(true);
  });

  it('is false when another entity blocks the path', () => {
    const blocker = entity({ id: 'blocker', col: 3 });
    const mover = entity({ id: 'mover', col: 1 });
    const b = board({ entities: [blocker, mover] });
    expect(isPathClear(b, mover)).toBe(false);
  });

  it('is false when a fixed obstacle blocks the path', () => {
    const mover = entity({ id: 'mover', col: 0 });
    const b = board({ entities: [mover], obstacles: [{ row: 0, col: 2 }] });
    expect(isPathClear(b, mover)).toBe(false);
  });
});

describe('canExit', () => {
  it('requires both a clear path and a matching colored exit', () => {
    const mover = entity({ id: 'mover', colorId: 'red', col: 3 });
    const withExit = board({ entities: [mover], exits: [{ direction: 'right', lineIndex: 0, colorId: 'red' }] });
    expect(canExit(withExit, mover)).toBe(true);

    const wrongColor = board({ entities: [mover], exits: [{ direction: 'right', lineIndex: 0, colorId: 'blue' }] });
    expect(canExit(wrongColor, mover)).toBe(false);

    const noExit = board({ entities: [mover], exits: [] });
    expect(canExit(noExit, mover)).toBe(false);
  });
});

describe('tryMoveEntity', () => {
  const exits = [{ direction: 'right' as const, lineIndex: 0, colorId: 'red' }];

  it('removes the entity and reports moved:true when the move is legal', () => {
    const mover = entity({ id: 'mover', colorId: 'red', col: 3 });
    const b = board({ entities: [mover], exits });
    const result = tryMoveEntity(b, 'mover');
    expect(result.moved).toBe(true);
    expect(result.exitedEntityId).toBe('mover');
    expect(result.board.entities).toEqual([]);
  });

  it('leaves the board unchanged and reports moved:false when blocked', () => {
    const blocker = entity({ id: 'blocker', colorId: 'blue', col: 3 });
    const mover = entity({ id: 'mover', colorId: 'red', col: 1 });
    const b = board({ entities: [blocker, mover], exits });
    const result = tryMoveEntity(b, 'mover');
    expect(result.moved).toBe(false);
    expect(result.board).toBe(b);
    expect(result.board.entities).toHaveLength(2);
  });

  it('is a no-op for an unknown entity id', () => {
    const b = board({ entities: [] });
    const result = tryMoveEntity(b, 'ghost');
    expect(result.moved).toBe(false);
    expect(result.board).toBe(b);
  });

  it('freeing the blocker unblocks the queued entity behind it', () => {
    const blocker = entity({ id: 'blocker', colorId: 'red', col: 3 });
    const mover = entity({ id: 'mover', colorId: 'red', col: 1 });
    const b = board({ entities: [blocker, mover], exits });

    expect(canExit(b, mover)).toBe(false);
    const afterBlockerLeaves = tryMoveEntity(b, 'blocker').board;
    expect(canExit(afterBlockerLeaves, mover)).toBe(true);
  });
});

describe('win and deadlock detection', () => {
  it('an empty board is solved', () => {
    const b = board({ entities: [] });
    expect(isSolved(b)).toBe(true);
    expect(isDeadlock(b)).toBe(false);
    expect(getBoardStatus(b)).toBe('won');
  });

  it('a board with a legal move is still playing', () => {
    const mover = entity({ id: 'mover', colorId: 'red', col: 3 });
    const b = board({ entities: [mover], exits: [{ direction: 'right', lineIndex: 0, colorId: 'red' }] });
    expect(getAvailableMoves(b)).toHaveLength(1);
    expect(getBoardStatus(b)).toBe('playing');
  });

  it('flags a deadlock when entities remain but none can exit', () => {
    // Two entities mutually block each other and neither has a matching exit.
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
    expect(getAvailableMoves(b)).toHaveLength(0);
    expect(isDeadlock(b)).toBe(true);
    expect(getBoardStatus(b)).toBe('deadlock');
  });
});
