// Data behind the "hit ratio vs cache size" chart. Nothing here is hand-drawn:
// it is produced by a small seeded simulation, so the numbers are reproducible.
//
// Model: an LRU cache in front of N keys. Requests follow either a Zipf
// distribution (a few keys are very popular) or a uniform one (every key equally
// likely). The same request sequence is replayed for every cache size.

export const PARAMS = {
  keys: 10_000,
  skew: 1.0,
  requests: 200_000,
  warmup: 20_000, // requests used to fill the cache, not counted
  seed: 7,
  sizesPct: [1, 2, 5, 10, 20, 30, 50],
};

export interface CurvePoint {
  pct: number; // cache size as a percentage of all keys
  zipf: number; // hit ratio, 0 to 1
  uniform: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function zipfSequence(n: number, skew: number, count: number, rand: () => number): Int32Array {
  const cdf = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += 1 / Math.pow(i + 1, skew);
    cdf[i] = sum;
  }
  const out = new Int32Array(count);
  for (let r = 0; r < count; r++) {
    const u = rand() * sum;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    out[r] = lo;
  }
  return out;
}

function uniformSequence(n: number, count: number, rand: () => number): Int32Array {
  const out = new Int32Array(count);
  for (let r = 0; r < count; r++) out[r] = Math.floor(rand() * n);
  return out;
}

function lruHitRatio(seq: Int32Array, capacity: number, warmup: number): number {
  const cache = new Map<number, true>(); // Map keeps insertion order: first key = least recently used
  let hits = 0;
  for (let i = 0; i < seq.length; i++) {
    const k = seq[i];
    const hit = cache.has(k);
    if (hit) cache.delete(k);
    else if (cache.size >= capacity) cache.delete(cache.keys().next().value as number);
    cache.set(k, true);
    if (i >= warmup && hit) hits++;
  }
  return hits / (seq.length - warmup);
}

let memo: CurvePoint[] | null = null;

export function getCurve(): CurvePoint[] {
  if (memo) return memo;
  const { keys, skew, requests, warmup, seed, sizesPct } = PARAMS;
  const zipf = zipfSequence(keys, skew, requests, mulberry32(seed));
  const uniform = uniformSequence(keys, requests, mulberry32(seed + 1));
  memo = sizesPct.map((pct) => {
    const cap = Math.round((keys * pct) / 100);
    return {
      pct,
      zipf: lruHitRatio(zipf, cap, warmup),
      uniform: lruHitRatio(uniform, cap, warmup),
    };
  });
  return memo;
}
