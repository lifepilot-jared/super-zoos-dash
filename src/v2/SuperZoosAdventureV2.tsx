import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import "./superZoosAdventureV2.css";

type Lane = -1 | 0 | 1;
type TravelMode = "ground" | "launch" | "sky" | "landing";

const LANE_X: Record<Lane, number> = { [-1]: -1.9, [0]: 0, [1]: 1.9 };

function SchoolProp({ x, z, kind }: { x: number; z: number; kind: "tree" | "building" | "fence" }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.z += delta * 7.2;
    if (group.current.position.z > 8) group.current.position.z -= 72;
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      {kind === "tree" && (
        <>
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 2.1, 8]} />
            <meshStandardMaterial color="#865b38" />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow>
            <sphereGeometry args={[0.9, 12, 10]} />
            <meshStandardMaterial color="#4e9d62" roughness={0.9} />
          </mesh>
        </>
      )}
      {kind === "building" && (
        <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 2.3, 1.8]} />
          <meshStandardMaterial color="#d8aa69" roughness={0.85} />
        </mesh>
      )}
      {kind === "fence" && (
        <mesh position={[0, 0.65, 0]} castShadow>
          <boxGeometry args={[3.6, 1.3, 0.12]} />
          <meshStandardMaterial color="#f3eee1" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

function RouteMarkers() {
  const markerRefs = useRef<Mesh[]>([]);
  useFrame((_, delta) => {
    for (const marker of markerRefs.current) {
      marker.position.z += delta * 8;
      if (marker.position.z > 7) marker.position.z -= 64;
    }
  });

  return (
    <>
      {Array.from({ length: 18 }, (_, index) => (
        <group key={index}>
          {[-0.95, 0.95].map((x, laneIndex) => (
            <mesh
              key={laneIndex}
              ref={(node) => {
                if (node) markerRefs.current[index * 2 + laneIndex] = node;
              }}
              position={[x, 0.022, -index * 3.6]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[0.08, 1.7]} />
              <meshStandardMaterial color="#f8f4df" />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function PeterPlaceholder({ lane, jumping, mode }: { lane: Lane; jumping: boolean; mode: TravelMode }) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    elapsed.current += delta;
    const targetX = LANE_X[lane];
    group.current.position.x += (targetX - group.current.position.x) * Math.min(1, delta * 12);
    const runBob = mode === "ground" ? Math.sin(elapsed.current * 13) * 0.06 : 0;
    const jumpHeight = jumping ? Math.sin(Math.min(1, (elapsed.current % 0.9) / 0.9) * Math.PI) * 1.5 : 0;
    const skyHeight = mode === "sky" ? 2.15 + Math.sin(elapsed.current * 2.2) * 0.18 : 0;
    group.current.position.y = 0.82 + runBob + jumpHeight + skyHeight;
    group.current.rotation.z = (targetX - group.current.position.x) * -0.08;
  });

  return (
    <group ref={group} position={[0, 0.82, 3.2]}>
      <mesh castShadow>
        <sphereGeometry args={[0.55, 20, 16]} />
        <meshStandardMaterial color="#aeb7c1" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.62, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.75, 8, 16]} />
        <meshStandardMaterial color={mode === "sky" ? "#176ee8" : "#2c63aa"} roughness={0.7} />
      </mesh>
      <mesh position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.65, 24]} />
        <meshBasicMaterial color="#183a2b" transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

function Trampoline({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <group position={[0, 0.18, -8]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.18, 24]} />
        <meshStandardMaterial color="#2f8cff" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.82, 24]} />
        <meshStandardMaterial color="#ffe24d" emissive="#b76b00" emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

function Scene({ lane, jumping, mode }: { lane: Lane; jumping: boolean; mode: TravelMode }) {
  return (
    <>
      <color attach="background" args={[mode === "sky" ? "#77ccff" : "#9edcf2"]} />
      <fog attach="fog" args={["#cbe7ef", 18, 58]} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[7, 12, 7]} intensity={2.2} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -21]} receiveShadow>
        <planeGeometry args={[8.2, 72]} />
        <meshStandardMaterial color="#436f49" roughness={1} />
      </mesh>
      <RouteMarkers />
      {Array.from({ length: 10 }, (_, index) => (
        <SchoolProp key={`tree-left-${index}`} x={-6.2 - (index % 2) * 0.9} z={-index * 7 - 4} kind="tree" />
      ))}
      {Array.from({ length: 10 }, (_, index) => (
        <SchoolProp key={`tree-right-${index}`} x={6.2 + (index % 2) * 0.9} z={-index * 7 - 7} kind="tree" />
      ))}
      <SchoolProp x={-8.5} z={-30} kind="building" />
      <SchoolProp x={8.5} z={-44} kind="building" />
      <SchoolProp x={-6.8} z={-19} kind="fence" />
      <SchoolProp x={6.8} z={-26} kind="fence" />
      <Trampoline visible={mode === "ground"} />
      <PeterPlaceholder lane={lane} jumping={jumping} mode={mode} />
      <Suspense fallback={null}>
        <Environment preset="park" />
      </Suspense>
    </>
  );
}

export function SuperZoosAdventureV2() {
  const [lane, setLane] = useState<Lane>(0);
  const [jumping, setJumping] = useState(false);
  const [mode, setMode] = useState<TravelMode>("ground");

  function stepLane(direction: -1 | 1) {
    setLane((current) => Math.max(-1, Math.min(1, current + direction)) as Lane);
  }

  function jump() {
    if (mode !== "ground" || jumping) return;
    setJumping(true);
    window.setTimeout(() => setJumping(false), 900);
  }

  function launchSkyRun() {
    if (mode !== "ground") return;
    setMode("launch");
    window.setTimeout(() => setMode("sky"), 650);
    window.setTimeout(() => setMode("landing"), 5600);
    window.setTimeout(() => setMode("ground"), 6600);
  }

  return (
    <main className={`v2-app mode-${mode}`}>
      <header className="v2-hud">
        <div>
          <span className="v2-kicker">SUPER ZOOS ADVENTURE</span>
          <h1>V2 Chase Camera</h1>
        </div>
        <div className="v2-status">{mode === "sky" ? "Sky Gem Run" : "School Rescue Route"}</div>
      </header>
      <section className="v2-stage" aria-label="Super Zoos Adventure v2 greybox">
        <Canvas shadows camera={{ position: [0, 4.5, 9.2], fov: 43 }}>
          <Scene lane={lane} jumping={jumping || mode === "launch" || mode === "landing"} mode={mode} />
        </Canvas>
        <div className="v2-message">
          {mode === "ground" && "Swipe or tap lanes. Jump, then test the trampoline."}
          {mode === "launch" && "SUPER PETER LAUNCH!"}
          {mode === "sky" && "Fly left and right to collect sky gems."}
          {mode === "landing" && "Safe landing…"}
        </div>
      </section>
      <nav className="v2-controls" aria-label="Game controls">
        <button type="button" onClick={() => stepLane(-1)}>Left</button>
        <button type="button" onClick={() => stepLane(1)}>Right</button>
        <button type="button" className="jump" onClick={jump} disabled={mode !== "ground"}>Jump</button>
        <button type="button" className="launch" onClick={launchSkyRun} disabled={mode !== "ground"}>Trampoline</button>
      </nav>
    </main>
  );
}
