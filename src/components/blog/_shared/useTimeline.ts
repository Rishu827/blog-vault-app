import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

// One clock for an animated visual. The visual is a pure function of `t`
// (milliseconds, 0 to duration), which is what makes pause, replay and scrubbing work.
//
// Behaviour:
// - Server render and no-JS show the final frame (t = duration).
// - After hydration it rewinds to 0 and plays once, the first time it is mostly in view.
// - It stops advancing while off-screen or in a hidden tab, and rests on the last frame.
// - With prefers-reduced-motion it does not autoplay: the final frame stays and the reader
//   can still press Play or drag the scrubber.
export interface Timeline {
  t: number;
  duration: number;
  playing: boolean;
  atEnd: boolean;
  reducedMotion: boolean;
  ref: { current: HTMLElement | null };
  play: () => void;
  pause: () => void;
  replay: () => void;
  seek: (ms: number) => void;
}

export function useTimeline(duration: number): Timeline {
  const ref = useRef<HTMLElement | null>(null);
  const [t, setT] = useState(duration);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  const tRef = useRef(duration);
  const durRef = useRef(duration);
  const started = useRef(false);
  durRef.current = duration;

  // Rewind before the first paint so readers don't see the final frame flash.
  useLayoutEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    if (!mq.matches) {
      tRef.current = 0;
      setT(0);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay once, the first time the visual is in view.
  useEffect(() => {
    if (inView && !reduced && !started.current) {
      started.current = true;
      setPlaying(true);
    }
  }, [inView, reduced]);

  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100); // a long gap (hidden tab) must not skip ahead
      last = now;
      const next = Math.min(durRef.current, tRef.current + dt);
      tRef.current = next;
      setT(next);
      if (next >= durRef.current) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView]);

  const play = useCallback(() => {
    if (tRef.current >= durRef.current) {
      tRef.current = 0;
      setT(0);
    }
    started.current = true;
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const replay = useCallback(() => {
    tRef.current = 0;
    setT(0);
    started.current = true;
    setPlaying(true);
  }, []);
  const seek = useCallback((ms: number) => {
    const v = Math.max(0, Math.min(durRef.current, ms));
    tRef.current = v;
    setT(v);
    setPlaying(false);
  }, []);

  return { t, duration, playing, atEnd: t >= duration, reducedMotion: reduced, ref, play, pause, replay, seek };
}
