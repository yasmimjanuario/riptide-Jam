import { describe, expect, it } from 'vitest';
import { generateQuestLevel } from '../questGenerator';
import { solveLevel } from '../questSolver';
import { getEntityCells } from '../grid';

const COLORS = [
  'coral-pink',
  'turquoise',
  'sun-yellow',
  'algae-green',
  'sea-lavender',
  'clownfish-orange',
  'deep-blue',
  'berry-red',
];

const BASE_CONFIG = {
  width: 10,
  height: 10,
  colors: COLORS,
  goalCount: 5,
  activeSlots: 3,
  obstacleCount: 2,
} as const;

describe('generateQuestLevel', () => {
  it('always produces a level, across many seeds — generation itself is the solvability proof', () => {
    // generateQuestLevel only ever returns non-null after internally
    // replaying its own canonical solution through the real rules and
    // confirming it wins (see questGenerator.ts's verifyCanonicalSolution) —
    // a non-null level here already *is* the solvability guarantee. A full
    // BFS re-check (solveLevel) is exact but exponential-worst-case, so it's
    // reserved for the dedicated small-level cross-check test below rather
    // than run across every seed's ~20-entity level.
    for (let seed = 0; seed < 25; seed++) {
      const { level } = generateQuestLevel({ ...BASE_CONFIG, seed });
      expect(level).not.toBeNull();
    }
  });

  it('is deterministic for a given seed', () => {
    const config = { ...BASE_CONFIG, seed: 42 };
    const first = generateQuestLevel(config);
    const second = generateQuestLevel(config);
    expect(first.level).toEqual(second.level);
  });

  it('has exactly goalCount goals and exitsPerGoal exits per goal color, all on unique wall slots', () => {
    const { level } = generateQuestLevel({ ...BASE_CONFIG, seed: 5 });
    expect(level).not.toBeNull();
    const l = level!;
    expect(l.goals).toHaveLength(5);
    expect(l.board.exits).toHaveLength(5 * 4); // default exitsPerGoal = 4

    const goalColorIds = new Set(l.goals.map((g) => g.colorId));
    expect(goalColorIds.size).toBe(5); // no duplicate goal colors

    const exitsPerColor = new Map<string, number>();
    const slots = new Set<string>();
    for (const exit of l.board.exits) {
      const key = `${exit.direction}:${exit.lineIndex}`;
      expect(slots.has(key)).toBe(false);
      slots.add(key);
      expect(goalColorIds.has(exit.colorId)).toBe(true);
      exitsPerColor.set(exit.colorId, (exitsPerColor.get(exit.colorId) ?? 0) + 1);
    }
    for (const colorId of goalColorIds) {
      expect(exitsPerColor.get(colorId)).toBe(4);
    }
  });

  it('every entity belongs to a goal color and carries a positive value', () => {
    const { level } = generateQuestLevel({ ...BASE_CONFIG, seed: 11 });
    expect(level).not.toBeNull();
    const l = level!;
    const goalColorIds = new Set(l.goals.map((g) => g.colorId));

    for (const entity of l.board.entities) {
      expect(goalColorIds.has(entity.colorId)).toBe(true);
      expect(entity.value).toBeGreaterThan(0);
    }
  });

  it('places enough value per color to reach its target (initialValueByColor >= target)', () => {
    const { level } = generateQuestLevel({ ...BASE_CONFIG, seed: 3 });
    expect(level).not.toBeNull();
    const l = level!;
    for (const goal of l.goals) {
      expect(l.initialValueByColor[goal.colorId]).toBeGreaterThanOrEqual(goal.target);
    }
  });

  it('has no overlapping entities/obstacles anywhere on the board', () => {
    const { level } = generateQuestLevel({ ...BASE_CONFIG, seed: 21 });
    expect(level).not.toBeNull();
    const l = level!;
    const occupied = new Map<string, string>();

    for (const entity of l.board.entities) {
      for (const cell of getEntityCells(entity)) {
        const key = `${cell.row},${cell.col}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, entity.id);
      }
    }
    for (const obstacle of l.board.obstacles) {
      const key = `${obstacle.row},${obstacle.col}`;
      expect(occupied.has(key)).toBe(false);
    }
  });

  it('a smaller level cross-checks against the independent BFS solver', () => {
    const { level } = generateQuestLevel({
      width: 7,
      height: 7,
      colors: COLORS,
      goalCount: 3,
      activeSlots: 2,
      obstacleCount: 1,
      minTarget: 3,
      maxTarget: 5,
      seed: 77,
    });
    expect(level).not.toBeNull();
    const result = solveLevel(level!);
    expect(result.solvable).toBe(true);
    expect(result.moves).not.toBeNull();
  });

  it('returns null instead of an invalid level when the request cannot possibly fit', () => {
    const { level } = generateQuestLevel({
      width: 3,
      height: 3,
      colors: COLORS,
      goalCount: 8,
      activeSlots: 3,
      maxTarget: 30,
      minTarget: 20,
      maxAttempts: 5,
    });
    expect(level).toBeNull();
  });
});
