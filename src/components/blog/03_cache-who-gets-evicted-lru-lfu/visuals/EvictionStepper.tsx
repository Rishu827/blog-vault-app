import { useState } from 'preact/hooks';
import { SCENARIOS, POLICIES, POLICY_LABEL, replay, phaseAt } from './evictionData';

interface Props {
  scenario?: number;
}

export default function EvictionStepper({ scenario = 0 }: Props) {
  const [cIdx, setCIdx] = useState(scenario);
  const [step, setStep] = useState(0);

  const sc = SCENARIOS[cIdx];
  const total = sc.trace.length;
  const done = step >= total;
  const views = POLICIES.map((id) => ({ id, view: replay(id, sc, step) }));
  const currentKey = step > 0 ? sc.trace[step - 1] : null;

  function pick(i: number) {
    setCIdx(i);
    setStep(0);
  }

  const summary = views
    .map(({ id, view }) => {
      if (!view.last) return null;
      const r = view.last.hit ? 'hit' : view.last.evicted ? `miss, evicted ${view.last.evicted}` : 'miss';
      return `${POLICY_LABEL[id]}: ${r}`;
    })
    .filter(Boolean)
    .join('. ');

  return (
    <figure class="cache-flow not-prose" aria-label="Eviction policies compared on the same sequence of requests">
      <div class="cf-controls" role="group" aria-label="Scenario">
        {SCENARIOS.map((s, i) => (
          <button type="button" class="cf-btn" aria-pressed={i === cIdx} onClick={() => pick(i)} key={s.id}>
            {s.title}
          </button>
        ))}
      </div>

      <div class="cf-meta" style={{ marginTop: '0.75rem' }}>
        A cache with room for {sc.capacity} items. The same {total} requests go to every policy. The leftmost slot is
        the next one to be evicted.
      </div>

      <ol class="ev-trace" aria-label="Requests, in order">
        {sc.trace.map((key, i) => {
          const state = i + 1 === step ? 'current' : i < step ? 'past' : 'future';
          return (
            <li class="ev-chip" data-state={state} data-kind={key.startsWith('S') ? 'scan' : 'hot'} key={i}>
              {key}
            </li>
          );
        })}
      </ol>

      <div class="ev-rows">
        {views.map(({ id, view }) => {
          const empties = Math.max(0, sc.capacity - view.slots.length);
          const last = view.last;
          return (
            <section class="ev-row" aria-label={POLICY_LABEL[id]} key={id}>
              <div>
                <div class="ev-name">{POLICY_LABEL[id]}</div>
                <div class="ev-count">
                  {view.hits} hits · {view.misses} misses
                </div>
              </div>
              <div>
                <div class="ev-slots">
                  {view.slots.map((s) => (
                    <div
                      class="ev-slot"
                      data-kind={s.key.startsWith('S') ? 'scan' : 'hot'}
                      data-note={s.note?.startsWith('×') ? '' : s.note ?? ''}
                      key={s.key}
                    >
                      {s.key}
                      {s.note && <small>{s.note}</small>}
                    </div>
                  ))}
                  {Array.from({ length: empties }).map((_, i) => (
                    <div class="ev-slot" data-empty="true" key={`e${i}`} aria-hidden="true" />
                  ))}
                </div>
                <div class="ev-status" data-result={last ? (last.hit ? 'hit' : 'miss') : ''}>
                  {last
                    ? last.hit
                      ? `${last.key}: hit`
                      : last.evicted
                        ? `${last.key}: miss, evicted ${last.evicted}`
                        : `${last.key}: miss`
                    : ' '}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div class="cf-caption" data-tone={done ? 'ok' : ''} aria-live="polite">
        {step === 0 ? (
          <>Press <strong>Next request</strong> to send the first request to all four policies.</>
        ) : done ? (
          <>
            <strong>Done.</strong> {sc.takeaway}
          </>
        ) : (
          <>
            <strong>
              Request {step} of {total}: {currentKey}.
            </strong>{' '}
            {phaseAt(sc, step - 1)}.
          </>
        )}
        <span class="sr-only"> {summary}</span>
      </div>

      <div class="cf-controls">
        <button type="button" class="cf-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        <button type="button" class="cf-btn cf-btn-primary" disabled={done} onClick={() => setStep(step + 1)}>
          Next request
        </button>
        <button type="button" class="cf-btn" disabled={step === 0} onClick={() => setStep(0)}>
          Reset
        </button>
      </div>
    </figure>
  );
}
