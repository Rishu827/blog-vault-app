import { useState, useEffect } from 'preact/hooks';

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.getElementById('article-body');
    if (!article) return;

    function update() {
      const { top, height } = article!.getBoundingClientRect();
      const navH = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '64'
      );
      const scrolled = Math.max(0, -top + navH);
      const total = height - window.innerHeight + navH;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'fixed',
        top: 'var(--navbar-height)',
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 40,
        backgroundColor: 'var(--color-border)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: 'var(--color-accent)',
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
}
