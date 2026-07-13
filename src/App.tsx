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
import "./game/livingSchoolV08.css";

type SafariWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type SoundTestResult = {
  started: boolean;
  state: AudioContextState | "unsupported";
};

async function playDirectSoundCheck(contextRef: { current: AudioContext | null }): Promise<SoundTestResult> {
  const AudioContextClass = window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
  if (!AudioContextClass) return { started: false, state: "unsupported" };

  const context = contextRef.current ?? new AudioContextClass();
  contextRef.current = context;

  try {
    if (context.state !== "running") await context.resume();
    if (context.state !== "running") return { started: false, state: context.state };

    const start = context.currentTime + 0.045;
    const notes = [196, 262, 392, 523, 784];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index < 2 ? "sawtooth" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.15);
      if (index === 0) oscillator.frequency.exponentialRampToValueAtTime(420, start + 0.32);
      gain.gain.setValueAtTime(0.0001, start + index * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.32, start + index * 0.15 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.15 + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + index * 0.15);
      oscillator.stop(start + index * 0.15 + 0.36);
    });

    return { started: true, state: context.state };
  } catch {
    return { started: false, state: context.state };
  }
}

export default function App() {
  const [soundStatus, setSoundStatus] = useState("Tap to test iPad audio");
  const soundContextRef = useRef<AudioContext | null>(null);
  useCharacterAssetBridge();
  useLivingSchoolExperience();

  async function testSound() {
    setSoundStatus("Requesting Safari audio…");
    const result = await playDirectSoundCheck(soundContextRef);

    if (!result.started) {
      setSoundStatus(`Audio engine: ${result.state}. Check iPad volume/output.`);
      return;
    }

    setSoundStatus(`Audio engine running. Did you hear the trumpet?`);
  }

  return (
    <>
      <div className="deployment-verification" role="status">
        <strong>V0.8 PASSING SCHOOL + AUDIO CHECK</strong>
        <button type="button" onClick={() => void testSound()}>Test Sound</button>
        <span>{soundStatus}</span>
      </div>
      <SuperZoosDash />
    </>
  );
}
