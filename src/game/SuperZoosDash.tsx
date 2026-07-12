import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { createGameAudio } from "./audio";
import { readBestScore, saveBestScore } from "./storage";
import "./SuperZoosDash.css";
import "./controlPatch.css";

type Lane = -1 | 0 | 1;
type ScreenState = "start" | "playing" | "paused" | "ended";
type PeterMode = "normal" | "super";
type ObjectKind = "star" | "heroBadge" | "meteor" | "ice";

type RunnerObject = {
  id: number;
  kind: ObjectKind;
  lane: Lane;
  progress: number;
};

type FloatingMessage = {
  id: number;
  text: string;
  createdAt: number;
};

type GameState = {
  screen: ScreenState;
  calmMode: boolean;
  soundOn: boolean;
  score: number;
  bestScore: number;
  hearts: number;
  lane: Lane;
  objects: RunnerObject[];
  nextSpawnAt: number;
  tutorialIndex: number;
  shieldActiveUntil: number;
  shieldCooldownUntil: number;
  superUntil: number;
  invulnerableUntil: number;
  jumpUntil: number;
  messages: FloatingMessage[];
  idSeed: number;
};

type GestureStart = {
  pointerId: number;
  x: number;
  y: number;
};

const LANES: Lane[] = [-1, 0, 1];
const VERSION = "v0.2.5-danger-speed";

const TUNING = {
  normal: {
    objectSpeed: 0.46,
    spawnGapMs: 1210,
    scoreRate: 9.0,
  },
  calm: {
    objectSpeed: 0.34,
    spawnGapMs: 1760,
    scoreRate: 5.8,
  },
};

const POWER = {
  shieldDurationMs: 2450,
  shieldCooldownMs: 5400,
  superDurationMs: 6200,
  graceAfterHitMs: 1150,
  jumpDurationMs: 880,
  jumpLandingGraceMs: 360,
};

const tutorialPlan: Array<Pick<RunnerObject, "kind" | "lane">> = [
  { kind: "star", lane: 0 },
  { kind: "heroBadge", lane: 1 },
  { kind: "meteor", lane: -1 },
  { kind: "ice", lane: 0 },
];

function createInitialState(calmMode = false, soundOn = true): GameState {
  const now = performance.now();

  return {
    screen: "start",
    calmMode,
    soundOn,
    score: 0,
    bestScore: readBestScore(),
    hearts: 3,
    lane: 0,
    objects: [],
    nextSpawnAt: now + 700,
    tutorialIndex: 0,
    shieldActiveUntil: 0,
    shieldCooldownUntil: 0,
    superUntil: 0,
    invulnerableUntil: 0,
    jumpUntil: 0,
    messages: [],
    idSeed: 1,
  };
}

function isGood(kind: ObjectKind) {
  return kind === "star" || kind === "heroBadge";
}

function isDanger(kind: ObjectKind) {
  return !isGood(kind);
}

function randomLane(): Lane {
  return LANES[Math.floor(Math.random() * LANES.length)] ?? 0;
}

function randomKind(): ObjectKind {
  const roll = Math.random();
  if (roll < 0.42) return "star";
  if (roll < 0.56) return "heroBadge";
  if (roll < 0.80) return "meteor";
  return "ice";
}

function spawnObject(state: GameState): GameState {
  const planned = tutorialPlan[state.tutorialIndex];
  const kind = planned?.kind ?? randomKind();
  const lane = planned?.lane ?? randomLane();
  const id = state.idSeed;

  return {
    ...state,
    idSeed: id + 1,
    tutorialIndex: planned ? state.tutorialIndex + 1 : state.tutorialIndex,
    objects: [
      ...state.objects,
      {
        id,
        kind,
        lane,
        progress: 0,
      },
    ],
  };
}

function addMessage(state: GameState, text: string, now: number): GameState {
  return {
    ...state,
    idSeed: state.idSeed + 1,
    messages: [...state.messages, { id: state.idSeed, text, createdAt: now }].slice(-3),
  };
}

function objectStyle(object: RunnerObject): CSSProperties {
  const progress = Math.max(0, Math.min(1.24, object.progress));
  const visualProgress = Math.min(1, progress * 1.06);
  const afterPlayerDrift = Math.max(0, progress - 1);
  const laneSpread = 7 + visualProgress * 32;
  const x = 50 + object.lane * laneSpread;
  const y = 20 + visualProgress * 70 + afterPlayerDrift * 24;
  const size = 0.3 + visualProgress * 1.55 + afterPlayerDrift * 0.24;
  const opacity = 0.44 + visualProgress * 0.56;

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: `translate(-50%, -50%) scale(${size})`,
    opacity,
    zIndex: Math.round(10 + visualProgress * 10),
  };
}

function clampLaneIndex(index: number) {
  return Math.max(0, Math.min(LANES.length - 1, index));
}

function playerLaneX(lane: Lane) {
  return 50 + lane * 25.5;
}

export function SuperZoosDash() {
  const [game, setGameState] = useState<GameState>(() => createInitialState());
  const gameRef = useRef(game);
  const lastFrameRef = useRef<number | null>(null);
  const gestureStartRef = useRef<GestureStart | null>(null);
  const audio = useMemo(() => createGameAudio(() => gameRef.current.soundOn), []);

  function setGame(next: GameState) {
    gameRef.current = next;
    setGameState(next);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    function tick(now: number) {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const dt = Math.min(0.05, (now - previous) / 1000);
      const current = gameRef.current;

      if (current.screen !== "playing") {
        frame = requestAnimationFrame(tick);
        return;
      }

      const tuning = current.calmMode ? TUNING.calm : TUNING.normal;
      let next: GameState = {
        ...current,
        score: current.score + tuning.scoreRate * dt,
        objects: current.objects.map((object) => {
          const progress = Math.min(1, Math.max(0, object.progress));
          const nearPlayerBoost = 0.95 + Math.pow(progress, 1.35) * 2.15;
          return {
            ...object,
            progress: object.progress + tuning.objectSpeed * dt * nearPlayerBoost,
          };
        }),
        messages: current.messages.filter((message) => now - message.createdAt < 1500),
      };

      if (now >= next.nextSpawnAt) {
        next = spawnObject(next);
        next.nextSpawnAt = now + tuning.spawnGapMs * (0.9 + Math.random() * 0.24);
      }

      const keptObjects: RunnerObject[] = [];
      for (const object of next.objects) {
        const atPlayer = object.progress >= 0.98;
        const sameLane = object.lane === next.lane;

        if (!atPlayer) {
          keptObjects.push(object);
          continue;
        }

        if (!sameLane) {
          if (object.progress < 1.14) keptObjects.push(object);
          continue;
        }

        if (isGood(object.kind)) {
          if (object.kind === "heroBadge") {
            next.score += 30;
            next.superUntil = now + POWER.superDurationMs;
            next.shieldActiveUntil = Math.max(next.shieldActiveUntil, now + POWER.shieldDurationMs);
            next = addMessage(next, "Super Peter!", now);
            audio.play("heroPower");
          } else {
            next.score += 12;
            next = addMessage(next, "Star gem!", now);
            audio.play("gem");
          }
          continue;
        }

        if (now < next.jumpUntil + POWER.jumpLandingGraceMs) {
          next.score += 8;
          next = addMessage(next, "Jump clear!", now);
          audio.play("jump");
          continue;
        }

        if (now < next.shieldActiveUntil) {
          next.score += 10;
          next = addMessage(next, "Shield clear!", now);
          audio.play("shield");
          continue;
        }

        if (now >= next.invulnerableUntil) {
          next.hearts -= 1;
          next.invulnerableUntil = now + POWER.graceAfterHitMs;
          next = addMessage(next, "Red ripple danger!", now);
          audio.play("bump");
        }
      }

      next.objects = keptObjects.filter((object) => object.progress < 1.22);

      if (next.hearts <= 0) {
        const finalScore = Math.max(0, Math.floor(next.score));
        const bestScore = saveBestScore(finalScore);
        next = {
          ...next,
          screen: "ended",
          score: finalScore,
          bestScore,
          hearts: 0,
          objects: [],
          messages: [],
        };
        audio.play("runEnd");
      }

      setGame(next);
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audio]);

  const now = performance.now();
  const peterMode: PeterMode = now < game.superUntil || now < game.shieldActiveUntil ? "super" : "normal";
  const shieldReady = game.screen === "playing" && now >= game.shieldCooldownUntil;
  const shieldCooldownSeconds = Math.max(0, Math.ceil((game.shieldCooldownUntil - now) / 1000));
  const jumping = now < game.jumpUntil;
  const canJump = game.screen === "playing" && now >= game.jumpUntil - 180;

  function startRun() {
    audio.unlock();
    lastFrameRef.current = null;
    const fresh = createInitialState(gameRef.current.calmMode, gameRef.current.soundOn);
    setGame({ ...fresh, screen: "playing" });
  }

  function pauseRun() {
    if (gameRef.current.screen !== "playing") return;
    setGame({ ...gameRef.current, screen: "paused" });
  }

  function resumeRun() {
    if (gameRef.current.screen !== "paused") return;
    lastFrameRef.current = null;
    setGame({ ...gameRef.current, screen: "playing" });
  }

  function toggleCalmMode() {
    if (gameRef.current.screen !== "start") return;
    setGame({ ...gameRef.current, calmMode: !gameRef.current.calmMode });
  }

  function toggleSound() {
    setGame({ ...gameRef.current, soundOn: !gameRef.current.soundOn });
  }

  function moveToLane(lane: Lane) {
    const current = gameRef.current;
    if (current.screen !== "playing") return;
    if (current.lane !== lane) audio.play("jump");
    setGame({ ...current, lane });
  }

  function stepLane(direction: -1 | 1) {
    const current = gameRef.current;
    const currentIndex = LANES.indexOf(current.lane);
    const nextLane = LANES[clampLaneIndex(currentIndex + direction)] ?? 0;
    moveToLane(nextLane);
  }

  function jump() {
    const current = gameRef.current;
    const jumpNow = performance.now();
    if (current.screen !== "playing" || jumpNow < current.jumpUntil - 180) return;
    setGame({ ...current, jumpUntil: jumpNow + POWER.jumpDurationMs });
    audio.play("jump");
  }

  function activateShield() {
    const current = gameRef.current;
    const shieldNow = performance.now();
    if (current.screen !== "playing" || shieldNow < current.shieldCooldownUntil) return;

    let next: GameState = {
      ...current,
      shieldActiveUntil: shieldNow + POWER.shieldDurationMs,
      shieldCooldownUntil: shieldNow + POWER.shieldCooldownMs,
      superUntil: Math.max(current.superUntil, shieldNow + POWER.shieldDurationMs),
    };
    next = addMessage(next, "Blue shield!", shieldNow);
    setGame(next);
    audio.play("shield");
  }

  function handleStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    if (gameRef.current.screen !== "playing") return;
    gestureStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some iPad/browser combinations may not allow pointer capture. The gesture still works without it.
    }
  }

  function handleStagePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const start = gestureStartRef.current;
    gestureStartRef.current = null;
    if (gameRef.current.screen !== "playing") return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const startX = start?.x ?? event.clientX;
    const startY = start?.y ?? event.clientY;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (dy < -28 && absY > absX * 0.78) {
      jump();
      return;
    }

    if (absX > 28 && absX > absY * 0.62) {
      stepLane(dx > 0 ? 1 : -1);
      return;
    }

    const x = event.clientX - bounds.left;
    const third = bounds.width / 3;
    if (x < third) moveToLane(-1);
    else if (x > third * 2) moveToLane(1);
    else jump();
  }

  function cancelGesture() {
    gestureStartRef.current = null;
  }

  function stopControlEvent(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <main className="dash-app" aria-label="Super Zoos Dash game">
      <section className="runner-shell">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Super Zoos <span className="version-chip">{VERSION}</span></p>
            <h1>Super Zoos Dash</h1>
          </div>
          <button className="small-button" type="button" onClick={toggleSound}>
            Sound: {game.soundOn ? "On" : "Off"}
          </button>
        </header>

        <div className="hud" aria-live="polite">
          <span>Score {Math.floor(game.score)}</span>
          <span>Best {game.bestScore}</span>
          <span className="hearts" aria-label={`${game.hearts} hearts left`}>
            {Array.from({ length: 3 }, (_, index) => (
              <span key={index} className={index < game.hearts ? "heart full" : "heart"}>♥</span>
            ))}
          </span>
        </div>

        {game.screen === "start" ? (
          <StartScreen calmMode={game.calmMode} onStart={startRun} onToggleCalm={toggleCalmMode} />
        ) : (
          <div
            className="stage"
            onPointerDown={handleStagePointerDown}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={cancelGesture}
            role="application"
            aria-label="Swipe left or right to move lanes. Swipe up to jump. Red danger ripples hurt Peter."
          >
            <div className="sky" />
            <div className="sun" />
            <div className="hall" />
            <div className="gumtree left" />
            <div className="gumtree right" />
            <div className="fence" />
            <div className="oval-perspective">
              <span className="lane-line left" />
              <span className="lane-line right" />
              <span className="horizon" />
            </div>
            <div className="clarity-strip">
              <span className="good">GET ★</span>
              <span className="power">GET blue P</span>
              <span className="bad">RED RIPPLE = DANGER</span>
              <span className="jump">SWIPE ↑ JUMP</span>
            </div>

            {game.objects.map((object) => (
              <RunnerObjectView key={object.id} object={object} />
            ))}

            <PeterRunner lane={game.lane} mode={peterMode} protectedNow={now < game.shieldActiveUntil} recovering={now < game.invulnerableUntil} jumping={jumping} />

            {game.messages.map((message) => (
              <div key={message.id} className="floating-message">
                {message.text}
              </div>
            ))}

            {game.screen === "playing" && (
              <button className="pause-button" type="button" onClick={pauseRun} onPointerDown={stopControlEvent} aria-label="Pause run">
                Pause
              </button>
            )}

            {game.screen === "paused" && (
              <Overlay title="Paused" subtitle="Peter is safe. Ready when you are.">
                <button className="primary-button" type="button" onClick={resumeRun} onPointerDown={stopControlEvent}>
                  Resume
                </button>
                <button className="secondary-button" type="button" onClick={startRun} onPointerDown={stopControlEvent}>
                  Restart
                </button>
              </Overlay>
            )}

            {game.screen === "ended" && (
              <Overlay title="Great run, Super Peter!" subtitle={`Score ${Math.floor(game.score)} • Best ${game.bestScore}`}>
                <button className="primary-button" type="button" onClick={startRun} onPointerDown={stopControlEvent}>
                  Try Again
                </button>
              </Overlay>
            )}
          </div>
        )}

        {game.screen !== "start" && (
          <div className="lane-controls" onPointerDown={stopControlEvent}>
            <button type="button" onClick={() => moveToLane(-1)} disabled={game.screen !== "playing"}>
              Left
            </button>
            <button type="button" onClick={() => moveToLane(0)} disabled={game.screen !== "playing"}>
              Middle
            </button>
            <button type="button" onClick={() => moveToLane(1)} disabled={game.screen !== "playing"}>
              Right
            </button>
            <button className="jump-button" type="button" disabled={!canJump} onClick={jump}>
              {jumping ? "Jumping" : "Jump"}
            </button>
            <button className="shield-button" type="button" disabled={!shieldReady} onClick={activateShield}>
              {shieldReady ? "Shield" : `Shield ${shieldCooldownSeconds}s`}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function StartScreen({ calmMode, onStart, onToggleCalm }: { calmMode: boolean; onStart: () => void; onToggleCalm: () => void }) {
  return (
    <div className="start-screen">
      <div className="start-card">
        <div className="start-peter" aria-hidden="true">
          <span className="normal-peter-dot">Peter</span>
          <span className="transform-arrow">→</span>
          <span className="super-peter-dot">Super Peter</span>
        </div>
        <h2>Ready to run?</h2>
        <p><strong>Swipe left/right</strong> to move lanes. <strong>Swipe up</strong> or press Jump to clear <strong>red danger ripples</strong>. Get stars and blue P.</p>
        <div className="legend-row" aria-hidden="true">
          <span className="legend-good">★ GET</span>
          <span className="legend-power">P POWER</span>
          <span className="legend-bad">RED RIPPLE = DANGER</span>
          <span className="legend-jump">↑ JUMP</span>
        </div>
        <div className="start-actions">
          <button className="primary-button start-run-button" type="button" onClick={onStart}>
            Start Run
          </button>
          <button className="secondary-button" type="button" onClick={onToggleCalm}>
            Calm Mode: {calmMode ? "On" : "Off"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RunnerObjectView({ object }: { object: RunnerObject }) {
  const good = isGood(object.kind);
  const danger = isDanger(object.kind);
  const label = object.kind === "heroBadge" ? "POWER" : good ? "GET" : "DANGER";
  const symbol = object.kind === "star" ? "★" : object.kind === "heroBadge" ? "P" : "!";

  return (
    <div className={`runner-object ${object.kind} ${good ? "collect" : "danger"} ${danger ? "red-ripple" : ""}`} style={objectStyle(object)} aria-hidden="true">
      <span className="object-symbol">{symbol}</span>
      <span className="object-label">{label}</span>
    </div>
  );
}

function PeterRunner({ lane, mode, protectedNow, recovering, jumping }: { lane: Lane; mode: PeterMode; protectedNow: boolean; recovering: boolean; jumping: boolean }) {
  return (
    <div
      className={`peter-runner ${mode} ${protectedNow ? "shielded" : ""} ${recovering ? "recovering" : ""} ${jumping ? "jumping" : ""}`}
      style={{ left: `${playerLaneX(lane)}%`, transform: "translateX(-50%)" }}
      aria-label={mode === "super" ? "Super Peter" : "Peter"}
    >
      <div className="peter-shadow" />
      <div className="peter-body-art" aria-hidden="true">
        <div className="cape" />
        <div className="hair hair-one" />
        <div className="hair hair-two" />
        <div className="ear ear-left" />
        <div className="ear ear-right" />
        <div className="head">
          <span className="eye left" />
          <span className="eye right" />
          <span className="smile" />
        </div>
        <div className="trunk" />
        <div className="torso">
          <span>{mode === "super" ? "P" : ""}</span>
        </div>
        <div className="arm arm-left" />
        <div className="arm arm-right" />
        <div className="leg leg-left" />
        <div className="leg leg-right" />
      </div>
    </div>
  );
}

function Overlay({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="overlay" onPointerDown={(event) => event.stopPropagation()}>
      <div className="overlay-panel">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="legend-row" aria-hidden="true">
          <span className="legend-good">★ GET</span>
          <span className="legend-power">P POWER</span>
          <span className="legend-bad">RED RIPPLE = DANGER</span>
          <span className="legend-jump">↑ JUMP</span>
        </div>
        <div className="overlay-actions">{children}</div>
      </div>
    </div>
  );
}
