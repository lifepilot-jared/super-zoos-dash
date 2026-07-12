import type { GameSound } from "./gameTypes";

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

  function getContext() {
    const Constructor = getAudioContextConstructor();
    if (!Constructor) return null;
    context ??= new Constructor();
    return context;
  }

  async function ensureRunningContext() {
    const ctx = getContext();
    if (!ctx) return null;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }
    return ctx;
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
    filter.frequency.value = 1500;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
  }

  function synthesize(ctx: AudioContext, sound: GameSound) {
    const now = ctx.currentTime + 0.012;
    switch (sound) {
      case "jump":
        tone(ctx, 300, now, 0.12, 0.22, "sine", 760);
        tone(ctx, 520, now + 0.045, 0.11, 0.12, "triangle", 980);
        noise(ctx, now + 0.14, 0.05, 0.045);
        break;
      case "gem":
        tone(ctx, 210, now, 0.28, 0.22, "sawtooth", 430);
        tone(ctx, 430, now + 0.04, 0.22, 0.11, "sine", 690);
        tone(ctx, 820, now + 0.18, 0.16, 0.08, "triangle", 1200);
        tone(ctx, 1180, now + 0.29, 0.14, 0.06, "sine", 1500);
        break;
      case "heroPower":
        tone(ctx, 160, now, 0.46, 0.22, "sawtooth", 980);
        tone(ctx, 350, now + 0.07, 0.36, 0.14, "square", 1320);
        tone(ctx, 780, now + 0.24, 0.28, 0.10, "triangle", 1700);
        noise(ctx, now, 0.36, 0.045);
        break;
      case "shield":
        tone(ctx, 390, now, 0.42, 0.14, "sine", 650);
        tone(ctx, 620, now + 0.04, 0.38, 0.10, "triangle", 980);
        tone(ctx, 980, now + 0.12, 0.30, 0.07, "sine", 1260);
        break;
      case "bump":
        tone(ctx, 150, now, 0.18, 0.20, "sine", 70);
        noise(ctx, now, 0.13, 0.06);
        break;
      case "runEnd":
        tone(ctx, 392, now, 0.18, 0.11, "triangle");
        tone(ctx, 523, now + 0.15, 0.20, 0.12, "triangle");
        tone(ctx, 659, now + 0.31, 0.25, 0.13, "triangle");
        tone(ctx, 784, now + 0.49, 0.32, 0.11, "sine");
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
    audio.volume = sound === "bump" ? 0.45 : 0.75;
    cache.set(sound, audio);
    return audio;
  }

  return {
    unlock() {
      unlocked = true;
      void ensureRunningContext().then((ctx) => {
        if (!ctx) return;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.02);
      });
    },
    play(sound) {
      if (!unlocked || !isEnabled()) return;
      void ensureRunningContext().then((ctx) => {
        if (!ctx || !isEnabled()) return;
        synthesize(ctx, sound);
      });

      const audio = getUploadedAudio(sound);
      if (!audio) return;
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Missing custom clips or iPad autoplay restrictions must never break gameplay.
      });
    },
  };
}
