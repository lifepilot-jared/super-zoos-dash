import type { GameSound } from "./gameTypes";

// Optional uploaded audio files. The built-in Web Audio sounds below mean the game
// still has polished feedback even before custom voice clips are added.
const SOUND_PATHS: Partial<Record<GameSound, string>> = {
  jump: "/super-zoos-dash/sounds/jump.mp3",
  gem: "/super-zoos-dash/sounds/gem.mp3",
  heroPower: "/super-zoos-dash/sounds/hero-power.mp3",
  shield: "/super-zoos-dash/sounds/shield.mp3",
  bump: "/super-zoos-dash/sounds/bump.mp3",
  runEnd: "/super-zoos-dash/sounds/run-end.mp3",
};

export type GameAudioController = {
  unlock: () => void;
  play: (sound: GameSound) => void;
};

type BrowserAudioContext = typeof AudioContext;

function getAudioContextConstructor(): BrowserAudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? ((window as typeof window & { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext ?? null);
}

export function createGameAudio(isEnabled: () => boolean): GameAudioController {
  const cache = new Map<GameSound, HTMLAudioElement>();
  let unlocked = false;
  let context: AudioContext | null = null;

  function ensureContext() {
    const Constructor = getAudioContextConstructor();
    if (!Constructor) return null;
    context ??= new Constructor();
    if (context.state === "suspended") void context.resume();
    return context;
  }

  function tone(
    ctx: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    endFrequency?: number,
  ) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function noise(ctx: AudioContext, start: number, duration: number, volume: number) {
    const sampleCount = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
  }

  function synthesize(sound: GameSound) {
    const ctx = ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.008;

    switch (sound) {
      case "jump":
        // Fast springy jump + tiny landing pop.
        tone(ctx, 330, now, 0.13, 0.16, "sine", 690);
        tone(ctx, 520, now + 0.055, 0.11, 0.09, "triangle", 850);
        noise(ctx, now + 0.15, 0.055, 0.035);
        break;
      case "gem":
        // Cute elephant-like celebratory trumpet plus sparkle notes.
        tone(ctx, 235, now, 0.24, 0.14, "sawtooth", 390);
        tone(ctx, 470, now + 0.055, 0.19, 0.065, "sine", 610);
        tone(ctx, 790, now + 0.18, 0.16, 0.055, "triangle", 1040);
        tone(ctx, 1110, now + 0.27, 0.13, 0.04, "sine", 1380);
        break;
      case "heroPower":
        // Arcade boost/upgrade sweep.
        tone(ctx, 180, now, 0.42, 0.16, "sawtooth", 920);
        tone(ctx, 360, now + 0.08, 0.34, 0.11, "square", 1280);
        tone(ctx, 760, now + 0.26, 0.26, 0.08, "triangle", 1540);
        noise(ctx, now, 0.34, 0.035);
        break;
      case "shield":
        // Soft blue shield shimmer, deliberately non-harsh.
        tone(ctx, 410, now, 0.38, 0.09, "sine", 620);
        tone(ctx, 610, now + 0.04, 0.36, 0.07, "triangle", 910);
        tone(ctx, 920, now + 0.12, 0.28, 0.045, "sine", 1160);
        break;
      case "bump":
        // Gentle thud rather than a punishing fail sound.
        tone(ctx, 145, now, 0.17, 0.16, "sine", 72);
        noise(ctx, now, 0.12, 0.045);
        break;
      case "runEnd":
        // Encouraging finish jingle.
        tone(ctx, 392, now, 0.18, 0.08, "triangle");
        tone(ctx, 523, now + 0.15, 0.19, 0.085, "triangle");
        tone(ctx, 659, now + 0.31, 0.24, 0.09, "triangle");
        tone(ctx, 784, now + 0.49, 0.3, 0.075, "sine");
        break;
    }
  }

  function getUploadedAudio(sound: GameSound): HTMLAudioElement | null {
    const path = SOUND_PATHS[sound];
    if (!path) return null;
    const cached = cache.get(sound);
    if (cached) return cached;
    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = sound === "bump" ? 0.38 : 0.55;
    cache.set(sound, audio);
    return audio;
  }

  return {
    unlock() {
      unlocked = true;
      ensureContext();
    },
    play(sound) {
      if (!unlocked || !isEnabled()) return;

      // Built-in sound is immediate and reliable on iPad.
      synthesize(sound);

      // Custom uploaded clips can layer over/replace the fallback later. We only
      // attempt them when the browser has already cached enough data.
      const audio = getUploadedAudio(sound);
      if (!audio || audio.readyState < 2) return;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // iPad Safari may still block an individual file. The synth sound remains.
      });
    },
  };
}
