import { useEffect, useMemo, useRef, useState } from "react";
import { characterAssetSlots } from "./assets";
import { createGameAudio } from "./audio";
import { intersects, shrinkRect } from "./collision";
import { MODE, PLAYER, POWERS, WORLD } from "./gameConstants";
import type { Collectible, CollectibleKind, FloatingMessage, Obstacle, ObstacleKind, PeterMode, Rect, ScreenState } from "./gameTypes";
import { readBestScore, saveBestScore } from "./storage";
import "./SuperZoosDash.css";

type GameState = {
  screen: ScreenState;
  calmMode: boolean;
  soundOn: boolean;
  score: number;
  bestScore: number;
  hearts: number;
  playerY: number;
  playerVy: number;
  grounded: boolean;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  shieldActiveUntil: number;
  shieldCooldownUntil: number;
  invulnerableUntil: number;
  superUntil: number;
  nextObstacleAt: number;
  nextCollectibleAt: number;
  nextPowerAt: number;
  messages: FloatingMessage[];
  idSeed: number;
};

const groundPlayerY = WORLD.groundY - PLAYER.height;

function createInitialState(calmMode = false, soundOn = true): GameState {
  const now = performance.now();

  return {
    screen: "start",
    calmMode,
    soundOn,
    score: 0,
    bestScore: readBestScore(),
    hearts: 3,
    playerY: groundPlayerY,
    playerVy: 0,
    grounded: true,
    obstacles: [],
    collectibles: [],
    shieldActiveUntil: 0,
    shieldCooldownUntil: 0,
    invulnerableUntil: 0,
    superUntil: 0,
    nextObstacleAt: now + 1100,
    nextCollectibleAt: now + 850,
    nextPowerAt: now + 4200,
    messages: [],
    idSeed: 1,
  };
}

function obstacleFor(kind: ObstacleKind, id: number): Obstacle {
  if (kind === "lightning") {
    return {
      id,
      kind,
      x: WORLD.width + 40,
      y: WORLD.groundY - 228,
      width: 70,
      height: 78,
    };
  }

  if (kind === "ice") {
    return {
      id,
      kind,
      x: WORLD.width + 40,
      y: WORLD.groundY - 70,
      width: 78,
      height: 70,
    };
  }

  return {
    id,
    kind,
    x: WORLD.width + 40,
    y: WORLD.groundY - 74,
    width: 82,
    height: 74,
  };
}

function collectibleFor(kind: CollectibleKind, id: number): Collectible {
  return {
    id,
    kind,
    x: WORLD.width + 40,
    y: kind === "heroBadge" ? WORLD.groundY - 214 : WORLD.groundY - (132 + Math.random() * 132),
    width: kind === "heroBadge" ? 56 : 42,
    height: kind === "heroBadge" ? 56 : 42,
  };
}

function randomObstacleKind(): ObstacleKind {
  const roll = Math.random();
  if (roll < 0.42) return "meteor";
  if (roll < 0.72) return "ice";
  return "lightning";
}

function logicalStyle(rect: Rect): React.CSSProperties {
  return {
    left: `${(rect.x / WORLD.width) * 100}%`,
    top: `${(rect.y / WORLD.height) * 100}%`,
    width: `${(rect.width / WORLD.width) * 100}%`,
    height: `${(rect.height / WORLD.height) * 100}%`,
  };
}

function addMessage(state: GameState, text: string, now: number): GameState {
  return {
    ...state,
    idSeed: state.idSeed + 1,
    messages: [...state.messages, { id: state.idSeed, text, createdAt: now }].slice(-3),
  };
}

export function SuperZoosDash() {
  const [game, setGameState] = useState<GameState>(() => createInitialState());
  const gameRef = useRef(game);
  const lastFrameRef = useRef<number | null>(null);

  const audio = useMemo(() => createGameAudio(() => gameRef.current.soundOn), []);

  function setGame(next: GameState) {
    gameRef.current = next;
    setGameState(next);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    function tick(now: number) {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const dt = Math.min(0.048, (now - previous) / 1000);
      const state = gameRef.current;

      if (state.screen !== "playing") {
        frame = requestAnimationFrame(tick);
        return;
      }

      const tuning = state.calmMode ? MODE.calm : MODE.normal;
      const speed = tuning.speed;
      let next: GameState = { ...state };

      const nextVy = next.playerVy + PLAYER.gravity * dt;
      const nextY = Math.min(groundPlayerY, next.playerY + nextVy * dt);
      next.playerY = nextY;
      next.playerVy = nextY >= groundPlayerY ? 0 : nextVy;
      next.grounded = nextY >= groundPlayerY;
      next.score += dt * (state.calmMode ? 5.5 : 7.5);

      next.obstacles = next.obstacles
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * dt }))
        .filter((obstacle) => obstacle.x + obstacle.width > -80);

      next.collectibles = next.collectibles
        .map((collectible) => ({ ...collectible, x: collectible.x - speed * dt }))
        .filter((collectible) => collectible.x + collectible.width > -80);

      if (now >= next.nextObstacleAt) {
        next = {
          ...next,
          idSeed: next.idSeed + 1,
          obstacles: [...next.obstacles, obstacleFor(randomObstacleKind(), next.idSeed)],
          nextObstacleAt: now + tuning.obstacleGapMs * (0.82 + Math.random() * 0.35),
        };
      }

      if (now >= next.nextCollectibleAt) {
        next = {
          ...next,
          idSeed: next.idSeed + 1,
          collectibles: [...next.collectibles, collectibleFor("star", next.idSeed)],
          nextCollectibleAt: now + tuning.collectibleGapMs * (0.8 + Math.random() * 0.45),
        };
      }

      if (now >= next.nextPowerAt) {
        next = {
          ...next,
          idSeed: next.idSeed + 1,
          collectibles: [...next.collectibles, collectibleFor("heroBadge", next.idSeed)],
          nextPowerAt: now + tuning.powerGapMs * (0.92 + Math.random() * 0.35),
        };
      }

      const playerRect = shrinkRect(
        {
          x: WORLD.peterX,
          y: next.playerY,
          width: PLAYER.width,
          height: PLAYER.height,
        },
        14,
      );

      const keptObstacles: Obstacle[] = [];
      for (const obstacle of next.obstacles) {
        const obstacleRect = shrinkRect(obstacle, 8);
        if (!intersects(playerRect, obstacleRect)) {
          keptObstacles.push(obstacle);
          continue;
        }

        if (now < next.shieldActiveUntil) {
          next.score += 8;
          next = addMessage(next, "Shield clear!", now);
          audio.play("shield");
          continue;
        }

        if (now >= next.invulnerableUntil) {
          next.hearts -= 1;
          next.invulnerableUntil = now + POWERS.postHitGraceMs;
          next = addMessage(next, "Keep going, Peter!", now);
          audio.play("bump");
        }
      }
      next.obstacles = keptObstacles;

      const keptCollectibles: Collectible[] = [];
      for (const collectible of next.collectibles) {
        if (!intersects(playerRect, shrinkRect(collectible, 4))) {
          keptCollectibles.push(collectible);
          continue;
        }

        if (collectible.kind === "heroBadge") {
          next.score += 25;
          next.superUntil = Math.max(next.superUntil, now + POWERS.heroBadgeSuperMs);
          next.shieldActiveUntil = Math.max(next.shieldActiveUntil, now + POWERS.shieldDurationMs);
          next = addMessage(next, "Super Peter!", now);
          audio.play("heroPower");
        } else {
          next.score += 10;
          audio.play("gem");
        }
      }
      next.collectibles = keptCollectibles;

      next.messages = next.messages.filter((message) => now - message.createdAt < 1350);

      if (next.hearts <= 0) {
        const finalScore = Math.max(0, Math.floor(next.score));
        const bestScore = saveBestScore(finalScore);
        next = {
          ...next,
          screen: "ended",
          score: finalScore,
          bestScore,
          hearts: 0,
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
  const shieldCoolingPercent = game.shieldCooldownUntil <= now ? 0 : Math.ceil(((game.shieldCooldownUntil - now) / POWERS.shieldCooldownMs) * 100);

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

  function jump() {
    const state = gameRef.current;
    if (state.screen !== "playing" || !state.grounded) return;
    setGame({ ...state, grounded: false, playerVy: PLAYER.jumpVelocity });
    audio.play("jump");
  }

  function activateShield() {
    const state = gameRef.current;
    const shieldNow = performance.now();
    if (state.screen !== "playing" || shieldNow < state.shieldCooldownUntil) return;

    let next: GameState = {
      ...state,
      shieldActiveUntil: shieldNow + POWERS.shieldDurationMs,
      shieldCooldownUntil: shieldNow + POWERS.shieldCooldownMs,
      superUntil: Math.max(state.superUntil, shieldNow + POWERS.shieldDurationMs),
    };
    next = addMessage(next, "Blue shield!", shieldNow);
    setGame(next);
    audio.play("shield");
  }

  function handlePlayAreaPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    jump();
  }

  function stopControlEvent(event: React.PointerEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <main className="dash-app" aria-label="Super Zoos Dash game">
      <section className="game-card">
        <div className="game-header">
          <div>
            <p className="eyebrow">Super Zoos</p>
            <h1>Super Zoos Dash</h1>
          </div>
          <button className="pill-button ghost" type="button" onClick={toggleSound}>
            Sound: {game.soundOn ? "On" : "Off"}
          </button>
        </div>

        <div className="hud" aria-live="polite">
          <span>Score: {Math.floor(game.score)}</span>
          <span>Best: {game.bestScore}</span>
          <span className="hearts" aria-label={`${game.hearts} hearts left`}>
            {Array.from({ length: 3 }, (_, index) => (
              <span key={index} className={index < game.hearts ? "heart full" : "heart"}>♥</span>
            ))}
          </span>
        </div>

        <div className="stage-wrap">
          <div className="stage" onPointerDown={handlePlayAreaPointerDown} role="application" aria-label="Tap the oval to jump">
            <div className="sky-gradient" />
            <div className="sun" />
            <div className="school-hall" />
            <div className="tree tree-one" />
            <div className="tree tree-two" />
            <div className="fence" />
            <div className="oval" />
            <div className="track-line line-one" />
            <div className="track-line line-two" />

            <PeterSprite mode={peterMode} y={game.playerY} isProtected={now < game.shieldActiveUntil} isBlinking={now < game.invulnerableUntil} />

            {game.obstacles.map((obstacle) => (
              <div key={obstacle.id} className={`obstacle ${obstacle.kind}`} style={logicalStyle(obstacle)} aria-hidden="true">
                {obstacle.kind === "lightning" ? "ϟ" : obstacle.kind === "ice" ? "▰" : "●"}
              </div>
            ))}

            {game.collectibles.map((collectible) => (
              <div key={collectible.id} className={`collectible ${collectible.kind}`} style={logicalStyle(collectible)} aria-hidden="true">
                {collectible.kind === "heroBadge" ? "P" : "★"}
              </div>
            ))}

            {game.messages.map((message) => (
              <div key={message.id} className="floating-message">
                {message.text}
              </div>
            ))}

            {game.screen === "start" && (
              <Overlay title="Super Zoos Dash" subtitle="Run the oval. Dodge the meteor ripples. Use your shield!">
                <button className="primary-button" type="button" onClick={startRun} onPointerDown={stopControlEvent}>
                  Start Run
                </button>
                <button className="pill-button" type="button" onClick={toggleCalmMode} onPointerDown={stopControlEvent}>
                  Calm Mode: {game.calmMode ? "On" : "Off"}
                </button>
                <p className="overlay-note">Peter starts normal. Grab a hero badge or use shield to become Super Peter.</p>
              </Overlay>
            )}

            {game.screen === "paused" && (
              <Overlay title="Paused" subtitle="Take a little breath. Peter is waiting safely.">
                <button className="primary-button" type="button" onClick={resumeRun} onPointerDown={stopControlEvent}>
                  Resume
                </button>
                <button className="pill-button" type="button" onClick={startRun} onPointerDown={stopControlEvent}>
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

            {game.screen === "playing" && (
              <button className="pause-button" type="button" onClick={pauseRun} onPointerDown={stopControlEvent} aria-label="Pause run">
                Pause
              </button>
            )}
          </div>
        </div>

        <div className="touch-controls" onPointerDown={stopControlEvent}>
          <p>Tap the oval to jump</p>
          <button className="shield-button" type="button" disabled={!shieldReady} onClick={activateShield}>
            {shieldReady ? "Shield" : `Shield ${shieldCoolingPercent}%`}
          </button>
        </div>
      </section>
    </main>
  );
}

function Overlay({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="overlay" onPointerDown={(event) => event.stopPropagation()}>
      <div className="overlay-panel">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <div className="overlay-actions">{children}</div>
      </div>
    </div>
  );
}

function PeterSprite({ mode, y, isProtected, isBlinking }: { mode: PeterMode; y: number; isProtected: boolean; isBlinking: boolean }) {
  const src = mode === "super" ? characterAssetSlots.superPeterSide : characterAssetSlots.peterSide;
  const rect = { x: WORLD.peterX, y, width: PLAYER.width, height: PLAYER.height };

  return (
    <div
      className={`peter-sprite ${mode} ${isProtected ? "protected" : ""} ${isBlinking ? "soft-blink" : ""}`}
      style={logicalStyle(rect)}
      aria-label={mode === "super" ? "Super Peter" : "Peter"}
    >
      {src ? <img src={src} alt="" draggable={false} /> : <PeterPlaceholder mode={mode} />}
    </div>
  );
}

function PeterPlaceholder({ mode }: { mode: PeterMode }) {
  return (
    <div className={`peter-placeholder ${mode}`} aria-hidden="true">
      <div className="cape" />
      <div className="ear left" />
      <div className="ear right" />
      <div className="head" />
      <div className="trunk" />
      <div className="body">
        <span>{mode === "super" ? "P" : ""}</span>
      </div>
      <div className="leg leg-one" />
      <div className="leg leg-two" />
    </div>
  );
}
