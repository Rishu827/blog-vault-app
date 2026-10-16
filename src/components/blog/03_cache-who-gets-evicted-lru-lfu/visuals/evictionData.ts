// Simulators and scenarios for the EvictionStepper. Pure TypeScript, no UI code,
// so every policy can be tested on its own.
//
// Display convention: slots are listed from "next to be evicted" (left) to
// "safest" (right), the same way for every policy.

export type PolicyId = 'fifo' | 'lru' | 'lfu' | 'midpoint';

export interface Slot {
  key: string;
  note?: string; // e.g. "×3" for LFU, "young" / "old" for the midpoint list
}

export interface AccessResult {
  hit: boolean;
  evicted: string | null;
}

export interface Policy {
  access(key: string): AccessResult;
  slots(): Slot[];
}

export const POLICY_LABEL: Record<PolicyId, string> = {
  fifo: 'FIFO',
  lru: 'LRU',
  lfu: 'LFU',
  midpoint: 'LRU + midpoint',
};

class Fifo implements Policy {
  private q: string[] = [];
  constructor(private cap: number) {}
  access(key: string): AccessResult {
    if (this.q.includes(key)) return { hit: true, evicted: null }; // a hit does not reorder anything
    let evicted: string | null = null;
    if (this.q.length >= this.cap) evicted = this.q.shift()!;
    this.q.push(key);
    return { hit: false, evicted };
  }
  slots(): Slot[] {
    return this.q.map((key) => ({ key }));
  }
}

class Lru implements Policy {
  private q: string[] = []; // index 0 = least recently used
  constructor(private cap: number) {}
  access(key: string): AccessResult {
    const i = this.q.indexOf(key);
    if (i >= 0) {
      this.q.splice(i, 1);
      this.q.push(key);
      return { hit: true, evicted: null };
    }
    let evicted: string | null = null;
    if (this.q.length >= this.cap) evicted = this.q.shift()!;
    this.q.push(key);
    return { hit: false, evicted };
  }
  slots(): Slot[] {
    return this.q.map((key) => ({ key }));
  }
}

// Plain LFU with no aging, on purpose: that is the version with the weakness.
// Ties on count are broken by recency (least recently used goes first).
class Lfu implements Policy {
  private m = new Map<string, { n: number; t: number }>();
  private tick = 0;
  constructor(private cap: number) {}
  access(key: string): AccessResult {
    this.tick++;
    const e = this.m.get(key);
    if (e) {
      e.n++;
      e.t = this.tick;
      return { hit: true, evicted: null };
    }
    let evicted: string | null = null;
    if (this.m.size >= this.cap) {
      let victim: string | null = null;
      let best: { n: number; t: number } | null = null;
      for (const [k, v] of this.m) {
        if (!best || v.n < best.n || (v.n === best.n && v.t < best.t)) {
          victim = k;
          best = v;
        }
      }
      this.m.delete(victim!);
      evicted = victim;
    }
    this.m.set(key, { n: 1, t: this.tick });
    return { hit: false, evicted };
  }
  slots(): Slot[] {
    return [...this.m.entries()]
      .sort((a, b) => a[1].n - b[1].n || a[1].t - b[1].t)
      .map(([key, v]) => ({ key, note: `×${v.n}` }));
  }
}

// A simplified InnoDB-style list: new pages go in at the midpoint (the head of the
// "old" part) and are only promoted to "young" when they are accessed again.
class Midpoint implements Policy {
  private young: string[] = []; // index 0 = least recently used of the young part
  private old: string[] = []; // index 0 = oldest, the next victim
  private oldTarget: number;
  constructor(private cap: number) {
    this.oldTarget = Math.max(1, Math.round((cap * 3) / 8));
  }
  access(key: string): AccessResult {
    const yi = this.young.indexOf(key);
    if (yi >= 0) {
      this.young.splice(yi, 1);
      this.young.push(key);
      return { hit: true, evicted: null };
    }
    const oi = this.old.indexOf(key);
    if (oi >= 0) {
      this.old.splice(oi, 1);
      this.young.push(key);
      const youngMax = this.cap - this.oldTarget;
      while (this.young.length > youngMax) this.old.push(this.young.shift()!);
      return { hit: true, evicted: null };
    }
    let evicted: string | null = null;
    if (this.young.length + this.old.length >= this.cap) {
      evicted = this.old.length ? this.old.shift()! : this.young.shift()!;
    }
    this.old.push(key);
    return { hit: false, evicted };
  }
  slots(): Slot[] {
    return [
      ...this.old.map((key) => ({ key, note: 'old' })),
      ...this.young.map((key) => ({ key, note: 'young' })),
    ];
  }
}

export function makePolicy(id: PolicyId, capacity: number): Policy {
  switch (id) {
    case 'fifo':
      return new Fifo(capacity);
    case 'lru':
      return new Lru(capacity);
    case 'lfu':
      return new Lfu(capacity);
    case 'midpoint':
      return new Midpoint(capacity);
  }
}

export interface Scenario {
  id: string;
  title: string;
  capacity: number;
  trace: string[];
  phases: { from: number; label: string }[];
  takeaway: string;
}

export const POLICIES: PolicyId[] = ['fifo', 'lru', 'lfu', 'midpoint'];

export const SCENARIOS: Scenario[] = [
  {
    id: 'basic',
    title: 'Basic trace',
    capacity: 3,
    trace: ['A', 'B', 'C', 'A', 'D'],
    phases: [
      { from: 0, label: 'Filling the cache' },
      { from: 3, label: 'A is used again' },
      { from: 4, label: 'D arrives and the cache is full' },
    ],
    takeaway:
      'Same requests, different victims. FIFO threw out A even though A had just been used, because it only looks at arrival order. LRU, LFU and the midpoint list all threw out B.',
  },
  {
    id: 'scan',
    title: 'Nightly scan',
    capacity: 5,
    trace: ['A', 'B', 'C', 'A', 'B', 'C', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'A', 'B', 'C'],
    phases: [
      { from: 0, label: 'Daytime: hot pages A, B and C are in use' },
      { from: 6, label: 'Nightly job: six pages, each requested once (S1 to S6)' },
      { from: 12, label: 'Morning: the hot pages come back' },
    ],
    takeaway:
      'FIFO and LRU lost all three hot pages to a job that never needed them again. LFU and the midpoint list kept them, because the one-time pages could not displace pages with a track record.',
  },
  {
    id: 'star',
    title: "Yesterday's star",
    capacity: 3,
    trace: ['A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'B', 'C', 'D'],
    phases: [
      { from: 0, label: 'A is very popular' },
      { from: 5, label: 'Traffic moves on to B, C and D' },
    ],
    takeaway:
      'A is never requested again, but LFU (and the midpoint list, which promoted it) keep it forever, so B, C and D fight over two slots and keep evicting each other. LRU and FIFO let A go and settle into the new working set.',
  },
];

export interface PolicyView {
  slots: Slot[];
  hits: number;
  misses: number;
  last: (AccessResult & { key: string }) | null;
}

// Replay the first `upto` requests of a scenario through one policy.
export function replay(id: PolicyId, scenario: Scenario, upto: number): PolicyView {
  const p = makePolicy(id, scenario.capacity);
  let hits = 0;
  let misses = 0;
  let last: PolicyView['last'] = null;
  for (const key of scenario.trace.slice(0, upto)) {
    const r = p.access(key);
    if (r.hit) hits++;
    else misses++;
    last = { ...r, key };
  }
  return { slots: p.slots(), hits, misses, last };
}

export function phaseAt(scenario: Scenario, index: number): string {
  let label = scenario.phases[0].label;
  for (const ph of scenario.phases) if (ph.from <= index) label = ph.label;
  return label;
}
