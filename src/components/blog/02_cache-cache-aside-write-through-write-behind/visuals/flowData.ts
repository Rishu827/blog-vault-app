// Data and pure helpers for the CacheFlow diagram. Kept free of UI code so the
// step logic can be tested on its own.

export type Node = 'app' | 'cache' | 'db';

// A lane is one fixed arrow slot in the diagram. Several steps can reuse a lane.
export type Lane =
  | 'appCacheReq'
  | 'cacheAppRes'
  | 'cacheDbReq'
  | 'dbCacheRes'
  | 'appDbReq'
  | 'dbAppRes';

export type StrategyId =
  | 'cache-aside'
  | 'read-through'
  | 'write-through'
  | 'write-behind'
  | 'write-around';

export interface Step {
  lane: Lane | null; // null = a step that only changes state or adds a note
  text: string;
  async?: boolean; // drawn dashed: happens later, in the background
  tone?: 'ok' | 'warn';
  cache?: string | null; // new cache value after this step (null = empty)
  db?: string | null; // new database value after this step
  crashed?: boolean;
}

export interface Scenario {
  title: string;
  init: { cache: string | null; db: string | null };
  // true when the cache can legitimately be ahead of the database (write-behind)
  cacheLeads?: boolean;
  steps: Step[];
}

export interface Strategy {
  id: StrategyId;
  label: string;
  scenarios: Scenario[];
}

export const LANE_NODES: Record<Lane, [Node, Node]> = {
  appCacheReq: ['app', 'cache'],
  cacheAppRes: ['cache', 'app'],
  cacheDbReq: ['cache', 'db'],
  dbCacheRes: ['db', 'cache'],
  appDbReq: ['app', 'db'],
  dbAppRes: ['db', 'app'],
};

export const STRATEGIES: Strategy[] = [
  {
    id: 'cache-aside',
    label: 'Cache-aside',
    scenarios: [
      {
        title: 'Read, cache miss',
        init: { cache: null, db: '₹499' },
        steps: [
          { lane: 'appCacheReq', text: 'The app checks the cache first.' },
          { lane: 'cacheAppRes', text: 'Miss. The cache has nothing for this key.' },
          { lane: 'appDbReq', text: 'So the app goes to the database itself.' },
          { lane: 'dbAppRes', text: 'The database answers ₹499. This is the slow part.' },
          {
            lane: 'appCacheReq',
            text: 'The app stores the result in the cache, so the next read is fast.',
            cache: '₹499',
            tone: 'ok',
          },
        ],
      },
      {
        title: 'Read, cache hit',
        init: { cache: '₹499', db: '₹499' },
        steps: [
          { lane: 'appCacheReq', text: 'The app checks the cache first.' },
          {
            lane: 'cacheAppRes',
            text: 'Hit. ₹499 comes straight back and the database is never touched.',
            tone: 'ok',
          },
        ],
      },
      {
        title: 'Write',
        init: { cache: '₹499', db: '₹499' },
        steps: [
          {
            lane: 'appDbReq',
            text: 'The app writes the new price to the database. For a moment the cache is stale.',
            db: '₹599',
            tone: 'warn',
          },
          {
            lane: 'appCacheReq',
            text: 'The app deletes the cached entry. The next read will refill it with ₹599.',
            cache: null,
            tone: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'read-through',
    label: 'Read-through',
    scenarios: [
      {
        title: 'Read, cache miss',
        init: { cache: null, db: '₹499' },
        steps: [
          { lane: 'appCacheReq', text: 'The app asks the cache. It never talks to the database.' },
          { lane: 'cacheDbReq', text: 'Miss, so the cache itself goes to the database.' },
          {
            lane: 'dbCacheRes',
            text: 'The database answers ₹499 and the cache keeps a copy.',
            cache: '₹499',
          },
          { lane: 'cacheAppRes', text: 'The cache hands the value to the app.', tone: 'ok' },
        ],
      },
      {
        title: 'Read, cache hit',
        init: { cache: '₹499', db: '₹499' },
        steps: [
          { lane: 'appCacheReq', text: 'The app asks the cache.' },
          { lane: 'cacheAppRes', text: 'Hit. ₹499 comes straight back.', tone: 'ok' },
        ],
      },
    ],
  },
  {
    id: 'write-through',
    label: 'Write-through',
    scenarios: [
      {
        title: 'Write',
        init: { cache: '₹499', db: '₹499' },
        cacheLeads: true,
        steps: [
          { lane: 'appCacheReq', text: 'The app writes ₹599 to the cache.', cache: '₹599' },
          {
            lane: 'cacheDbReq',
            text: 'The cache writes it through to the database, and waits.',
            db: '₹599',
          },
          { lane: 'dbCacheRes', text: 'The database confirms the write.' },
          {
            lane: 'cacheAppRes',
            text: 'Only now does the app hear "saved". Both stores agree. The price was slower writes.',
            tone: 'ok',
          },
        ],
      },
    ],
  },
  {
    id: 'write-behind',
    label: 'Write-behind',
    scenarios: [
      {
        title: 'Write, flush succeeds',
        init: { cache: '₹499', db: '₹499' },
        cacheLeads: true,
        steps: [
          { lane: 'appCacheReq', text: 'The app writes ₹599 to the cache.', cache: '₹599' },
          {
            lane: 'cacheAppRes',
            text: 'The cache replies "saved" straight away. The user is happy and the write was fast.',
          },
          {
            lane: 'cacheDbReq',
            async: true,
            text: 'Later, in the background, the cache flushes the change to the database.',
            db: '₹599',
            tone: 'ok',
          },
        ],
      },
      {
        title: 'Write, cache crashes first',
        init: { cache: '₹499', db: '₹499' },
        cacheLeads: true,
        steps: [
          { lane: 'appCacheReq', text: 'The app writes ₹599 to the cache.', cache: '₹599' },
          {
            lane: 'cacheAppRes',
            text: 'The cache replies "saved" straight away. The user is happy.',
          },
          {
            lane: null,
            text: 'The cache crashes before the background flush. ₹599 existed nowhere else, so the write is gone. The user was told "saved", and the database never heard about it.',
            cache: null,
            crashed: true,
            tone: 'warn',
          },
        ],
      },
    ],
  },
  {
    id: 'write-around',
    label: 'Write-around',
    scenarios: [
      {
        title: 'Write a new item',
        init: { cache: null, db: null },
        steps: [
          {
            lane: 'appDbReq',
            text: 'The app writes straight to the database and skips the cache.',
            db: '₹499',
          },
          {
            lane: null,
            text: 'The cache was not touched. It holds nothing for this item, and nothing it already had gets pushed out.',
            tone: 'ok',
          },
          {
            lane: 'appCacheReq',
            text: 'Later, the first read checks the cache and misses. From here it behaves like cache-aside.',
          },
        ],
      },
    ],
  },
];

export interface FlowState {
  cache: string | null;
  db: string | null;
  crashed: boolean;
}

// Fold the first `upto` steps over the scenario's starting state.
export function computeState(scenario: Scenario, upto: number): FlowState {
  let { cache, db } = scenario.init;
  let crashed = false;
  for (const s of scenario.steps.slice(0, upto)) {
    if (s.cache !== undefined) cache = s.cache;
    if (s.db !== undefined) db = s.db;
    if (s.crashed) crashed = true;
  }
  return { cache, db, crashed };
}

export type Tone = 'ok' | 'stale' | 'dirty' | 'empty' | 'warn';

export interface Described {
  value: string;
  label: string;
  tone: Tone;
}

export function describeCache(state: FlowState, scenario: Scenario): Described {
  if (state.crashed) return { value: '✕ crashed', label: 'contents lost', tone: 'warn' };
  if (state.cache === null) return { value: '(empty)', label: '', tone: 'empty' };
  if (state.db !== null && state.cache !== state.db) {
    return scenario.cacheLeads
      ? { value: state.cache, label: 'not saved yet', tone: 'dirty' }
      : { value: state.cache, label: 'stale copy', tone: 'stale' };
  }
  return { value: state.cache, label: '', tone: 'ok' };
}

export function describeDb(state: FlowState): Described {
  if (state.db === null) return { value: '(none)', label: '', tone: 'empty' };
  return { value: state.db, label: '', tone: 'ok' };
}
