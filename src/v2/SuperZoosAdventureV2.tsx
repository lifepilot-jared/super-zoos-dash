import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Group, Mesh } from "three";
import "./superZoosAdventureV2.css";

type Lane = -1 | 0 | 1;
type TravelMode = "ground" | "launch" | "sky" | "landing";
type HeroId = "peter" | "judy";
type GestureStart = { x: number; y: number; pointerId: number };
type GemState = { id: number; lane: Lane; progress: number; collected: boolean };

type HeroVisual = {
  name: string;
  normalFrames: string[];
  superFrames: string[];
  fallback: string;
  accent: string;
};

const BASE_PATH = typeof window !== "undefined" && window.location.pathname.startsWith("/super-zoos-dash") ? "/super-zoos-dash/" : "/";
const asset = (path: string) => `${BASE_PATH}${path.replace(/^\/+/, "")}`;
const LANE_X: Record<Lane, number> = { [-1]: -1.9, [0]: 0, [1]: 1.9 };
const SKY_PATTERN: Lane[] = [-1, 0, 1, 1, 0, -1, 0, 1, -1, 0];

const HEROES: Record<HeroId, HeroVisual> = {
  peter: {
    name: "Peter",
    normalFrames: [1, 2, 3, 4].map((n) => asset(`images/characters/animation/peter-normal-run-0${n}.png`)),
    superFrames: [
      asset("images/characters/animation/peter-super-run-01.png"),
      asset("images/characters/animation/peter-super-turn-01.png"),
      asset("images/characters/animation/peter-super-turn-02.png"),
    ],
    fallback: asset("images/characters/peter.svg"),
    accent: "#2588ff",
  },
  judy: {
    name: "Judy",
    normalFrames: [1, 2, 3, 4].map((n) => asset(`images/characters/animation/judy-normal-run-0${n}.png`)),
    superFrames: [
      asset("images/characters/animation/judy-super-run-01.png"),
      asset("images/characters/animation/judy-super-turn-01.png"),
    ],
    fallback: asset("images/characters/judy.svg"),
    accent: "#f052a1",
  },
};

function MovingSchoolProp({ x, z, kind, speed }: { x: number; z: number; kind: "tree" | "building" | "fence"; speed: number }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.z += delta * speed;
    if (group.current.position.z > 11) group.current.position.z -= 86;
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {kind === "tree" && (
        <>
          <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.16, 0.28, 2.5, 10]} /><meshStandardMaterial color="#765034" roughness={1} /></mesh>
          <mesh position={[0, 2.75, 0]} castShadow><sphereGeometry args={[1.05, 16, 12]} /><meshStandardMaterial color="#477f55" roughness={1} /></mesh>
          <mesh position={[0.65, 2.55, 0]} castShadow><sphereGeometry args={[0.72, 14, 10]} /><meshStandardMaterial color="#5b9965" roughness={1} /></mesh>
        </>
      )}
      {kind === "building" && (
        <group>
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow><boxGeometry args={[5.2, 2.7, 2.2]} /><meshStandardMaterial color="#d8aa69" roughness={0.92} /></mesh>
          <mesh position={[0, 2.82, 0]} rotation={[0, 0, Math.PI / 4]} castShadow><boxGeometry args={[3.7, 3.7, 2.25]} /><meshStandardMaterial color="#a95a42" roughness={0.9} /></mesh>
          {[-1.65, -0.55, 0.55, 1.65].map((windowX) => <mesh key={windowX} position={[windowX, 1.45, 1.12]}><boxGeometry args={[0.62, 0.78, 0.05]} /><meshStandardMaterial color="#9ed6e6" /></mesh>)}
        </group>
      )}
      {kind === "fence" && (
        <group>
          {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((postX) => <mesh key={postX} position={[postX, 0.72, 0]} castShadow><boxGeometry args={[0.1, 1.45, 0.1]} /><meshStandardMaterial color="#efe8d7" roughness={0.9} /></mesh>)}
          <mesh position={[0, 0.95, 0]} castShadow><boxGeometry args={[3.4, 0.1, 0.1]} /><meshStandardMaterial color="#efe8d7" roughness={0.9} /></mesh>
        </group>
      )}
    </group>
  );
}

function RouteMarkers({ speed }: { speed: number }) {
  const refs = useRef<Mesh[]>([]);
  useFrame((_, delta) => {
    for (const marker of refs.current) {
      marker.position.z += delta * speed;
      if (marker.position.z > 8) marker.position.z -= 72;
    }
  });
  return <>{Array.from({ length: 22 }, (_, index) => [-0.95, 0.95].map((x, laneIndex) => (
    <mesh key={`${index}-${laneIndex}`} ref={(node) => { if (node) refs.current[index * 2 + laneIndex] = node; }} position={[x, 0.024, -index * 3.3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[0.07, 1.35]} /><meshStandardMaterial color="#f5f0df" transparent opacity={0.82} />
    </mesh>
  )))}</>;
}

function Trampoline({ progress }: { progress: number }) {
  const z = -31 + progress * 34;
  return <group position={[0, 0.2, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[2.75, 2.75, 0.22, 36]} /><meshStandardMaterial color="#257bd8" metalness={0.14} roughness={0.42} /></mesh>
    <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.35, 36]} /><meshStandardMaterial color="#ffda3f" emissive="#df7d00" emissiveIntensity={0.32} /></mesh>
  </group>;
}

function GemMesh({ gem }: { gem: GemState }) {
  if (gem.collected) return null;
  const z = -26 + gem.progress * 31;
  return <group position={[LANE_X[gem.lane], 3.2 + Math.sin(gem.id * 0.9) * 0.5, z]} rotation={[0, gem.progress * 5, gem.progress * 2]}>
    <mesh><torusGeometry args={[0.42, 0.13, 12, 28]} /><meshStandardMaterial color="#ffd73f" emissive="#ff9d00" emissiveIntensity={0.8} metalness={0.22} roughness={0.25} /></mesh>
    <pointLight color="#ffd45d" intensity={1.15} distance={3.5} />
  </group>;
}

function Scene({ mode, trampolineProgress, gems }: { mode: TravelMode; trampolineProgress: number; gems: GemState[] }) {
  const speed = mode === "sky" ? 11.2 : 8.2;
  return <>
    <color attach="background" args={[mode === "sky" ? "#63c6ff" : "#8fd5ee"]} />
    <fog attach="fog" args={[mode === "sky" ? "#bceaff" : "#c8e1e8", 20, 66]} />
    <ambientLight intensity={1.15} /><directionalLight position={[7, 13, 8]} intensity={2.35} castShadow /><hemisphereLight color="#d8f4ff" groundColor="#49664d" intensity={0.65} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -25]} receiveShadow><planeGeometry args={[9.3, 86]} /><meshStandardMaterial color="#3f7449" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -25]} receiveShadow><planeGeometry args={[6.6, 86]} /><meshStandardMaterial color="#4b5157" roughness={0.97} /></mesh>
    <RouteMarkers speed={speed} />
    {Array.from({ length: 12 }, (_, i) => <MovingSchoolProp key={`lt-${i}`} x={-7.4 - (i % 2) * 0.85} z={-i * 7 - 4} kind="tree" speed={speed * 0.9} />)}
    {Array.from({ length: 12 }, (_, i) => <MovingSchoolProp key={`rt-${i}`} x={7.4 + (i % 2) * 0.85} z={-i * 7 - 7} kind="tree" speed={speed * 0.9} />)}
    <MovingSchoolProp x={-10.2} z={-32} kind="building" speed={speed * 0.78} /><MovingSchoolProp x={10.4} z={-49} kind="building" speed={speed * 0.78} />
    <MovingSchoolProp x={-7.6} z={-18} kind="fence" speed={speed} /><MovingSchoolProp x={7.6} z={-25} kind="fence" speed={speed} />
    {mode === "ground" && <Trampoline progress={trampolineProgress} />}
    {mode === "sky" && gems.map((gem) => <GemMesh key={gem.id} gem={gem} />)}
    <Suspense fallback={null} />
  </>;
}

function CharacterOverlay({ hero, lane, mode, jumping }: { hero: HeroId; lane: Lane; mode: TravelMode; jumping: boolean }) {
  const visual = HEROES[hero];
  const frames = mode === "ground" ? visual.normalFrames : visual.superFrames;
  const [frameIndex, setFrameIndex] = useState(0);
  const [src, setSrc] = useState(frames[0]);

  useEffect(() => {
    setFrameIndex(0); setSrc(frames[0]);
    const timer = window.setInterval(() => setFrameIndex((value) => (value + 1) % frames.length), mode === "sky" ? 165 : 115);
    return () => window.clearInterval(timer);
  }, [frames, mode]);
  useEffect(() => setSrc(frames[frameIndex] ?? frames[0]), [frameIndex, frames]);

  return <div className={`v2-character hero-${hero} travel-${mode} ${jumping ? "is-jumping" : ""}`} style={{ "--lane": lane, "--hero-accent": visual.accent } as CSSProperties} aria-label={`${visual.name} running`}>
    <div className="v2-character-glow" /><img src={src} alt="" onError={() => setSrc(visual.fallback)} draggable={false} /><div className="v2-character-shadow" />
  </div>;
}

function makeSkyGems(): GemState[] {
  return SKY_PATTERN.map((lane, index) => ({ id: index, lane, progress: -index * 0.11, collected: false }));
}

export function SuperZoosAdventureV2() {
  const [hero, setHero] = useState<HeroId>("peter");
  const [lane, setLane] = useState<Lane>(0);
  const [jumping, setJumping] = useState(false);
  const [mode, setMode] = useState<TravelMode>("ground");
  const [score, setScore] = useState(0);
  const [trampolineProgress, setTrampolineProgress] = useState(0);
  const [gems, setGems] = useState<GemState[]>(makeSkyGems);
  const gestureRef = useRef<GestureStart | null>(null);

  useEffect(() => {
    let frame = 0; let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000); previous = now;
      if (mode === "ground") {
        setTrampolineProgress((value) => {
          const next = value + dt * 0.095;
          if (next >= 0.98) { window.setTimeout(() => setMode("launch"), 0); return 0; }
          return next;
        });
      }
      if (mode === "sky") {
        setGems((current) => current.map((gem) => {
          if (gem.collected) return gem;
          const nextProgress = gem.progress + dt * 0.23;
          if (nextProgress >= 0.84 && nextProgress <= 0.96 && gem.lane === lane) {
            setScore((value) => value + 10);
            return { ...gem, progress: nextProgress, collected: true };
          }
          return { ...gem, progress: nextProgress, collected: nextProgress > 1.08 };
        }));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, lane]);

  useEffect(() => {
    if (mode !== "launch") return;
    setGems(makeSkyGems());
    const toSky = window.setTimeout(() => setMode("sky"), 720);
    const toLanding = window.setTimeout(() => setMode("landing"), 6100);
    const toGround = window.setTimeout(() => { setMode("ground"); setTrampolineProgress(0); setGems(makeSkyGems()); }, 7100);
    return () => { clearTimeout(toSky); clearTimeout(toLanding); clearTimeout(toGround); };
  }, [mode]);

  const stepLane = (direction: -1 | 1) => setLane((current) => Math.max(-1, Math.min(1, current + direction)) as Lane);
  const jump = () => {
    if (mode !== "ground" || jumping) return;
    setJumping(true); window.setTimeout(() => setJumping(false), 820);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault(); gestureRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* iPad fallback */ }
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault(); const start = gestureRef.current; gestureRef.current = null; if (!start) return;
    const dx = event.clientX - start.x; const dy = event.clientY - start.y;
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 0.72) { stepLane(dx > 0 ? 1 : -1); return; }
    if (dy < -44) { jump(); return; }
    jump();
  };

  return <main className={`v2-app mode-${mode}`}>
    <header className="v2-hud"><div><span className="v2-kicker">SUPER ZOOS ADVENTURE</span><h1>School Sky Rescue</h1></div><div className="v2-hud-right"><span className="v2-score">Gems {score}</span><span className="v2-status">{mode === "sky" ? "Sky Gem Run" : mode === "launch" ? "Super Launch" : mode === "landing" ? "Landing" : "School Route"}</span></div></header>
    <section className="v2-stage" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gestureRef.current = null; }} aria-label="Swipe left or right to move. Swipe up or tap to jump.">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 4.4, 9.7], fov: 42 }}><Scene mode={mode} trampolineProgress={trampolineProgress} gems={gems} /></Canvas>
      <CharacterOverlay hero={hero} lane={lane} mode={mode} jumping={jumping} />
      <div className="v2-message">{mode === "ground" && "Swipe lanes • Tap or swipe up to jump • Trampoline ahead"}{mode === "launch" && `SUPER ${HEROES[hero].name.toUpperCase()} LAUNCH!`}{mode === "sky" && "Fly left and right through the golden gems!"}{mode === "landing" && "Safe landing…"}</div>
      <div className="v2-trampoline-meter" aria-hidden="true"><span style={{ width: `${trampolineProgress * 100}%` }} /></div>
    </section>
    <nav className="v2-controls" aria-label="Game controls" onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => stepLane(-1)}>Left</button><button type="button" onClick={() => stepLane(1)}>Right</button><button type="button" className="jump" onClick={jump} disabled={mode !== "ground"}>Jump</button><button type="button" className="hero-switch" onClick={() => setHero((value) => value === "peter" ? "judy" : "peter")} disabled={mode !== "ground"}>{HEROES[hero].name}</button></nav>
  </main>;
}
