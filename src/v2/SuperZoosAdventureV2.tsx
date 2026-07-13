import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Group, Mesh } from "three";
import "./superZoosAdventureV2.css";

type Lane = -1 | 0 | 1;
type TravelMode = "ground" | "launch" | "sky" | "landing";
type HeroId = "peter" | "judy";

type GestureStart = { x: number; y: number; pointerId: number };

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

function SchoolProp({ x, z, kind }: { x: number; z: number; kind: "tree" | "building" | "fence" }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.z += delta * 7.5;
    if (group.current.position.z > 10) group.current.position.z -= 82;
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {kind === "tree" && (
        <>
          <mesh position={[0, 1.25, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.26, 2.5, 9]} />
            <meshStandardMaterial color="#7b5134" roughness={1} />
          </mesh>
          <mesh position={[0, 2.75, 0]} castShadow>
            <sphereGeometry args={[1.05, 15, 12]} />
            <meshStandardMaterial color="#477f55" roughness={1} />
          </mesh>
          <mesh position={[0.65, 2.55, 0]} castShadow>
            <sphereGeometry args={[0.72, 12, 10]} />
            <meshStandardMaterial color="#5b9965" roughness={1} />
          </mesh>
        </>
      )}
      {kind === "building" && (
        <group>
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.2, 2.7, 2.2]} />
            <meshStandardMaterial color="#d8aa69" roughness={0.92} />
          </mesh>
          <mesh position={[0, 2.92, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[3.9, 3.9, 2.35]} />
            <meshStandardMaterial color="#a95a42" roughness={0.9} />
          </mesh>
          {[-1.65, -0.55, 0.55, 1.65].map((windowX) => (
            <mesh key={windowX} position={[windowX, 1.45, 1.12]}>
              <boxGeometry args={[0.62, 0.78, 0.05]} />
              <meshStandardMaterial color="#9ed6e6" emissive="#5f9fb6" emissiveIntensity={0.08} />
            </mesh>
          ))}
        </group>
      )}
      {kind === "fence" && (
        <group>
          {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((postX) => (
            <mesh key={postX} position={[postX, 0.72, 0]} castShadow>
              <boxGeometry args={[0.1, 1.45, 0.1]} />
              <meshStandardMaterial color="#efe8d7" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[3.4, 0.1, 0.1]} />
            <meshStandardMaterial color="#efe8d7" roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function RouteMarkers({ speed = 8 }: { speed?: number }) {
  const markerRefs = useRef<Mesh[]>([]);
  useFrame((_, delta) => {
    for (const marker of markerRefs.current) {
      marker.position.z += delta * speed;
      if (marker.position.z > 8) marker.position.z -= 72;
    }
  });

  return (
    <>
      {Array.from({ length: 22 }, (_, index) => (
        <group key={index}>
          {[-0.95, 0.95].map((x, laneIndex) => (
            <mesh
              key={laneIndex}
              ref={(node) => {
                if (node) markerRefs.current[index * 2 + laneIndex] = node;
              }}
              position={[x, 0.024, -index * 3.3]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[0.07, 1.35]} />
              <meshStandardMaterial color="#f5f0df" transparent opacity={0.82} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function Trampoline({ progress }: { progress: number }) {
  const z = -31 + progress * 34;
  return (
    <group position={[0, 0.2, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.25, 1.25, 0.22, 32]} />
        <meshStandardMaterial color="#257bd8" metalness={0.14} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.92, 32]} />
        <meshStandardMaterial color="#ffda3f" emissive="#df7d00" emissiveIntensity={0.32} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 0.95, -0.32, Math.sin(angle) * 0.95]}>
          <cylinderGeometry args={[0.07, 0.07, 0.78, 8]} />
          <meshStandardMaterial color="#495464" metalness={0.3} roughness={0.48} />
        </mesh>
      ))}
    </group>
  );
}

function SkyGem({ lane, phase, active, onCollect }: { lane: Lane; phase: number; active: boolean; onCollect: () => void }) {
  const group = useRef<Group>(null);
  const collected = useRef(false);

  useFrame((_, delta) => {
    if (!group.current || !active || collected.current) return;
    group.current.position.z += delta * 9.4;
    group.current.rotation.y += delta * 2.8;
    group.current.rotation.z += delta * 1.3;
    if (group.current.position.z > 4.2) {
      collected.current = true;
      onCollect();
      group.current.visible = false;
    }
  });

  useEffect(() => {
    collected.current = false;
    if (group.current) group.current.visible = active;
  }, [active]);

  return (
    <group ref={group} position={[LANE_X[lane], 3.2 + Math.sin(phase) * 0.65, -13 - phase * 6]} visible={active}>
      <mesh>
        <torusGeometry args={[0.42, 0.13, 12, 28]} />
        <meshStandardMaterial color="#ffd73f" emissive="#ff9d00" emissiveIntensity={0.8} metalness={0.22} roughness={0.25} />
      </mesh>
      <pointLight color="#ffd45d" intensity={1.2} distance={3.5} />
    </group>
  );
}

function Scene({ mode, trampolineProgress, onSkyGem }: { mode: TravelMode; trampolineProgress: number; onSkyGem: () => void }) {
  const skyPattern = useMemo(() => [-1, 0, 1, 1, 0, -1, 0, 1, -1] as Lane[], []);
  return (
    <>
      <color attach="background" args={[mode === "sky" ? "#63c6ff" : "#8fd5ee"]} />
      <fog attach="fog" args={[mode === "sky" ? "#bceaff" : "#c8e1e8", 20, 66]} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[7, 13, 8]} intensity={2.35} castShadow />
      <hemisphereLight color="#d8f4ff" groundColor="#49664d" intensity={0.65} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -25]} receiveShadow>
        <planeGeometry args={[9.3, 86]} />
        <meshStandardMaterial color={mode === "sky" ? "#6f9e70" : "#3f7449"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -25]} receiveShadow>
        <planeGeometry args={[6.6, 86]} />
        <meshStandardMaterial color="#4b5157" roughness={0.97} />
      </mesh>

      <RouteMarkers speed={mode === "sky" ? 11.5 : 8.2} />

      {Array.from({ length: 12 }, (_, index) => (
        <SchoolProp key={`tree-left-${index}`} x={-7.4 - (index % 2) * 0.85} z={-index * 7 - 4} kind="tree" />
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <SchoolProp key={`tree-right-${index}`} x={7.4 + (index % 2) * 0.85} z={-index * 7 - 7} kind="tree" />
      ))}
      <SchoolProp x={-10.2} z={-32} kind="building" />
      <SchoolProp x={10.4} z={-49} kind="building" />
      <SchoolProp x={-7.6} z={-18} kind="fence" />
      <SchoolProp x={7.6} z={-25} kind="fence" />
      <SchoolProp x={-7.6} z={-54} kind="fence" />
      <SchoolProp x={7.6} z={-61} kind="fence" />

      {mode === "ground" && <Trampoline progress={trampolineProgress} />}
      {skyPattern.map((gemLane, index) => (
        <SkyGem key={index} lane={gemLane} phase={index * 0.62} active={mode === "sky"} onCollect={onSkyGem} />
      ))}

      <Suspense fallback={null}>
        <Environment preset="park" />
      </Suspense>
    </>
  );
}

function CharacterOverlay({ hero, lane, mode, jumping }: { hero: HeroId; lane: Lane; mode: TravelMode; jumping: boolean }) {
  const visual = HEROES[hero];
  const powered = mode !== "ground";
  const frames = powered ? visual.superFrames : visual.normalFrames;
  const [frameIndex, setFrameIndex] = useState(0);
  const [src, setSrc] = useState(frames[0]);

  useEffect(() => {
    setFrameIndex(0);
    setSrc(frames[0]);
    const speed = mode === "sky" ? 165 : 115;
    const timer = window.setInterval(() => setFrameIndex((value) => (value + 1) % frames.length), speed);
    return () => window.clearInterval(timer);
  }, [frames, mode]);

  useEffect(() => setSrc(frames[frameIndex] ?? frames[0]), [frameIndex, frames]);

  return (
    <div
      className={`v2-character hero-${hero} travel-${mode} ${jumping ? "is-jumping" : ""}`}
      style={{ "--lane": lane, "--hero-accent": visual.accent } as React.CSSProperties}
      aria-label={`${visual.name} running`}
    >
      <div className="v2-character-glow" />
      <img src={src} alt="" onError={() => setSrc(visual.fallback)} draggable={false} />
      <div className="v2-character-shadow" />
    </div>
  );
}

export function SuperZoosAdventureV2() {
  const [hero, setHero] = useState<HeroId>("peter");
  const [lane, setLane] = useState<Lane>(0);
  const [jumping, setJumping] = useState(false);
  const [mode, setMode] = useState<TravelMode>("ground");
  const [score, setScore] = useState(0);
  const [trampolineProgress, setTrampolineProgress] = useState(0);
  const gestureRef = useRef<GestureStart | null>(null);

  useEffect(() => {
    if (mode !== "ground") return;
    let frame = 0;
    let previous = performance.now();
    function tick(now: number) {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setTrampolineProgress((value) => {
        const next = value + dt * 0.095;
        if (next >= 0.98) {
          window.setTimeout(() => setMode("launch"), 0);
          return 0;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    if (mode !== "launch") return;
    const toSky = window.setTimeout(() => setMode("sky"), 720);
    const toLanding = window.setTimeout(() => setMode("landing"), 6100);
    const toGround = window.setTimeout(() => {
      setMode("ground");
      setTrampolineProgress(0);
    }, 7100);
    return () => {
      clearTimeout(toSky);
      clearTimeout(toLanding);
      clearTimeout(toGround);
    };
  }, [mode]);

  function stepLane(direction: -1 | 1) {
    setLane((current) => Math.max(-1, Math.min(1, current + direction)) as Lane);
  }

  function jump() {
    if (mode !== "ground" || jumping) return;
    setJumping(true);
    window.setTimeout(() => setJumping(false), 820);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    gestureRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* iPad fallback */ }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const start = gestureRef.current;
    gestureRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 0.72) {
      stepLane(dx > 0 ? 1 : -1);
      return;
    }
    if (dy < -44) {
      jump();
      return;
    }
    jump();
  }

  return (
    <main className={`v2-app mode-${mode}`}>
      <header className="v2-hud">
        <div>
          <span className="v2-kicker">SUPER ZOOS ADVENTURE</span>
          <h1>School Sky Rescue</h1>
        </div>
        <div className="v2-hud-right">
          <span className="v2-score">Gems {score}</span>
          <span className="v2-status">{mode === "sky" ? "Sky Gem Run" : mode === "launch" ? "Super Launch" : mode === "landing" ? "Landing" : "School Route"}</span>
        </div>
      </header>

      <section className="v2-stage" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => (gestureRef.current = null)} aria-label="Swipe left or right to move. Swipe up or tap to jump.">
        <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 4.4, 9.7], fov: 42 }}>
          <Scene mode={mode} trampolineProgress={trampolineProgress} onSkyGem={() => setScore((value) => value + 10)} />
        </Canvas>
        <CharacterOverlay hero={hero} lane={lane} mode={mode} jumping={jumping} />
        <div className="v2-message">
          {mode === "ground" && "Swipe lanes • Tap or swipe up to jump • Trampoline ahead"}
          {mode === "launch" && `SUPER ${HEROES[hero].name.toUpperCase()} LAUNCH!`}
          {mode === "sky" && "Fly left and right through the golden gems!"}
          {mode === "landing" && "Safe landing…"}
        </div>
        <div className="v2-trampoline-meter" aria-hidden="true"><span style={{ width: `${trampolineProgress * 100}%` }} /></div>
      </section>

      <nav className="v2-controls" aria-label="Game controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => stepLane(-1)}>Left</button>
        <button type="button" onClick={() => stepLane(1)}>Right</button>
        <button type="button" className="jump" onClick={jump} disabled={mode !== "ground"}>Jump</button>
        <button type="button" className="hero-switch" onClick={() => setHero((value) => value === "peter" ? "judy" : "peter")}>{HEROES[hero].name}</button>
      </nav>
    </main>
  );
}
