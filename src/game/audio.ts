import type { GameSound } from "./gameTypes";

// Empty by default so the MVP never throws 404 errors before real clips are uploaded.
// Add paths such as "/super-zoos-dash/sounds/peter-trumpet.mp3" after clips are committed.
const SOUND_PATHS: Partial<Record<GameSound, string>> = {};

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
