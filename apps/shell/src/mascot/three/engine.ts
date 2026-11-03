import { OrthographicCamera, WebGLRenderer } from 'three';
import {
  tripRuns,
  feetY,
  headSafeFeetY,
  type NavAnchor,
  type RingBox,
  ringReaches,
} from './anchors.ts';
import type { CardLanding } from './landing.ts';
import { initialNavState, navReducer, type NavEvent, type NavState } from './machine.ts';
import {
  easeSit,
  jumpTop,
  type Motion,
  PERCHED_SECONDS,
  type MotionGoal,
  seatedMotion,
  stepMotion,
} from './motion.ts';
import type { CharacterMetrics, PoseIntent } from './character/contract.ts';
import { loadCharacter } from './character/index.ts';
import { Rig } from './rig.ts';
import { currentTheme, subscribeTheme } from '../../theme/theme.ts';
import { SlowdownWatchdog } from './watchdog.ts';

/** The small moving canvas, in CSS pixels: kept in step with mascot3d.css. */
const WIDTH = 180;
const HEIGHT = 160;
/** Room below the feet inside the canvas. */
const BELOW = 30;
/** The idle plays this long on the nav, then it holds still and nothing renders (WCAG 2.2.2). */
const IDLE_SECONDS = 4;
/** A long frame (a slow machine, a tab coming back) never turns into a sudden move. */
const MAX_STEP = 1 / 15;

export interface PixelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FrameCosts {
  samples: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  /** The most expensive frame's number: a low one points at start-up costs. */
  maxFrame: number;
  /** Mean GPU time, where the browser can report it. */
  gpuMeanMs: number | null;
}

export interface PoseBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Why the 3D character gave way to the 2D one. */
export type MascotFailure = 'frame-error' | 'context-lost' | 'slowdown';

/** For the flagged E2E build and the report: never part of a normal build. */
export interface MascotDebug {
  state: () => NavState;
  motion: () => Motion;
  /** Frames rendered since load: flat means nothing is rendering. */
  frames: () => number;
  /** JS cost of a frame (pose, skinning, draw submission), with no GPU read-back. */
  timing: () => FrameCosts;
  /** One line to read or paste: the renderer, frame costs and GPU time on this machine. */
  report: () => string;
  /** What the renderer holds: must stay flat over a long session. */
  memory: () => { geometries: number; textures: number; programs: number };
  /** Reaches the end of the current trip at once, for testing long sessions. */
  settle: () => void;
  /** Feeds the watchdog made-up frames: headless test builds don't run it on real ones. */
  simulateFrames: (frameMs: number, count: number) => void;
  /** Makes the next frame throw, as a bug would. */
  breakNextFrame: () => void;
  /** Whether its outline is showing: only a character with one, in the light theme. */
  outlineVisible: () => boolean;
  /** Measures a pose from rendered pixels, in multiples of the height relative to the feet. */
  measurePose: (pose: Partial<PoseIntent>) => PoseBox | null;
  /** The character's visible pixels, in document coordinates. */
  pixelBox: () => PixelBox | null;
  /** How far the jump reaches above the feet across its length, as multiples of the height. */
  jumpReach: (samples: number) => number;
  size: () => number;
  anchor: () => NavAnchor | null;
  /** Moves the character's lines, for comparing positions. */
  setLines: (restLine: number, ringLine: number) => void;
}

export interface MascotEngine {
  /** The active character's measurements, for the geometry. */
  metrics: CharacterMetrics;
  place: (anchor: NavAnchor) => void;
  navigate: (anchor: NavAnchor) => void;
  reanchor: (anchor: NavAnchor) => void;
  setReducedMotion: (reduced: boolean) => void;
  setFocusRing: (ring: RingBox | null) => void;
  /** Ignored unless seated, so a stale timer can't start anything. */
  jumpToCard: (landing: CardLanding) => void;
  /** The layout moved: the new spot on the card, or null if it no longer has room. */
  moveLanding: (landing: CardLanding | null) => void;
  /** Heading for the card, or on it. */
  isOnCardTrip: () => boolean;
  /** Seated on the nav and at rest. */
  isSeated: () => boolean;
  dispose: () => void;
  debug: MascotDebug;
}

export async function createMascotEngine(
  host: HTMLElement,
  options: {
    reducedMotion: boolean;
    /** It can't go on. The caller disposes of it and restores the 2D mascot. */
    onFailure: (reason: MascotFailure) => void;
    /** Fully settled on the active link: when the jump's delay starts. */
    onSeated: () => void;
  },
): Promise<MascotEngine> {
  const character = await loadCharacter();
  const poser = await character.loadPoser();
  const rig = await Rig.load(character, poser);
  const { metrics } = character;
  const drawScale = character.look?.scale ?? 1;
  // Slow frames in a headless test build say nothing about a visitor's machine.
  const watchRealFrames = import.meta.env.VITE_MASCOT_3D_ALLOW_SOFTWARE !== '1';
  const watchdog = new SlowdownWatchdog();

  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setClearColor(0, 0);
  host.append(canvas);

  const camera = new OrthographicCamera(-1, 1, 1, -1, -50, 50);
  camera.position.z = 10;
  // Compiles its shaders now, while loading, not during the first thing it does.
  renderer.compile(rig.scene, camera);
  if (character.look?.darkHalo) canvas.dataset['mascotHalo'] = '';
  rig.setOutlineVisible(currentTheme() === 'light');

  let state = initialNavState;
  let anchor: NavAnchor | null = null;
  let motion = seatedMotion(0);
  let reducedMotion = options.reducedMotion;
  let ring: RingBox | null = null;
  let frameRequest = 0;
  let lastTime = 0;
  let frames = 0;
  let disposed = false;
  let cost = { samples: 0, total: 0, max: 0, maxFrame: 0 };
  const recentCosts: number[] = [];
  let failed = false;
  let breakNext = false;
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const gpuTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as {
    TIME_ELAPSED_EXT: number;
  } | null;
  let gpuQuery: WebGLQuery | null = null;
  let gpuTotal = 0;
  let gpuSamples = 0;
  let seatedNotified = false;
  /** This trip's gait: decided when the trip starts, or when navigation changes its destination. */
  let run = false;
  /** The card's centre, to face while on it. */
  let faceX = 0;

  function fail(reason: MascotFailure) {
    if (failed || disposed) return;
    failed = true;
    options.onFailure(reason);
  }

  /** One frame in ten, so measuring costs next to nothing. */
  function sampleGpu(render: () => void) {
    if (!gpuTimer || gpuQuery || frames % 10 !== 0) {
      render();
      return;
    }
    gpuQuery = gl.createQuery();
    if (gpuQuery) gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, gpuQuery);
    render();
    if (gpuQuery) gl.endQuery(gpuTimer.TIME_ELAPSED_EXT);
  }

  function readGpu() {
    if (!gpuQuery || !gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT_AVAILABLE)) return;
    gpuTotal += (gl.getQueryParameter(gpuQuery, gl.QUERY_RESULT) as number) / 1e6;
    gpuSamples += 1;
    gl.deleteQuery(gpuQuery);
    gpuQuery = null;
  }

  const dispatch = (event: NavEvent) => {
    state = navReducer(state, event);
    canvas.dataset['mascotState'] = state.phase;
  };

  const intentFor = (m: Motion): PoseIntent => ({
    // With reduced motion the idle never advances: time 0 is a still pose.
    idleTime: reducedMotion ? 0 : m.idle,
    gait: m.gait,
    run: m.run,
    cycle: m.cycle,
    jump: m.jumpBlend,
    jumpTime: m.clip,
    sit: easeSit(m.sit),
    yaw: m.yaw,
    point: m.point,
    arm: m.side,
  });

  function draw() {
    if (!anchor || failed) return;
    try {
      drawFrame(anchor);
    } catch {
      fail('frame-error');
    }
  }

  // It may be at rest, with nothing rendering: the new look has to reach the screen.
  const stopFollowingTheme = subscribeTheme(() => {
    rig.setOutlineVisible(currentTheme() === 'light');
    draw();
  });

  function drawFrame(current: NavAnchor) {
    const anchor = current;
    const start = performance.now();
    readGpu();
    poser(rig, intentFor(motion));
    // The clip's height makes the feet descend during takeoff, so the head stays on the page.
    const reach =
      metrics.standingTop +
      (jumpTop(motion.clip, character.jump, metrics) - metrics.standingTop) * motion.jumpBlend;
    const y =
      motion.y === null
        ? feetY(anchor, easeSit(motion.sit), easeSit(motion.rise))
        : headSafeFeetY(motion.y, reach, anchor.size);
    // The canvas moves in whole pixels (compositor only); the rest of the position goes to the
    // camera, so the character stays sharp and still sub-pixel accurate.
    const left = Math.floor(motion.x - WIDTH / 2);
    const top = Math.floor(y - (HEIGHT - BELOW));
    canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    const unit = rig.height / (anchor.size * drawScale);
    camera.left = -(WIDTH / 2) * unit;
    camera.right = (WIDTH / 2) * unit;
    camera.top = (HEIGHT - BELOW) * unit;
    camera.bottom = -BELOW * unit;
    camera.position.x = -(motion.x - WIDTH / 2 - left) * unit;
    camera.position.y = (y - (HEIGHT - BELOW) - top) * unit;
    camera.updateProjectionMatrix();
    sampleGpu(() => renderer.render(rig.scene, camera));
    frames += 1;
    const spent = performance.now() - start;
    cost = {
      samples: cost.samples + 1,
      total: cost.total + spent,
      max: Math.max(cost.max, spent),
      maxFrame: spent > cost.max ? frames : cost.maxFrame,
    };
    recentCosts.push(spent);
    if (recentCosts.length > 600) recentCosts.shift();
    canvas.dataset['mascotX'] = motion.x.toFixed(2);
  }

  const wantsRise = () =>
    anchor !== null &&
    state.goal === 'nav' &&
    motion.y === null &&
    ringReaches(ring, motion.x, anchor);

  const seatedAtRest = () =>
    state.phase === 'seated' && motion.sit === 1 && motion.yaw === 0 && motion.gait === 0;

  /** Where the feet are heading off the nav line, for this frame. */
  function flightGoal(current: NavAnchor): MotionGoal {
    const onCard = state.goal === 'card' && state.landing !== null;
    let dest = null;
    if (onCard && state.landing) {
      dest = { x: state.landing.x, y: state.landing.y };
    } else if (state.phase === 'jumping') {
      // The nearest point of the links' span: from there it walks or runs to the active link.
      const from =
        motion.flight && motion.flight.token === state.token ? motion.flight.arc.to.x : motion.x;
      dest = {
        x: Math.min(current.spanRight, Math.max(current.spanLeft, from)),
        y: feetY(current, 0, 0),
      };
    }
    return {
      phase: state.phase,
      targetX: onCard && state.landing ? state.landing.x : state.targetX,
      size: current.size,
      metrics,
      jump: character.jump,
      riseTo: wantsRise(),
      run,
      token: state.token,
      navY: feetY(current, easeSit(motion.sit), easeSit(motion.rise)),
      dest,
      goal: state.goal,
      side: state.landing?.side ?? motion.side,
      faceX,
    };
  }

  const settled = () =>
    (seatedAtRest() ||
      (state.phase === 'perched' && motion.point === 0 && motion.jumpBlend === 0)) &&
    motion.rise === (wantsRise() ? 1 : 0) &&
    (reducedMotion || motion.idle >= (state.phase === 'perched' ? PERCHED_SECONDS : IDLE_SECONDS));

  /** Tells the director once per arrival on the nav. */
  function notifySeated() {
    if (!seatedAtRest()) {
      seatedNotified = false;
    } else if (!seatedNotified) {
      seatedNotified = true;
      options.onSeated();
    }
  }

  function step(current: NavAnchor, dt: number) {
    const anchor = current;
    const { motion: next, done } = stepMotion(motion, flightGoal(anchor), dt);
    motion = next;
    if (done) {
      dispatch({ type: 'PHASE_DONE', token: state.token });
      // A trip starts on the spot: it takes its gait at once, never blending out of the previous one.
      if (state.phase === 'walking') {
        run = tripRuns(motion.x, anchor);
        if (motion.gait === 0) motion = { ...motion, run: run ? 1 : 0 };
      }
      // The next rest gets its own short idle, then everything stops again.
      if (state.phase === 'seated') motion = { ...motion, idle: 0 };
    }
    draw();
    notifySeated();
  }

  function frame(now: number) {
    frameRequest = 0;
    if (disposed || failed || !anchor) return;
    try {
      if (breakNext) throw new Error('Broken on purpose, for the test.');
      if (lastTime && watchRealFrames && watchdog.record(now - lastTime)) {
        fail('slowdown');
        return;
      }
      const dt = lastTime ? Math.min((now - lastTime) / 1000, MAX_STEP) : 1 / 60;
      lastTime = now;
      step(anchor, dt);
    } catch {
      fail('frame-error');
      return;
    }
    if (!settled() && !document.hidden && !failed) frameRequest = requestAnimationFrame(frame);
  }

  /** Starts the loop if it isn't running. */
  function request() {
    if (frameRequest || disposed || failed || document.hidden) return;
    lastTime = 0;
    watchdog.notePause();
    frameRequest = requestAnimationFrame(frame);
  }

  /** After any change: motion runs the loop, reduced motion draws exactly once. */
  function refresh() {
    if (reducedMotion && state.phase === 'seated') {
      motion = seatedMotion(state.targetX);
      motion = { ...motion, rise: wantsRise() ? 1 : 0 };
      draw();
      notifySeated();
      return;
    }
    request();
  }

  function timing(): FrameCosts {
    const sorted = [...recentCosts].sort((a, b) => a - b);
    const at = (fraction: number) => sorted[Math.floor(sorted.length * fraction)] ?? 0;
    return {
      samples: cost.samples,
      meanMs: cost.samples ? cost.total / cost.samples : 0,
      p50Ms: at(0.5),
      p95Ms: at(0.95),
      maxMs: cost.max,
      maxFrame: cost.maxFrame,
      gpuMeanMs: gpuSamples ? gpuTotal / gpuSamples : null,
    };
  }

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    } else if (!settled()) {
      request();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    fail('context-lost');
  };
  // Restored from the back/forward cache: the context may not have survived the wait.
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted && gl.isContextLost()) fail('context-lost');
  };
  window.addEventListener('pageshow', onPageShow);
  canvas.addEventListener('webglcontextlost', onContextLost);

  const pixelBox = (): PixelBox | null => {
    draw();
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let top = h;
    let bottom = -1;
    let left = w;
    let right = -1;
    for (let row = 0; row < h; row += 1) {
      for (let column = 0; column < w; column += 1) {
        if ((pixels[(row * w + column) * 4 + 3] ?? 0) <= 32) continue;
        const fromTop = h - 1 - row;
        top = Math.min(top, fromTop);
        bottom = Math.max(bottom, fromTop + 1);
        left = Math.min(left, column);
        right = Math.max(right, column + 1);
      }
    }
    if (bottom < 0) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / w;
    return {
      left: rect.left + scrollX + left * scale,
      right: rect.left + scrollX + right * scale,
      top: rect.top + scrollY + top * scale,
      bottom: rect.top + scrollY + bottom * scale,
    };
  };

  return {
    metrics,
    place(next) {
      anchor = next;
      dispatch({ type: 'PLACE', x: next.x });
      motion = { ...motion, x: next.x };
      if (motion.sit === 1 && motion.yaw === 0 && motion.gait === 0) draw();
      notifySeated();
      refresh();
    },
    navigate(next) {
      anchor = next;
      dispatch({ type: 'NAVIGATE', x: next.x, reducedMotion });
      // Already moving: the new destination decides, and the blend keeps the change smooth.
      if (state.phase === 'walking') run = tripRuns(motion.x, next);
      motion = { ...motion, idle: reducedMotion ? 0 : motion.idle };
      seatedNotified = false;
      refresh();
    },
    reanchor(next) {
      anchor = next;
      if (state.phase === 'seated') {
        dispatch({ type: 'PLACE', x: next.x });
        motion = { ...motion, x: next.x };
        draw();
      } else {
        dispatch({ type: 'RETARGET', x: next.x });
      }
      refresh();
    },
    setFocusRing(next) {
      ring = next;
      refresh();
    },
    jumpToCard(landing) {
      const card = document.querySelector('[data-fun-fact]')?.getBoundingClientRect();
      if (card) faceX = card.left + card.width / 2 + scrollX;
      dispatch({ type: 'JUMP_TO_CARD', landing });
      request();
    },
    moveLanding(landing) {
      const card = document.querySelector('[data-fun-fact]')?.getBoundingClientRect();
      if (card) faceX = card.left + card.width / 2 + scrollX;
      dispatch({ type: 'MOVE_LANDING', landing });
      request();
    },
    isOnCardTrip: () => state.goal === 'card',
    isSeated: seatedAtRest,
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      if (reduced) dispatch({ type: 'PLACE', x: state.targetX });
      refresh();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameRequest);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('pageshow', onPageShow);
      stopFollowingTheme();
      if (gpuQuery) gl.deleteQuery(gpuQuery);
      rig.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
    debug: {
      state: () => state,
      motion: () => motion,
      frames: () => frames,
      timing,
      report() {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
        const t = timing();
        const round = (value: number) => value.toFixed(2);
        const gpu =
          t.gpuMeanMs === null ? 'GPU time not available' : `GPU ${round(t.gpuMeanMs)} ms`;
        return `${name} | DPR ${window.devicePixelRatio} | ${t.samples} frames | JS p50 ${round(t.p50Ms)} p95 ${round(t.p95Ms)} max ${round(t.maxMs)} ms (frame ${t.maxFrame}) | ${gpu}`;
      },
      memory: () => ({
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      }),
      settle() {
        cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        for (let i = 0; i < 5000 && anchor; i += 1) {
          if (state.phase === 'seated' && seatedAtRest()) break;
          if (state.phase === 'perched' && motion.point === 0 && motion.jumpBlend === 0) break;
          step(anchor, MAX_STEP);
        }
      },
      simulateFrames(frameMs, count) {
        for (let i = 0; i < count; i += 1) {
          if (watchdog.record(frameMs)) {
            fail('slowdown');
            return;
          }
        }
      },
      breakNextFrame() {
        breakNext = true;
        request();
      },
      outlineVisible: () => rig.outlineVisible,
      measurePose(pose) {
        if (!anchor) return null;
        // Larger than life, for accuracy, and small enough for the highest jump to fit.
        const size = 90;
        const unit = rig.height / (size * drawScale);
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const perCss = h / HEIGHT;
        poser(rig, { ...intentFor(seatedMotion(0)), sit: 0, ...pose });
        camera.left = -(WIDTH / 2) * unit;
        camera.right = (WIDTH / 2) * unit;
        camera.top = (HEIGHT - BELOW) * unit;
        camera.bottom = -BELOW * unit;
        camera.position.x = 0;
        camera.position.y = 0;
        camera.updateProjectionMatrix();
        renderer.render(rig.scene, camera);
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        draw();
        let top = -1;
        let bottom = h;
        let left = w;
        let right = -1;
        for (let row = 0; row < h; row += 1) {
          for (let column = 0; column < w; column += 1) {
            if ((pixels[(row * w + column) * 4 + 3] ?? 0) <= 32) continue;
            top = Math.max(top, row + 1);
            bottom = Math.min(bottom, row);
            left = Math.min(left, column);
            right = Math.max(right, column + 1);
          }
        }
        if (top < 0) return null;
        const toHeights = (px: number) => px / perCss / size;
        return {
          top: toHeights(top) - BELOW / size,
          bottom: toHeights(bottom) - BELOW / size,
          left: toHeights(left) - WIDTH / 2 / size,
          right: toHeights(right) - WIDTH / 2 / size,
        };
      },
      pixelBox,
      jumpReach(samples) {
        let highest = 0;
        for (let i = 0; i < samples; i += 1) {
          const box = this.measurePose({ jump: 1, jumpTime: (character.jump.end * i) / samples });
          highest = Math.max(highest, box?.top ?? 0);
        }
        return highest;
      },
      size: () => anchor?.size ?? 0,
      anchor: () => anchor,
      setLines(restLine, ringLine) {
        if (anchor) anchor = { ...anchor, restLine, ringLine };
        refresh();
      },
    },
  };
}
