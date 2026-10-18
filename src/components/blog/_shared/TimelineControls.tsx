import type { Timeline } from './useTimeline';

// Play / pause, replay, and a scrubber for any visual driven by useTimeline.
export default function TimelineControls({ tl }: { tl: Timeline }) {
  return (
    <div class="cf-controls tl-controls">
      <button type="button" class="cf-btn" onClick={() => (tl.playing ? tl.pause() : tl.play())}>
        {tl.playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" class="cf-btn" onClick={tl.replay}>
        Replay
      </button>
      <input
        class="tl-scrub"
        type="range"
        min="0"
        max={Math.round(tl.duration)}
        step="10"
        value={Math.round(tl.t)}
        aria-label="Scrub through the animation"
        onInput={(e) => tl.seek(Number((e.target as HTMLInputElement).value))}
      />
    </div>
  );
}
