import { useState } from "react";
import { SuperZoosDash } from "./game/SuperZoosDash";
import "./game/startScreenFix.css";
import "./game/schoolAdventurePass.css";
import "./game/professionalUpgrade.css";
import "./game/audioMotionVerification.css";
import "./game/livingSchoolV06.css";

function playDirectSoundCheck() {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return false;

  const context = new AudioContextClass();
  const start = context.currentTime + 0.02;
  const notes = [392, 523, 659];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 0 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, start + index * 0.12);
    gain.gain.setValueAtTime(0.0001, start + index * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.14, start + index * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.12 + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + index * 0.12);
    oscillator.stop(start + index * 0.12 + 0.23);
  });

  void context.resume();
  return true;
}

export default function App() {
  const [soundStatus, setSoundStatus] = useState("Tap to test sound");

  function testSound() {
    const worked = playDirectSoundCheck();
    setSoundStatus(worked ? "Sound test played" : "Audio unavailable");
  }

  return (
    <>
      <div className="deployment-verification" role="status">
        <strong>V0.6 WORK BRANCH — LIVING SCHOOL</strong>
        <button type="button" onClick={testSound}>Test Sound</button>
        <span>{soundStatus}</span>
      </div>
      <SuperZoosDash />
    </>
  );
}
