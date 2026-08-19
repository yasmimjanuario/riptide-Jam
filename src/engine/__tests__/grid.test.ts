import { describe, expect, it } from 'vitest';
import {
  getEntityCells,
  getFrontCell,
  getPathCells,
  getTravelLineIndex,
  isDirectionValidForOrientation,
  orientationForDirection,
} from '../grid';
import type { Entity } from '../types';

function makeEntity(overrides: Partial<Entity>): Entity {
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

describe('orientationForDirection', () => {
  it('maps left/right to horizontal and up/down to vertical', () => {
    expect(orientationForDirection('left')).toBe('horizontal');
    expect(orientationForDirection('right')).toBe('horizontal');
    expect(orientationForDirection('up')).toBe('vertical');
    expect(orientationForDirection('down')).toBe('vertical');
  });
});

describe('isDirectionValidForOrientation', () => {
  it('rejects mismatched orientation/direction pairs', () => {
    expect(isDirectionValidForOrientation('right', 'horizontal')).toBe(true);
    expect(isDirectionValidForOrientation('up', 'horizontal')).toBe(false);
    expect(isDirectionValidForOrientation('down', 'vertical')).toBe(true);
    expect(isDirectionValidForOrientation('left', 'vertical')).toBe(false);
  });
});

describe('getEntityCells', () => {
  it('lays out a horizontal entity across consecutive columns', () => {
    const entity = makeEntity({ orientation: 'horizontal', direction: 'right', row: 2, col: 1, length: 3 });
    expect(getEntityCells(entity)).toEqual([
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
  });

  it('lays out a vertical entity across consecutive rows', () => {
    const entity = makeEntity({ orientation: 'vertical', direction: 'down', row: 0, col: 3, length: 2 });
    expect(getEntityCells(entity)).toEqual([
      { row: 0, col: 3 },
      { row: 1, col: 3 },
    ]);
  });
});

describe('getFrontCell', () => {
  it('picks the rightmost cell for direction right', () => {
    const entity = makeEntity({ direction: 'right', row: 1, col: 2, length: 3 });
    expect(getFrontCell(entity)).toEqual({ row: 1, col: 4 });
  });

  it('picks the leftmost cell for direction left', () => {
    const entity = makeEntity({ orientation: 'horizontal', direction: 'left', row: 1, col: 2, length: 3 });
    expect(getFrontCell(entity)).toEqual({ row: 1, col: 2 });
  });

  it('picks the bottommost cell for direction down', () => {
    const entity = makeEntity({ orientation: 'vertical', direction: 'down', row: 0, col: 0, length: 3 });
    expect(getFrontCell(entity)).toEqual({ row: 2, col: 0 });
  });

  it('picks the topmost cell for direction up', () => {
    const entity = makeEntity({ orientation: 'vertical', direction: 'up', row: 0, col: 0, length: 3 });
    expect(getFrontCell(entity)).toEqual({ row: 0, col: 0 });
  });
});

describe('getPathCells', () => {
  it('returns the cells between the front and the right edge, nearest first', () => {
    const entity = makeEntity({ direction: 'right', row: 0, col: 0, length: 1 });
    expect(getPathCells(entity, 4, 4)).toEqual([
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ]);
  });

  it('returns an empty path when the entity is already flush against its edge', () => {
    const entity = makeEntity({ direction: 'right', row: 0, col: 3, length: 1 });
    expect(getPathCells(entity, 4, 4)).toEqual([]);
  });

  it('returns the cells toward the top edge for direction up', () => {
    const entity = makeEntity({ orientation: 'vertical', direction: 'up', row: 2, col: 0, length: 1 });
    expect(getPathCells(entity, 4, 4)).toEqual([
      { row: 1, col: 0 },
      { row: 0, col: 0 },
    ]);
  });
});

describe('getTravelLineIndex', () => {
  it('uses the row for horizontal movers and the column for vertical movers', () => {
    const horizontal = makeEntity({ orientation: 'horizontal', direction: 'right', row: 5, col: 0 });
    const vertical = makeEntity({ orientation: 'vertical', direction: 'down', row: 0, col: 5 });
    expect(getTravelLineIndex(horizontal)).toBe(5);
    expect(getTravelLineIndex(vertical)).toBe(5);
  });
});
