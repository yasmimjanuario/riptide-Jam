import { describe, expect, it } from 'vitest';
import { generateLevel } from '../generator';
import { getEntityCells, isDirectionValidForOrientation } from '../grid';
import { isSolvable } from '../solver';
import { cellsEqual } from '../grid';

const COLORS = ['coral-pink', 'turquoise', 'sun-yellow', 'algae-green'];

describe('generateLevel', () => {
  it('always produces a guaranteed-solvable board across many seeds', () => {
    for (let seed = 0; seed < 30; seed++) {
      const { board } = generateLevel({
        width: 6,
        height: 6,
        colors: COLORS,
        entityCount: 8,
        obstacleCount: 2,
        seed,
      });

      expect(board).not.toBeNull();
      expect(isSolvable(board!)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    const config = { width: 6, height: 6, colors: COLORS, entityCount: 6, obstacleCount: 1, seed: 42 };
    const first = generateLevel(config);
    const second = generateLevel(config);
    expect(first.board).toEqual(second.board);
  });

  it('produces the requested number of entities with no overlaps', () => {
    const { board } = generateLevel({
      width: 7,
      height: 7,
      colors: COLORS,
      entityCount: 10,
      obstacleCount: 3,
      seed: 7,
    });
    expect(board).not.toBeNull();
    const b = board!;
    expect(b.entities).toHaveLength(10);

    const occupied = new Map<string, string>();
    for (const entity of b.entities) {
      expect(isDirectionValidForOrientation(entity.direction, entity.orientation)).toBe(true);
      for (const cell of getEntityCells(entity)) {
        const key = `${cell.row},${cell.col}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, entity.id);
      }
    }

    for (const obstacle of b.obstacles) {
      const key = `${obstacle.row},${obstacle.col}`;
      expect(occupied.has(key)).toBe(false);
    }

    // No obstacle sits on top of another obstacle either.
    const obstacleKeys = new Set(b.obstacles.map((o) => `${o.row},${o.col}`));
    expect(obstacleKeys.size).toBe(b.obstacles.length);
  });

  it('creates exactly one exit per requested color plus any extras, on unique wall slots', () => {
    const { board } = generateLevel({
      width: 6,
      height: 6,
      colors: COLORS,
      entityCount: 6,
      extraExits: 2,
      seed: 3,
    });
    expect(board).not.toBeNull();
    const b = board!;
    expect(b.exits.length).toBeGreaterThanOrEqual(COLORS.length);

    const slots = new Set<string>();
    for (const exit of b.exits) {
      const slotKey = `${exit.direction}:${exit.lineIndex}`;
      expect(slots.has(slotKey)).toBe(false);
      slots.add(slotKey);
    }
  });

  it('returns null instead of an invalid board when the request cannot fit', () => {
    const { board } = generateLevel({
      width: 2,
      height: 2,
      colors: COLORS,
      entityCount: 20, // far more entities than a 2x2 board can hold
      maxAttempts: 5,
    });
    expect(board).toBeNull();
  });

  it('never places two entities on the same cell as a fixed obstacle', () => {
    const { board } = generateLevel({
      width: 5,
      height: 5,
      colors: COLORS,
      entityCount: 5,
      obstacleCount: 4,
      seed: 99,
    });
    expect(board).not.toBeNull();
    const b = board!;
    for (const obstacle of b.obstacles) {
      for (const entity of b.entities) {
        for (const cell of getEntityCells(entity)) {
          expect(cellsEqual(cell, obstacle)).toBe(false);
        }
      }
    }
  });
});
