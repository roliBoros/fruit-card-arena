// Self-contained feedback layer: synthesized sound (Web Audio) + haptics.
// No audio files are shipped, so the build stays portable for mobile previews.

const MUTE_KEY = 'fca-muted';

let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === 'yes';
  } catch {
    return false;
  }
})();

export const isMuted = () => muted;

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? 'yes' : 'no');
  } catch {
    /* storage may be unavailable */
  }
}

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  // Mobile browsers start the context suspended until a user gesture.
  if (context.state === 'suspended') void context.resume();
  return context;
}

// Call once from a user gesture (e.g. first tap) to unlock audio on mobile.
export function primeAudio() {
  audio();
}

type Tone = {
  freq: number;
  to?: number; // optional glide target frequency
  start: number; // seconds offset
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function play(tones: Tone[]) {
  if (muted) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    const t0 = now + tone.start;
    const t1 = t0 + tone.duration;
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), t1);
    const peak = tone.gain ?? 0.18;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

function buzz(pattern: number | number[]) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibrate unsupported */
  }
}

export type SoundName =
  | 'click'
  | 'attack'
  | 'hit'
  | 'crit'
  | 'combo'
  | 'special'
  | 'heal'
  | 'miss'
  | 'guard'
  | 'victory'
  | 'defeat';

const buzzPatterns: Record<SoundName, number | number[]> = {
  click: 8,
  attack: 18,
  hit: [12, 18, 24],
  crit: [16, 22, 40, 22, 16],
  combo: [10, 14, 10],
  special: [10, 20, 10, 20],
  heal: 10,
  miss: 6,
  guard: [8, 10, 30],
  victory: [30, 40, 30, 40, 60],
  defeat: [60, 40, 80],
};

export function sfx(name: SoundName) {
  switch (name) {
    case 'click':
      play([{ freq: 520, start: 0, duration: 0.06, type: 'triangle', gain: 0.1 }]);
      break;
    case 'attack':
      play([{ freq: 320, to: 140, start: 0, duration: 0.12, type: 'sawtooth', gain: 0.16 }]);
      break;
    case 'hit':
      play([
        { freq: 180, to: 70, start: 0, duration: 0.16, type: 'square', gain: 0.18 },
        { freq: 90, to: 50, start: 0.02, duration: 0.16, type: 'sawtooth', gain: 0.12 },
      ]);
      break;
    case 'crit':
      play([
        { freq: 220, to: 60, start: 0, duration: 0.2, type: 'square', gain: 0.2 },
        { freq: 110, to: 45, start: 0.02, duration: 0.2, type: 'sawtooth', gain: 0.15 },
        { freq: 1320, start: 0.05, duration: 0.16, type: 'triangle', gain: 0.13 },
        { freq: 1760, start: 0.13, duration: 0.2, type: 'triangle', gain: 0.12 },
      ]);
      break;
    case 'combo':
      play([
        { freq: 740, start: 0, duration: 0.07, type: 'triangle', gain: 0.12 },
        { freq: 988, start: 0.06, duration: 0.09, type: 'triangle', gain: 0.13 },
      ]);
      break;
    case 'special':
      play([
        { freq: 660, start: 0, duration: 0.09, type: 'triangle', gain: 0.14 },
        { freq: 880, start: 0.08, duration: 0.09, type: 'triangle', gain: 0.14 },
        { freq: 1175, start: 0.16, duration: 0.12, type: 'triangle', gain: 0.14 },
      ]);
      break;
    case 'heal':
      play([
        { freq: 440, to: 660, start: 0, duration: 0.18, type: 'sine', gain: 0.14 },
        { freq: 660, to: 880, start: 0.12, duration: 0.2, type: 'sine', gain: 0.12 },
      ]);
      break;
    case 'miss':
      play([{ freq: 220, to: 320, start: 0, duration: 0.1, type: 'sine', gain: 0.08 }]);
      break;
    case 'guard':
      play([{ freq: 140, start: 0, duration: 0.14, type: 'square', gain: 0.16 }]);
      break;
    case 'victory':
      play([
        { freq: 523, start: 0, duration: 0.16, type: 'triangle', gain: 0.16 },
        { freq: 659, start: 0.14, duration: 0.16, type: 'triangle', gain: 0.16 },
        { freq: 784, start: 0.28, duration: 0.16, type: 'triangle', gain: 0.16 },
        { freq: 1047, start: 0.42, duration: 0.32, type: 'triangle', gain: 0.18 },
      ]);
      break;
    case 'defeat':
      play([
        { freq: 392, start: 0, duration: 0.2, type: 'sawtooth', gain: 0.14 },
        { freq: 294, start: 0.18, duration: 0.24, type: 'sawtooth', gain: 0.14 },
        { freq: 196, start: 0.4, duration: 0.4, type: 'sawtooth', gain: 0.14 },
      ]);
      break;
  }
  buzz(buzzPatterns[name]);
}
