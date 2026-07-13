import { useRef, useState } from "react";
import { SuperZoosDash } from "./game/SuperZoosDash";
import { useCharacterAssetBridge } from "./game/useCharacterAssetBridge";
import { useLivingSchoolExperience } from "./game/useLivingSchoolExperience";
import "./game/startScreenFix.css";
import "./game/schoolAdventurePass.css";
import "./game/professionalUpgrade.css";
import "./game/audioMotionVerification.css";
import "./game/livingSchoolV06.css";
import "./game/characterStatesV06.css";
import "./game/livingSchoolV07.css";

type SafariWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

async function playDirectSoundCheck(contextRef: { current: AudioContext | null }): Promise<boolean> {
  const AudioContextClass = window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
  if (!AudioContextClass) return false;

  const context = contextRef.current ?? new AudioContextClass();
  contextRef.current = context;

  try {
    if (context.state !== "running") await context.resume();
    const start = context.currentTime + 0.035;
    const notes = [220, 330, 523, 784];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index < 2 ? "sawtooth" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.115);
      if (index === 0) oscillator.frequency.exponentialRampToValueAtTime(390, start + 0.22);
      gain.gain.setValueAtTime(0.0001, start + index * 0.115);
      gain.gain.exponentialRampToValueAtTime(0.18, start + index * 0.115 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.115 + 0.2);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * 0.115);
      oscillator.stop(start + index * 0.115 + 0.23);
    });

    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const [soundStatus, setSoundStatus] = useState("Tap once to verify sound");
  const soundContextRef = useRef<AudioContext | null>(null);
  useCharacterAssetBridge();
  useLivingSchoolExperience();

  async function testSound() {
    setSoundStatus("Starting audio…");
    const worked = await playDirectSoundCheck(soundContextRef);
    setSoundStatus(worked ? "Sound active ✓" : "Audio blocked — check iPad mute/volume");
  }

  return (
    <>
      <div className="deployment-verification" role="status">
        <strong>V0.7 LIVE SCHOOL + SOUND</strong>
        <button type="button" onClick={() => void testSound()}>Test Sound</button>
        <span>{soundStatus}</span>
      </div>
      <SuperZoosDash />
    </>
  );
}
