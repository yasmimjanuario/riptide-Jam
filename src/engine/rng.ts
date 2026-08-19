/** A pure function returning a float in [0, 1), like Math.random. */
export type RandomFn = () => number;

/**
 * Deterministic PRNG (mulberry32). Given the same numeric seed it always
 * produces the same sequence — used so level generation can be reproduced
 * (daily challenge seeds, regression tests) without depending on
 * `Math.random`.
 */
export function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng: RandomFn, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/** Returns a shuffled copy of `items` (Fisher-Yates), leaving the input untouched. */
export function shuffle<T>(items: readonly T[], rng: RandomFn): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickRandom<T>(items: readonly T[], rng: RandomFn): T {
  return items[randomInt(rng, items.length)];
}
