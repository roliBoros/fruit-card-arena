import { useEffect, useRef, useState } from 'react';

export type StrikeTier = 'perfect' | 'good' | 'weak';

export const strikeMultiplier: Record<StrikeTier, number> = {
  perfect: 1.5,
  good: 1,
  weak: 0.75,
};

const PERFECT_ZONE = { from: 42, to: 58 };
const GOOD_ZONE = { from: 18, to: 82 };
const SWEEP_MS = 850; // one full left-to-right pass
const TIMEOUT_MS = 4600; // auto-resolve so nobody gets stuck

export function tierForPosition(position: number): StrikeTier {
  if (position >= PERFECT_ZONE.from && position <= PERFECT_ZONE.to) return 'perfect';
  if (position >= GOOD_ZONE.from && position <= GOOD_ZONE.to) return 'good';
  return 'weak';
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Tap-to-lock timing gauge. A marker ping-pongs across the bar; the player
 * taps to lock it. Centre = PERFECT (crit), edges = weak. Resolves 'good'
 * automatically on timeout or when reduced motion is requested.
 */
export function StrikeGauge({ label, onResolve }: { label: string; onResolve: (tier: StrikeTier) => void }) {
  const [position, setPosition] = useState(0);
  const [locked, setLocked] = useState<StrikeTier | null>(null);
  const positionRef = useRef(0);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      resolvedRef.current = true;
      onResolve('good');
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= TIMEOUT_MS) {
        if (!resolvedRef.current) {
          resolvedRef.current = true;
          onResolve('good');
        }
        return;
      }
      const phase = (elapsed % (SWEEP_MS * 2)) / SWEEP_MS; // 0..2 ping-pong
      const next = phase <= 1 ? phase * 100 : (2 - phase) * 100;
      positionRef.current = next;
      setPosition(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function lock() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const tier = tierForPosition(positionRef.current);
    setLocked(tier);
    // Brief pause so the player sees where they landed before it resolves.
    window.setTimeout(() => onResolve(tier), 420);
  }

  return (
    <div className="strike-backdrop" onPointerDown={lock} role="dialog" aria-modal="true" aria-label={`${label} power strike, tap to lock the marker`}>
      <div className={`strike-panel ${locked ?? ''}`}>
        <strong className="strike-title">{label}</strong>
        <div className="strike-track">
          <span className="strike-zone good" style={{ left: `${GOOD_ZONE.from}%`, width: `${GOOD_ZONE.to - GOOD_ZONE.from}%` }} />
          <span className="strike-zone perfect" style={{ left: `${PERFECT_ZONE.from}%`, width: `${PERFECT_ZONE.to - PERFECT_ZONE.from}%` }} />
          <span className="strike-marker" style={{ left: `${position}%` }} />
        </div>
        <small className="strike-hint">{locked ? { perfect: 'PERFECT! Critical strike!', good: 'Good hit!', weak: 'Weak hit...' }[locked] : 'TAP to strike!'}</small>
        <button className="strike-lock" onPointerDown={(event) => { event.stopPropagation(); lock(); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lock(); } }} autoFocus>
          STRIKE
        </button>
      </div>
    </div>
  );
}

const BURST_COLORS: Record<string, string[]> = {
  hit: ['#ff5e69', '#ffb14a', '#ffe27a', '#ffffff'],
  crit: ['#ffd24a', '#fff2a8', '#ff9d3c', '#ffffff'],
  heal: ['#8be66a', '#c9f163', '#ffffff'],
  special: ['#d08bf6', '#4fd2ff', '#ffe27a', '#ffffff'],
};

/**
 * One-shot particle burst: spark shards fly outward from the centre of the
 * parent element. Pure CSS animation; unmounts itself via onDone.
 */
export function ImpactBurst({ kind, seed, count = 14 }: { kind: keyof typeof BURST_COLORS; seed: number; count?: number }) {
  const colors = BURST_COLORS[kind] ?? BURST_COLORS.hit;
  const pieces = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + (seed % 7) * 0.13;
    const distance = 52 + ((seed * 31 + index * 17) % 46);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 5 + ((seed * 13 + index * 7) % 7),
      color: colors[index % colors.length],
      delay: (index % 4) * 22,
    };
  });
  return (
    <span className={`impact-burst ${kind}`} aria-hidden="true">
      {pieces.map((piece, index) => (
        <i
          key={index}
          style={{
            '--dx': `${piece.x}px`,
            '--dy': `${piece.y}px`,
            width: piece.size,
            height: piece.size,
            background: piece.color,
            animationDelay: `${piece.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
