import { tryMoveEntity, getAvailableMoves, isSolved } from './rules';
import type { Board } from './types';

export interface SolveResult {
  solvable: boolean;
  /** Entity ids in the order they must exit to clear the board. */
  moves: string[] | null;
  /** Number of distinct board states visited during the search. */
  statesVisited: number;
}

/**
 * A stable key for a board state: the set of entity ids still remaining.
 * Obstacles and exits never change during play, so remaining-entity-ids
 * fully identifies a reachable state.
 */
function stateKey(board: Board): string {
  return board.entities
    .map((e) => e.id)
    .sort()
    .join(',');
}

/**
 * Determines whether a board is solvable and, if so, a valid exit order,
 * via BFS over the space of "which entities remain" states.
 *
 * Note on correctness/performance: removing an entity only ever frees up
 * cells, never occupies new ones, so blocking relationships are monotonic —
 * if entity A can exit given some set of remaining entities, it can still
 * exit after any subset of *other* entities has also left. That means the
 * order in which currently-available moves are taken never forecloses a
 * later solution, so this BFS never needs to backtrack past a dead branch
 * that a different move order would have avoided: the first states to reach
 * an empty board are reached the fastest, and any state with zero available
 * moves while entities remain is a genuine, order-independent deadlock. In
 * practice this keeps the explored state space small (bounded by the
 * number of distinct "which pieces have left" prefixes, not the full
 * subset powerset), even though the algorithm below stays a general BFS so
 * it keeps working if future rules variants (e.g. movable obstacles) break
 * that monotonicity.
 */
export function solveBoard(board: Board, maxStates = 200_000): SolveResult {
  const startKey = stateKey(board);
  if (isSolved(board)) {
    return { solvable: true, moves: [], statesVisited: 1 };
  }

  const visited = new Set<string>([startKey]);
  const queue: { board: Board; path: string[] }[] = [{ board, path: [] }];
  let statesVisited = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    statesVisited++;
    if (statesVisited > maxStates) {
      return { solvable: false, moves: null, statesVisited };
    }

    const available = getAvailableMoves(current.board);
    for (const entity of available) {
      const result = tryMoveEntity(current.board, entity.id);
      if (!result.moved) continue; // defensive; getAvailableMoves already filters
      const nextPath = [...current.path, entity.id];
      if (isSolved(result.board)) {
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

/** Convenience: true iff the board has at least one valid full solution. */
export function isSolvable(board: Board): boolean {
  return solveBoard(board).solvable;
}
