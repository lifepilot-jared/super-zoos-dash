import type { GameSound } from "./gameTypes";

// Sound paths for audio feedback. Falls back gracefully if files missing.
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

export function createGameAudio(isEnabled: () => boolean): GameAudioController {
  const cache = new Map<GameSound, HTMLAudioElement>();
  let unlocked = false;

  function getAudio(sound: GameSound): HTMLAudioElement | null {
    const path = SOUND_PATHS[sound];
    if (!path) return null;

    const cached = cache.get(sound);
    if (cached) return cached;

    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = 0.55;
    cache.set(sound, audio);
    return audio;
  }

  return {
    unlock() {
      unlocked = true;
    },
    play(sound) {
      if (!unlocked || !isEnabled()) return;
      const audio = getAudio(sound);
      if (!audio) return;

      audio.currentTime = 0;
      void audio.play().catch(() => {
        // iPad Safari can block audio until a tap unlocks it. The game must never crash.
      });
    },
  };
}
