/**
 * Unified sound manager combining file-based and procedural audio
 * Automatically falls back to generated sounds if files are missing
 */

import { playSoundEffect, type SoundType as GeneratedSoundType } from "./audioGenerator";
import type { GameSound } from "./gameTypes";

export class SoundManager {
  private fileBasedSounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.7;
  private context: AudioContext | null = null;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Enable audio context for procedural sounds
   */
  private initializeAudioContext(): AudioContext {
    if (this.context) return this.context;

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Unlock audio on first user interaction (iOS requirement)
    document.addEventListener(
      "click",
      () => {
        if (this.context?.state === "suspended") {
          this.context?.resume();
        }
      },
      { once: true },
    );

    return this.context;
  }

  /**
   * Play a sound - tries file-based first, falls back to generated
   */
  play(sound: GameSound): void {
    if (!this.enabled) return;

    const fileSound = this.fileBasedSounds.get(sound);

    if (fileSound) {
      try {
        fileSound.currentTime = 0;
        fileSound.volume = this.masterVolume;
        void fileSound.play();
      } catch (error) {
        console.warn(`Failed to play file-based sound ${sound}:`, error);
        this.playGeneratedFallback(sound);
      }
    } else {
      this.playGeneratedFallback(sound);
    }
  }

  /**
   * Map game sounds to generated audio
   */
  private playGeneratedFallback(sound: GameSound): void {
    const soundTypeMap: Record<GameSound, GeneratedSoundType> = {
      jump: "jump",
      gem: "gem",
      heroPower: "heroPower",
      shield: "shield",
      bump: "bump",
      runEnd: "bump", // Reuse bump sound
    };

    const generatedSoundType = soundTypeMap[sound];
    if (generatedSoundType) {
      try {
        this.initializeAudioContext();
        playSoundEffect(generatedSoundType);
      } catch (error) {
        console.warn(`Failed to generate sound for ${sound}:`, error);
      }
    }
  }

  /**
   * Preload a file-based sound
   */
  preloadSound(sound: GameSound, filePath: string): void {
    if (this.fileBasedSounds.has(sound)) return;

    const audio = new Audio(filePath);
    audio.preload = "auto";
    audio.volume = this.masterVolume;

    audio.addEventListener("error", () => {
      console.warn(`Failed to load sound file: ${filePath}`);
      // Don't cache on error, will fall back to generated
      this.fileBasedSounds.delete(sound);
    });

    this.fileBasedSounds.set(sound, audio);
  }

  /**
   * Set master volume (0 to 1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    this.fileBasedSounds.forEach((audio) => {
      audio.volume = this.masterVolume;
    });

    if (this.context) {
      this.context.destination.maxChannelCount = Math.floor(this.masterVolume * 8);
    }
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.fileBasedSounds.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.fileBasedSounds.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Get sound manager status
   */
  getStatus(): {
    enabled: boolean;
    volume: number;
    fileBasedCount: number;
    audioContextState: string | null;
  } {
    return {
      enabled: this.enabled,
      volume: this.masterVolume,
      fileBasedCount: this.fileBasedSounds.size,
      audioContextState: this.context?.state ?? null,
    };
  }
}
