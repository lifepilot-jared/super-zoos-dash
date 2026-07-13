import { useRef, useState } from "react";
import { SuperZoosDash } from "./game/SuperZoosDash";
import { useCharacterAssetBridge } from "./game/useCharacterAssetBridge";
import { useLivingSchoolExperience } from "./game/useLivingSchoolExperience";
import "./game/startScreenFix.css";
import "./game/schoolAdventurePass.css";
import "./game/professionalUpgrade.css";
import "./game/audioMotionVerification.css";
import "./game/characterStatesV06.css";
import "./game/livingSchoolV10.css";
import "./game/livingSchoolV10Overrides.css";
import "./game/livingSchoolV11.css";
import "./game/chaseCameraV13.css";

function createTrumpetWavUrl(): string {
  const sampleRate = 44_100;
  const durationSeconds = 1.25;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + sampleCount * bytesPerSample);
  const view = new DataView(buffer);

  function writeText(offset: number, text: string): void {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }

  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * bytesPerSample, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, sampleCount * bytesPerSample, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const rise = Math.min(1, time / 0.035);
    const fall = Math.max(0, 1 - time / durationSeconds);
    const envelope = rise * fall * fall;
    const glide = 215 + Math.min(1, time / 0.45) * 175;
    const vibrato = Math.sin(2 * Math.PI * 5.2 * time) * 7;
    const frequency = glide + vibrato;
    const fundamental = Math.sin(2 * Math.PI * frequency * time);
    const harmonic = 0.38 * Math.sin(2 * Math.PI * frequency * 2 * time);
    const sparkle = time > 0.62 ? 0.22 * Math.sin(2 * Math.PI * 660 * time) : 0;
    const sample = Math.max(-1, Math.min(1, (fundamental + harmonic + sparkle) * envelope * 0.72));
    view.setInt16(44 + index * bytesPerSample, Math.round(sample * 32_767), true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

export default function App() {
  const [soundStatus, setSoundStatus] = useState("Tap once to play Peter's trumpet");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  useCharacterAssetBridge();
  useLivingSchoolExperience();

  async function testSound(): Promise<void> {
    setSoundStatus("Starting iPad media audio…");

    try {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

      const url = createTrumpetWavUrl();
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.volume = 1;
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.addEventListener("ended", () => setSoundStatus("Peter's trumpet played ✓"), { once: true });
      await audio.play();
      setSoundStatus("Peter's trumpet is playing now");
    } catch (error) {
      const message = error instanceof Error ? error.name : "unknown error";
      setSoundStatus(`Audio play failed: ${message}`);
    }
  }

  return (
    <>
      <div className="deployment-verification" role="status">
        <strong>V1.4 CHARACTER ANIMATION FOUNDATION</strong>
        <button type="button" onClick={() => void testSound()}>Play Peter Trumpet</button>
        <span>{soundStatus}</span>
      </div>
      <SuperZoosDash />
    </>
  );
}
