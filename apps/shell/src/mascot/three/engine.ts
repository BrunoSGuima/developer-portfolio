import { OrthographicCamera, WebGLRenderer } from 'three';
import {
  tripRuns,
  feetY,
  headSafeFeetY,
  type NavAnchor,
  POSE,
  type RingBox,
  ringReaches,
} from './anchors.ts';
import type { CardLanding } from './landing.ts';
import { initialNavState, navReducer, type NavEvent, type NavState } from './machine.ts';
import {
  easeSit,
  jumpTop,
  type Motion,
  type MotionGoal,
  seatedMotion,
  stepMotion,
} from './motion.ts';
import { Rig } from './rig.ts';

const MODEL_URL = new URL('./assets/RobotExpressive.glb', import.meta.url).href;

/** The small moving canvas, in CSS pixels: kept in step with mascot3d.css. */
const WIDTH = 180;
const HEIGHT = 160;
/** Room below the feet inside the canvas. */
const BELOW = 30;
/** The idle plays this long, then the character holds still and nothing renders (WCAG 2.2.2). */
const IDLE_SECONDS = 4;
/** A long frame (a slow machine, a tab coming back) never turns into a sudden move. */
const MAX_STEP = 1 / 15;

export interface PixelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** For the flagged E2E build and the report: never part of a normal build. */
export interface MascotDebug {
  state: () => NavState;
  motion: () => Motion;
  /** Frames rendered since load: flat means nothing is rendering. */
  frames: () => number;
  /** JS cost of a frame (pose, skinning, draw submission), with no GPU read-back. */
  timing: () => { samples: number; meanMs: number; maxMs: number };
  /** The character's visible pixels, in document coordinates. */
  pixelBox: () => PixelBox | null;
  /** How far a clip reaches above the feet across its length, as multiples of the height. */
  clipTop: (clip: 'Jump', samples: number) => number;
  size: () => number;
  anchor: () => NavAnchor | null;
  /** Moves the character's lines, for comparing positions. */
  setLines: (restLine: number, ringLine: number) => void;
}

export interface MascotEngine {
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
    onContextLost: () => void;
    /** Fully settled on the active link: when the jump's delay starts. */
    onSeated: () => void;
  },
): Promise<MascotEngine> {
  const rig = await Rig.load(MODEL_URL);

  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setClearColor(0, 0);
  host.append(canvas);

  const camera = new OrthographicCamera(-1, 1, 1, -1, -50, 50);
  camera.position.z = 10;

  let state = initialNavState;
  let anchor: NavAnchor | null = null;
  let motion = seatedMotion(0);
  let reducedMotion = options.reducedMotion;
  let ring: RingBox | null = null;
  let frameRequest = 0;
  let lastTime = 0;
  let frames = 0;
  let disposed = false;
  let cost = { samples: 0, total: 0, max: 0 };
  let seatedNotified = false;
  /** This trip's gait: decided when the trip starts, or when navigation changes its destination. */
  let run = false;
  /** The card's centre, to face while on it. */
  let faceX = 0;

  const dispatch = (event: NavEvent) => {
    state = navReducer(state, event);
    canvas.dataset['mascotState'] = state.phase;
  };

  const poseFor = (m: Motion) => {
    const sit = easeSit(m.sit);
    const ground = 1 - m.jumpBlend;
    const towardCard = m.side === 'L' ? 1 : -1;
    return {
      layers: [
        // With reduced motion the idle never advances: time 0 is a still pose.
        { clip: 'Idle' as const, time: reducedMotion ? 0 : m.idle, weight: ground * (1 - m.gait) },
        { clip: 'Walking' as const, time: m.cycle, weight: ground * m.gait * (1 - m.run) },
        { clip: 'Running' as const, time: m.cycle, weight: ground * m.gait * m.run },
        { clip: 'Jump' as const, time: m.clip, weight: m.jumpBlend },
      ].filter((layer) => layer.weight > 0),
      yaw: m.yaw,
      sit,
      // Down and across, towards the card's content
      point: { weight: m.point, x: 0.68 * towardCard, y: -0.62, side: m.side },
      look: { yaw: 0, pitch: 0.22 * m.point },
    };
  };

  function draw() {
    if (!anchor) return;
    const start = performance.now();
    rig.apply(poseFor(motion));
    // The clip's height makes the feet descend during takeoff, so the head stays on the page.
    const reach = POSE.standingTop + (jumpTop(motion.clip) - POSE.standingTop) * motion.jumpBlend;
    const y =
      motion.y === null
        ? feetY(anchor, easeSit(motion.sit), easeSit(motion.rise))
        : headSafeFeetY(motion.y, reach, anchor.size);
    // The canvas moves in whole pixels (compositor only); the rest of the position goes to the
    // camera, so the character stays sharp and still sub-pixel accurate.
    const left = Math.floor(motion.x - WIDTH / 2);
    const top = Math.floor(y - (HEIGHT - BELOW));
    canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    const unit = rig.height / anchor.size;
    camera.left = -(WIDTH / 2) * unit;
    camera.right = (WIDTH / 2) * unit;
    camera.top = (HEIGHT - BELOW) * unit;
    camera.bottom = -BELOW * unit;
    camera.position.x = -(motion.x - WIDTH / 2 - left) * unit;
    camera.position.y = (y - (HEIGHT - BELOW) - top) * unit;
    camera.updateProjectionMatrix();
    renderer.render(rig.scene, camera);
    frames += 1;
    const spent = performance.now() - start;
    cost = { samples: cost.samples + 1, total: cost.total + spent, max: Math.max(cost.max, spent) };
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
    (reducedMotion || motion.idle >= IDLE_SECONDS);

  /** Tells the director once per arrival on the nav. */
  function notifySeated() {
    if (!seatedAtRest()) {
      seatedNotified = false;
    } else if (!seatedNotified) {
      seatedNotified = true;
      options.onSeated();
    }
  }

  function frame(now: number) {
    frameRequest = 0;
    if (disposed || !anchor) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, MAX_STEP) : 1 / 60;
    lastTime = now;
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
    if (!settled() && !document.hidden) frameRequest = requestAnimationFrame(frame);
  }

  /** Starts the loop if it isn't running. */
  function request() {
    if (frameRequest || disposed || document.hidden) return;
    lastTime = 0;
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
    options.onContextLost();
  };
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
      renderer.dispose();
      canvas.remove();
    },
    debug: {
      state: () => state,
      motion: () => motion,
      frames: () => frames,
      timing: () => ({
        samples: cost.samples,
        meanMs: cost.samples ? cost.total / cost.samples : 0,
        maxMs: cost.max,
      }),
      pixelBox,
      clipTop(clip, samples) {
        if (!anchor) return 0;
        const duration = rig.clipDuration(clip);
        let highest = 0;
        const gl = renderer.getContext();
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const pixels = new Uint8Array(w * h * 4);
        const pxPerCss = h / HEIGHT;
        const unit = rig.height / anchor.size;
        for (let i = 0; i < samples; i += 1) {
          rig.apply({ layers: [{ clip, time: (duration * i) / samples }] });
          camera.left = -(WIDTH / 2) * unit;
          camera.right = (WIDTH / 2) * unit;
          camera.top = (HEIGHT - BELOW) * unit;
          camera.bottom = -BELOW * unit;
          camera.position.x = 0;
          camera.position.y = 0;
          camera.updateProjectionMatrix();
          renderer.render(rig.scene, camera);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          for (let row = h - 1; row >= 0; row -= 1) {
            let found = false;
            for (let column = 0; column < w; column += 1) {
              if ((pixels[(row * w + column) * 4 + 3] ?? 0) > 32) {
                found = true;
                break;
              }
            }
            if (found) {
              highest = Math.max(highest, ((row + 1) / pxPerCss - BELOW) / anchor.size);
              break;
            }
          }
        }
        draw();
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
