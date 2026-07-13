import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Vector3, type Group, type Mesh } from "three";
import "./superZoosAdventureV2.css";

type Lane = -1 | 0 | 1;
type TravelMode = "ground" | "launch" | "sky" | "landing";
type HeroId = "peter" | "judy";
type SchoolZone = "entrance" | "oval" | "playground" | "court" | "canteen";
type GestureStart = { x: number; y: number; pointerId: number };
type GemState = { id: number; lane: Lane; progress: number; collected: boolean };

type HeroVisual = {
  name: string;
  superName: string;
  normalFrames: string[];
  superFrames: string[];
  lookBack: string;
  fallback: string;
  accent: string;
};

const BASE_PATH = typeof window !== "undefined" && window.location.pathname.startsWith("/super-zoos-dash") ? "/super-zoos-dash/" : "/";
const asset = (path: string) => `${BASE_PATH}${path.replace(/^\/+/, "")}`;
const LANE_X: Record<Lane, number> = { [-1]: -1.9, [0]: 0, [1]: 1.9 };
const SKY_PATTERN: Lane[] = [-1, 0, 1, 1, 0, -1, 0, 1, -1, 0, 1, 0];
const ZONES: SchoolZone[] = ["entrance", "oval", "playground", "court", "canteen"];
const ZONE_LABELS: Record<SchoolZone, string> = {
  entrance: "Front Entrance",
  oval: "School Oval",
  playground: "Adventure Playground",
  court: "Basketball Court",
  canteen: "Canteen & Hall",
};

const HEROES: Record<HeroId, HeroVisual> = {
  peter: {
    name: "Peter",
    superName: "Super Peter",
    normalFrames: [1, 2, 3, 4].map((n) => asset(`images/characters/animation/peter-normal-run-0${n}.png`)),
    superFrames: [
      asset("images/characters/animation/peter-super-run-01.png"),
      asset("images/characters/animation/peter-super-turn-01.png"),
      asset("images/characters/animation/peter-super-turn-02.png"),
    ],
    lookBack: asset("images/characters/animation/peter-super-look-back.png"),
    fallback: asset("images/characters/peter.svg"),
    accent: "#2588ff",
  },
  judy: {
    name: "Judy",
    superName: "Super Judy",
    normalFrames: [1, 2, 3, 4].map((n) => asset(`images/characters/animation/judy-normal-run-0${n}.png`)),
    superFrames: [
      asset("images/characters/animation/judy-super-run-01.png"),
      asset("images/characters/animation/judy-super-turn-01.png"),
    ],
    lookBack: asset("images/characters/animation/judy-super-look-back.png"),
    fallback: asset("images/characters/judy.svg"),
    accent: "#f052a1",
  },
};

function CameraRig({ lane, mode, jumping }: { lane: Lane; mode: TravelMode; jumping: boolean }) {
  const { camera } = useThree();
  const targetPosition = useRef(new Vector3());
  const targetLook = useRef(new Vector3());

  useFrame((_, delta) => {
    const sky = mode === "sky";
    const launch = mode === "launch";
    const landing = mode === "landing";
    const targetX = lane * -0.42;
    const targetY = sky ? 6.5 : launch ? 5.6 : landing ? 4.9 : jumping ? 5.05 : 4.35;
    const targetZ = sky ? 10.8 : 9.7;
    targetPosition.current.set(targetX, targetY, targetZ);
    camera.position.lerp(targetPosition.current, Math.min(1, delta * 4.8));
    targetLook.current.set(lane * 0.2, sky ? 2.5 : 0.7, sky ? -8 : -12);
    camera.lookAt(targetLook.current);
    camera.rotation.z += ((lane * -0.012) - camera.rotation.z) * Math.min(1, delta * 5);
  });
  return null;
}

function MovingSchoolProp({ x, z, kind, speed, zone }: { x: number; z: number; kind: "tree" | "building" | "fence" | "shade" | "hoop"; speed: number; zone: SchoolZone }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.z += delta * speed;
    if (group.current.position.z > 12) group.current.position.z -= 92;
  });

  const buildingColor = zone === "canteen" ? "#e0b570" : zone === "entrance" ? "#d39b64" : "#d8aa69";
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
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow><boxGeometry args={[5.2, 2.7, 2.2]} /><meshStandardMaterial color={buildingColor} roughness={0.92} /></mesh>
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
      {kind === "shade" && (
        <group>
          <mesh position={[0, 2.6, 0]} rotation={[-0.12, 0, 0]} castShadow><boxGeometry args={[4.2, 0.12, 3]} /><meshStandardMaterial color="#ec7d3d" roughness={0.8} /></mesh>
          {[-1.7, 1.7].map((postX) => <mesh key={postX} position={[postX, 1.25, 0]}><cylinderGeometry args={[0.08, 0.08, 2.5, 8]} /><meshStandardMaterial color="#566573" /></mesh>)}
        </group>
      )}
      {kind === "hoop" && (
        <group>
          <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[0.08, 0.08, 3.6, 8]} /><meshStandardMaterial color="#5b6670" /></mesh>
          <mesh position={[0, 3.4, 0.25]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.48, 0.07, 10, 24]} /><meshStandardMaterial color="#e65a2f" /></mesh>
          <mesh position={[0, 3.55, 0]}><boxGeometry args={[1.5, 0.9, 0.08]} /><meshStandardMaterial color="#f5f2e8" /></mesh>
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
      if (marker.position.z > 8) marker.position.z -= 78;
    }
  });
  return <>{Array.from({ length: 24 }, (_, index) => [-0.95, 0.95].map((x, laneIndex) => (
    <mesh key={`${index}-${laneIndex}`} ref={(node) => { if (node) refs.current[index * 2 + laneIndex] = node; }} position={[x, 0.024, -index * 3.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[0.07, 1.25]} /><meshStandardMaterial color="#f5f0df" transparent opacity={0.78} />
    </mesh>
  )))}</>;
}

function Trampoline({ progress }: { progress: number }) {
  const z = -34 + progress * 37;
  return <group position={[0, 0.2, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[2.75, 2.75, 0.22, 36]} /><meshStandardMaterial color="#257bd8" metalness={0.14} roughness={0.42} /></mesh>
    <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.35, 36]} /><meshStandardMaterial color="#ffda3f" emissive="#df7d00" emissiveIntensity={0.36} /></mesh>
  </group>;
}

function GemMesh({ gem }: { gem: GemState }) {
  if (gem.collected) return null;
  const z = -28 + gem.progress * 33;
  return <group position={[LANE_X[gem.lane], 3.25 + Math.sin(gem.id * 0.9) * 0.5, z]} rotation={[0, gem.progress * 5, gem.progress * 2]}>
    <mesh><torusGeometry args={[0.42, 0.13, 12, 28]} /><meshStandardMaterial color="#ffd73f" emissive="#ff9d00" emissiveIntensity={0.85} metalness={0.22} roughness={0.25} /></mesh>
    <pointLight color="#ffd45d" intensity={1.15} distance={3.5} />
  </group>;
}

function ZoneScenery({ zone, speed }: { zone: SchoolZone; speed: number }) {
  if (zone === "playground") {
    return <><MovingSchoolProp x={-8.6} z={-30} kind="shade" speed={speed * 0.82} zone={zone} /><MovingSchoolProp x={8.4} z={-47} kind="shade" speed={speed * 0.82} zone={zone} /></>;
  }
  if (zone === "court") {
    return <><MovingSchoolProp x={-7.6} z={-28} kind="hoop" speed={speed * 0.9} zone={zone} /><MovingSchoolProp x={7.6} z={-52} kind="hoop" speed={speed * 0.9} zone={zone} /></>;
  }
  if (zone === "canteen" || zone === "entrance") {
    return <><MovingSchoolProp x={-10.2} z={-34} kind="building" speed={speed * 0.76} zone={zone} /><MovingSchoolProp x={10.4} z={-58} kind="building" speed={speed * 0.76} zone={zone} /></>;
  }
  return <><MovingSchoolProp x={-7.6} z={-24} kind="fence" speed={speed} zone={zone} /><MovingSchoolProp x={7.6} z={-48} kind="fence" speed={speed} zone={zone} /></>;
}

function Scene({ mode, lane, jumping, trampolineProgress, gems, zone }: { mode: TravelMode; lane: Lane; jumping: boolean; trampolineProgress: number; gems: GemState[]; zone: SchoolZone }) {
  const speed = mode === "sky" ? 11.6 : 8.4;
  const roadColor = zone === "court" ? "#55707d" : zone === "playground" ? "#6c665f" : "#4b5157";
  return <>
    <CameraRig lane={lane} mode={mode} jumping={jumping} />
    <color attach="background" args={[mode === "sky" ? "#63c6ff" : "#8fd5ee"]} />
    <fog attach="fog" args={[mode === "sky" ? "#bceaff" : "#c8e1e8", 20, 68]} />
    <ambientLight intensity={1.15} /><directionalLight position={[7, 13, 8]} intensity={2.35} castShadow /><hemisphereLight color="#d8f4ff" groundColor="#49664d" intensity={0.65} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -27]} receiveShadow><planeGeometry args={[18, 92]} /><meshStandardMaterial color="#3f7449" roughness={1} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -27]} receiveShadow><planeGeometry args={[6.8, 92]} /><meshStandardMaterial color={roadColor} roughness={0.97} /></mesh>
    <RouteMarkers speed={speed} />
    {Array.from({ length: 13 }, (_, i) => <MovingSchoolProp key={`lt-${i}`} x={-7.5 - (i % 2) * 0.9} z={-i * 7 - 4} kind="tree" speed={speed * 0.9} zone={zone} />)}
    {Array.from({ length: 13 }, (_, i) => <MovingSchoolProp key={`rt-${i}`} x={7.5 + (i % 2) * 0.9} z={-i * 7 - 7} kind="tree" speed={speed * 0.9} zone={zone} />)}
    <ZoneScenery zone={zone} speed={speed} />
    {mode === "ground" && <Trampoline progress={trampolineProgress} />}
    {mode === "sky" && gems.map((gem) => <GemMesh key={gem.id} gem={gem} />)}
    <Suspense fallback={null} />
  </>;
}

function CharacterOverlay({ hero, lane, mode, jumping, celebrating }: { hero: HeroId; lane: Lane; mode: TravelMode; jumping: boolean; celebrating: boolean }) {
  const visual = HEROES[hero];
  const frames = mode === "ground" ? visual.normalFrames : visual.superFrames;
  const [frameIndex, setFrameIndex] = useState(0);
  const [src, setSrc] = useState(frames[0]);

  useEffect(() => {
    setFrameIndex(0);
    setSrc(frames[0]);
    if (celebrating) return;
    const timer = window.setInterval(() => setFrameIndex((value) => (value + 1) % frames.length), mode === "sky" ? 160 : 110);
    return () => window.clearInterval(timer);
  }, [frames, mode, celebrating]);

  useEffect(() => setSrc(celebrating ? visual.lookBack : (frames[frameIndex] ?? frames[0])), [celebrating, frameIndex, frames, visual.lookBack]);

  return <div className={`v2-character hero-${hero} travel-${mode} ${jumping ? "is-jumping" : ""} ${celebrating ? "is-celebrating" : ""}`} style={{ "--lane": lane, "--hero-accent": visual.accent } as CSSProperties} aria-label={`${visual.name} running`}>
    <div className="v2-character-glow" /><img src={src} alt="" onError={() => setSrc(visual.fallback)} draggable={false} /><div className="v2-character-shadow" />
  </div>;
}

function makeSkyGems(): GemState[] {
  return SKY_PATTERN.map((lane, index) => ({ id: index, lane, progress: -index * 0.105, collected: false }));
}

export function SuperZoosAdventureV2() {
  const [hero, setHero] = useState<HeroId>("peter");
  const [lane, setLane] = useState<Lane>(0);
  const [jumping, setJumping] = useState(false);
  const [mode, setMode] = useState<TravelMode>("ground");
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [trampolineProgress, setTrampolineProgress] = useState(0);
  const [gems, setGems] = useState<GemState[]>(makeSkyGems);
  const [celebrating, setCelebrating] = useState(false);
  const gestureRef = useRef<GestureStart | null>(null);
  const celebrationTimer = useRef<number | null>(null);

  const zone = ZONES[Math.floor(distance / 170) % ZONES.length] ?? "entrance";

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      if (mode === "ground") {
        setDistance((value) => value + dt * 38);
        setTrampolineProgress((value) => {
          const next = value + dt * 0.092;
          if (next >= 0.985) {
            window.setTimeout(() => setMode("launch"), 0);
            return 0;
          }
          return next;
        });
      }
      if (mode === "sky") {
        setDistance((value) => value + dt * 52);
        setGems((current) => current.map((gem) => {
          if (gem.collected) return gem;
          const nextProgress = gem.progress + dt * 0.235;
          if (nextProgress >= 0.84 && nextProgress <= 0.98 && gem.lane === lane) {
            setScore((value) => value + 10);
            setCelebrating(true);
            if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
            celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 520);
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
    const toLanding = window.setTimeout(() => setMode("landing"), 6200);
    const toGround = window.setTimeout(() => {
      setMode("ground");
      setTrampolineProgress(0);
      setGems(makeSkyGems());
    }, 7250);
    return () => {
      window.clearTimeout(toSky);
      window.clearTimeout(toLanding);
      window.clearTimeout(toGround);
    };
  }, [mode]);

  useEffect(() => () => {
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
  }, []);

  const stepLane = (direction: -1 | 1) => setLane((current) => Math.max(-1, Math.min(1, current + direction)) as Lane);
  const jump = () => {
    if (mode !== "ground" || jumping) return;
    setJumping(true);
    window.setTimeout(() => setJumping(false), 850);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    gestureRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* iPad fallback */ }
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 0.7) {
      stepLane(dx > 0 ? 1 : -1);
      return;
    }
    if (dy < -40 || Math.abs(dx) < 18) jump();
  };

  return <main className={`v2-app mode-${mode}`}>
    <header className="v2-hud">
      <div><span className="v2-kicker">SUPER ZOOS ADVENTURE V2</span><h1>School Sky Rescue</h1></div>
      <div className="v2-hud-right"><span className="v2-zone">{ZONE_LABELS[zone]}</span><span className="v2-score">Gems {score}</span><span className="v2-status">{mode === "sky" ? "Sky Gem Run" : mode === "launch" ? "Super Launch" : mode === "landing" ? "Landing" : "School Route"}</span></div>
    </header>
    <section className="v2-stage" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gestureRef.current = null; }} aria-label="Swipe left or right to move. Swipe up or tap to jump.">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 4.35, 9.7], fov: 43 }}><Scene mode={mode} lane={lane} jumping={jumping} trampolineProgress={trampolineProgress} gems={gems} zone={zone} /></Canvas>
      <CharacterOverlay hero={hero} lane={lane} mode={mode} jumping={jumping} celebrating={celebrating} />
      <div className="v2-message">{mode === "ground" && `${ZONE_LABELS[zone]} • Swipe lanes • Tap or swipe up to jump`}{mode === "launch" && `${HEROES[hero].superName.toUpperCase()} LAUNCH!`}{mode === "sky" && "Fly left and right through the golden gems!"}{mode === "landing" && "Safe landing…"}</div>
      <div className="v2-trampoline-meter" aria-hidden="true"><span style={{ width: `${trampolineProgress * 100}%` }} /></div>
    </section>
    <nav className="v2-controls" aria-label="Game controls" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => stepLane(-1)}>Left</button>
      <button type="button" onClick={() => stepLane(1)}>Right</button>
      <button type="button" className="jump" onClick={jump} disabled={mode !== "ground"}>Jump</button>
      <button type="button" className="hero-switch" onClick={() => setHero((value) => value === "peter" ? "judy" : "peter")} disabled={mode !== "ground"}>{HEROES[hero].name}</button>
    </nav>
  </main>;
}
