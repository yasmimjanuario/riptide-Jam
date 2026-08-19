import { computeProgress, getAvailableMovesInLevel, isLevelWon, tryMoveEntityInLevel } from './goals';
import type { Board, Level } from './types';

export interface LevelSolveResult {
  solvable: boolean;
  /** Entity ids in an order that reaches a won state. */
  moves: string[] | null;
  statesVisited: number;
}

function stateKey(board: Board): string {
  return board.entities
    .map((e) => e.id)
    .sort()
    .join(',');
}

/**
 * BFS over "which entities remain" states, same shape as `solveBoard` but
 * goal-aware (via `goals.ts`, which gates moves by the currently active
 * colors). This is not used to gate generation — `questGenerator.ts`
 * verifies its own construction directly, which is far cheaper — but it's
 * useful as an independent cross-check in tests, and later as the basis for
 * a real hint system ("what should I tap next").
 *
 * The same monotonic-removal argument that makes `solveBoard` tractable
 * still holds here: removing an entity only ever frees cells and only ever
 * advances (never retracts) which colors are active, so the state space is
 * still just reachable subsets of remaining entities, not full permutations.
 */
export function solveLevel(level: Level, maxStates = 200_000): LevelSolveResult {
  const startProgress = computeProgress(level, level.board.entities);
  if (isLevelWon(level, startProgress)) {
    return { solvable: true, moves: [], statesVisited: 1 };
  }

  const visited = new Set<string>([stateKey(level.board)]);
  const queue: { board: Board; path: string[] }[] = [{ board: level.board, path: [] }];
  let statesVisited = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    statesVisited++;
    if (statesVisited > maxStates) {
      return { solvable: false, moves: null, statesVisited };
    }

    const available = getAvailableMovesInLevel(level, current.board);
    for (const entity of available) {
      const result = tryMoveEntityInLevel(level, current.board, entity.id);
      if (!result.moved) continue; // defensive; available moves already filtered

      const nextPath = [...current.path, entity.id];
      const progress = computeProgress(level, result.board.entities);
      if (isLevelWon(level, progress)) {
        return { solvable: true, moves: nextPath, statesVisited: statesVisited + 1 };
      }

      const key = stateKey(result.board);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ board: result.board, path: nextPath });
      }
    }
  }

  return { solvable: false, moves: null, statesVisited };
}

export function isLevelSolvable(level: Level): boolean {
  return solveLevel(level).solvable;
}

/**
 * Note: unlike the plain (non-goal) engine, "take any available move" is
 * *not* a valid shortcut for checking solvability here, and there's no
 * cheap exact substitute for the full search below. The reason: several
 * entities of the same color can be simultaneously available (some
 * "required" toward the target, some intentional "overflow"), and picking
 * the wrong ones first can push that color's progress past its target and
 * close its exit *before* a required entity that happens to be blocking a
 * later color's path has been removed — stranding that later color for
 * good. That's a real, intended source of extra deadlock risk (bad play
 * can dead-end a solvable level), not a bug — see `questGenerator.ts`'s
 * canonical-order construction, which sidesteps it by construction. It
 * does mean `solveLevel`'s search can't be swapped for a cheap greedy walk.
 */
