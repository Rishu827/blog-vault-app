// Model of the change-data-capture pipeline: a write lands in the database, the change
// log feeds a consumer, and the consumer invalidates the cache. Pure data, no UI.

export type Pt = [number, number];

export interface Packet {
  id: string;
  t0: number;
  t1: number;
  from: Pt;
  to: Pt;
  label: string;
}
export interface CdcModel {
  slow: boolean;
  packets: Packet[];
  dbChanges: { t: number; ver: number }[];
  cacheChanges: { t: number; ver: number | null }[];
  queue: { add: number; remove: number; label: string }[];
  end: number;
}

// Anchor points, in the SVG's own coordinates.
export const PT = {
  appOut: [106, 35] as Pt,
  otherOut: [106, 115] as Pt,
  dbInApp: [150, 72] as Pt,
  dbInOther: [150, 106] as Pt,
  dbBottom: [202, 130] as Pt,
  logTop: [202, 168] as Pt,
  logRight: [254, 194] as Pt,
  consumerLeft: [300, 194] as Pt,
  consumerTop: [348, 168] as Pt,
  cacheBottom: [348, 130] as Pt,
  dbRight: [254, 87] as Pt,
  cacheLeft: [300, 87] as Pt,
};

export function buildCdc(slow: boolean): CdcModel {
  const delay = slow ? 30 : 2; // how long an event waits in the log before the consumer takes it
  const packets: Packet[] = [];
  const dbChanges: CdcModel['dbChanges'] = [];
  const cacheChanges: CdcModel['cacheChanges'] = [];
  const queue: CdcModel['queue'] = [];

  // One full cycle: a write from `source`, through the log and the consumer, to the cache.
  function cycle(start: number, ver: number, source: 'app' | 'other'): number {
    const from = source === 'app' ? PT.appOut : PT.otherOut;
    const to = source === 'app' ? PT.dbInApp : PT.dbInOther;
    const written = start + 8;
    packets.push({ id: `w${ver}`, t0: start, t1: written, from, to, label: `write v${ver}` });
    dbChanges.push({ t: written, ver });

    const logged = written + 6;
    packets.push({ id: `l${ver}`, t0: written, t1: logged, from: PT.dbBottom, to: PT.logTop, label: `v${ver}` });

    const depart = logged + delay;
    queue.push({ add: logged, remove: depart, label: `v${ver}` });
    packets.push({ id: `c${ver}`, t0: depart, t1: depart + 6, from: PT.logRight, to: PT.consumerLeft, label: `v${ver}` });

    const invalidated = depart + 6 + 1 + 6;
    packets.push({ id: `i${ver}`, t0: depart + 7, t1: invalidated, from: PT.consumerTop, to: PT.cacheBottom, label: 'invalidate' });
    cacheChanges.push({ t: invalidated, ver: null });
    return invalidated;
  }

  // The cache starts out holding v1, in sync with the database.
  dbChanges.push({ t: 0, ver: 1 });
  cacheChanges.push({ t: 0, ver: 1 });

  const inv1 = cycle(6, 2, 'app');

  // The next read refills the cache from the database.
  const refilled = inv1 + 7 + 6;
  packets.push({ id: 'refill', t0: inv1 + 7, t1: refilled, from: PT.dbRight, to: PT.cacheLeft, label: 'refill v2' });
  cacheChanges.push({ t: refilled, ver: 2 });

  // A second service changes the same data, without knowing the cache exists.
  const inv2 = cycle(refilled + 8, 3, 'other');

  return { slow, packets, dbChanges, cacheChanges, queue, end: inv2 + 8 };
}

export interface CdcState {
  dbVer: number;
  cacheVer: number | null;
  queued: string[];
  outOfSync: boolean;
}

export function stateAt(model: CdcModel, vt: number): CdcState {
  let dbVer = 1;
  for (const c of model.dbChanges) if (c.t <= vt) dbVer = c.ver;
  let cacheVer: number | null = 1;
  for (const c of model.cacheChanges) if (c.t <= vt) cacheVer = c.ver;
  const queued = model.queue.filter((q) => q.add <= vt && vt < q.remove).map((q) => q.label);
  return { dbVer, cacheVer, queued, outOfSync: cacheVer !== null && cacheVer !== dbVer };
}
