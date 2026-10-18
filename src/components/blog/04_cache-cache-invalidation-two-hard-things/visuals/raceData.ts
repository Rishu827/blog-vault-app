// Model of the reader/writer race from the article. The animation is a pure function
// of virtual time, so everything here is computed up front and can be tested.
//
// The cast: a Reader that misses the cache and loads from the database, and a Writer that
// updates the database and then deletes the cache entry. The Reader is slow between
// loading the value and putting it into the cache; how slow is the one thing the reader
// of the article can change.

export type Variant = 'race' | 'lease' | 'versioned';
export type Actor = 'reader' | 'writer' | 'cache' | 'db';

export const HOP = 6; // virtual time units an arrow takes to travel
export const T_MAX = 110; // length of the time axis
export const READ_DONE = 33; // the Reader has the database's answer from here on
export const DELETE_ARRIVES = 50; // the Writer's delete reaches the cache
export const MAX_DELAY = 60; // slider range: 0 (fast) to 60 (slow)

export interface CacheState {
  val: 'old' | 'new' | null;
  ver: number | null;
  tombstone: number | null;
  lease: boolean;
}
export interface DbState {
  val: 'old' | 'new';
  ver: number;
}
export interface Ev {
  id: string;
  t: number;
  arrive: number;
  from: Actor;
  to: Actor;
  label: string;
  rejected?: boolean;
  tag?: string; // short note drawn on the cache lifeline when the event lands
  cache: CacheState; // state right after this event arrives
  db: DbState;
}
export interface RaceModel {
  variant: Variant;
  fillT: number;
  events: Ev[];
  initial: { cache: CacheState; db: DbState };
  fillAfterDelete: boolean;
  rejected: boolean;
  stale: boolean;
  outcome: { tone: 'ok' | 'warn'; text: string };
}

interface Spec {
  id: string;
  t: number;
  from: Actor;
  to: Actor;
  label: string;
  prio: number; // tie-break when two events land at the same time: lower goes first
}

export function buildRace(variant: Variant, delay: number): RaceModel {
  const fillT = READ_DONE + 1 + delay;
  const initial = {
    cache: { val: null, ver: null, tombstone: null, lease: false } as CacheState,
    db: { val: 'old', ver: 7 } as DbState,
  };
  let cache: CacheState = { ...initial.cache };
  let db: DbState = { ...initial.db };
  let held: { ver: number } | null = null;

  const specs: Spec[] = [
    { id: 'get', t: 5, from: 'reader', to: 'cache', label: 'GET email', prio: 1 },
    { id: 'miss', t: 12, from: 'cache', to: 'reader', label: variant === 'lease' ? 'miss + lease L1' : 'miss', prio: 1 },
    { id: 'select', t: 20, from: 'reader', to: 'db', label: 'SELECT email', prio: 1 },
    { id: 'selectRes', t: 27, from: 'db', to: 'reader', label: variant === 'versioned' ? 'old (v7)' : 'email = old', prio: 1 },
    { id: 'update', t: 34, from: 'writer', to: 'db', label: variant === 'versioned' ? 'UPDATE, now v8' : 'UPDATE email = new', prio: 0 },
    { id: 'delete', t: 44, from: 'writer', to: 'cache', label: 'DELETE email', prio: 0 },
    {
      id: 'set',
      t: fillT,
      from: 'reader',
      to: 'cache',
      label: variant === 'lease' ? 'SET old + token L1' : variant === 'versioned' ? 'SET old (v7)' : 'SET email = old',
      prio: 2,
    },
  ];
  const ordered = specs
    .map((s) => ({ ...s, arrive: s.t + HOP }))
    .sort((a, b) => a.arrive - b.arrive || a.prio - b.prio);

  const events: Ev[] = [];
  let rejectedNote: string | null = null;

  for (const s of ordered) {
    let tag: string | undefined;
    let rejected = false;
    if (s.id === 'get' && variant === 'lease') cache.lease = true;
    if (s.id === 'select') held = { ver: db.ver };
    if (s.id === 'update') db = { val: 'new', ver: 8 };
    if (s.id === 'delete') {
      cache.val = null;
      cache.ver = null;
      if (variant === 'lease') {
        cache.lease = false;
        tag = 'lease L1 voided';
      }
      if (variant === 'versioned') {
        cache.tombstone = 8;
        tag = 'tombstone v8';
      }
    }
    if (s.id === 'set') {
      if (variant === 'race') {
        cache.val = 'old';
        cache.ver = 7;
      } else if (variant === 'lease') {
        if (cache.lease) {
          cache.val = 'old';
          cache.ver = 7;
          cache.lease = false;
        } else {
          rejected = true;
          rejectedNote = 'rejected: lease void';
        }
      } else if (cache.tombstone === null || held!.ver > cache.tombstone) {
        cache.val = 'old';
        cache.ver = 7;
      } else {
        rejected = true;
        rejectedNote = 'rejected: v7 < v8';
      }
      if (rejected) tag = rejectedNote!;
    }
    events.push({
      id: s.id,
      t: s.t,
      arrive: s.arrive,
      from: s.from,
      to: s.to,
      label: s.label,
      rejected,
      tag,
      cache: { ...cache },
      db: { ...db },
    });
    if (rejected) {
      events.push({
        id: 'rejected',
        t: s.arrive + 1,
        arrive: s.arrive + 1 + 4,
        from: 'cache',
        to: 'reader',
        label: 'rejected',
        rejected: true,
        cache: { ...cache },
        db: { ...db },
      });
    }
  }

  const last = events[events.length - 1];
  const stale = last.cache.val !== null && last.cache.val !== last.db.val;
  const fillAfterDelete = fillT + HOP >= DELETE_ARRIVES;
  const rejected = rejectedNote !== null;

  let outcome: RaceModel['outcome'];
  if (stale) {
    outcome = {
      tone: 'warn',
      text: 'Stale. The cache holds the old email and the database holds the new one. Nothing will correct this until the TTL runs out.',
    };
  } else if (variant === 'race') {
    outcome = {
      tone: 'ok',
      text: "Correct, this time. The reader filled the cache before the writer's delete, so the delete cleaned it up. Same code, different timing. Drag the slider towards slow to find where it breaks.",
    };
  } else if (rejected) {
    outcome = {
      tone: 'ok',
      text: "Correct. The reader's late write was rejected, so the cache stays empty and the next read loads the new value.",
    };
  } else {
    outcome = {
      tone: 'ok',
      text: "Correct. The reader filled the cache early, and the writer's delete then removed it.",
    };
  }

  return { variant, fillT, events, initial, fillAfterDelete, rejected, stale, outcome };
}

// The cache and database as they are at virtual time `vt`.
export function stateAt(model: RaceModel, vt: number): { cache: CacheState; db: DbState } {
  let cur = model.initial;
  for (const e of model.events) {
    if (e.arrive <= vt) cur = { cache: e.cache, db: e.db };
  }
  return cur;
}
