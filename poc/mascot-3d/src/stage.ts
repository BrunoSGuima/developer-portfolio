import { OrthographicCamera, WebGLRenderer } from 'three';
import { Pose, Rig, type ClipName } from './rig.ts';
import { runSheet } from './sheet.ts';

const params = new URLSearchParams(location.search);
const rig = await new Rig().load();
const W = Number(params.get('w') ?? 1920);
const H = Number(params.get('h') ?? 1080);

const renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.setClearColor(0, 0);
renderer.setScissorTest(true);
renderer.autoClear = false;
document.getElementById('root')!.append(renderer.domElement);

const HALF_WIDTH = 1.3;
const ABOVE = 1.7;
const BELOW = 0.5;

/** Draws the pose so the character stands `size` CSS px tall with its feet at (x, feetY) in the page. */
export function draw(
  pose: Pose,
  x: number,
  feetY: number,
  size: number,
  clip?: { x: number; y: number; w: number; h: number },
) {
  rig.apply(pose);
  const scale = size / rig.height;
  const half = size * HALF_WIDTH;
  const camera = new OrthographicCamera(
    -half / scale,
    half / scale,
    (size * ABOVE) / scale,
    -(size * BELOW) / scale,
    -50,
    50,
  );
  camera.position.z = 10;
  camera.updateProjectionMatrix();
  const vx = Math.round(x - half);
  const vy = Math.round(H - feetY - size * BELOW);
  const vw = Math.round(half * 2);
  const vh = Math.round(size * (ABOVE + BELOW));
  renderer.setViewport(vx, vy, vw, vh);
  if (clip) {
    const cx0 = Math.max(vx, clip.x);
    const cy0 = Math.max(vy, H - clip.y - clip.h);
    const cx1 = Math.min(vx + vw, clip.x + clip.w);
    const cy1 = Math.min(vy + vh, H - clip.y);
    renderer.setScissor(cx0, cy0, Math.max(0, cx1 - cx0), Math.max(0, cy1 - cy0));
  } else {
    renderer.setScissor(vx, vy, vw, vh);
  }
  renderer.clearDepth();
  renderer.render(rig.scene, camera);
}

export function clear() {
  renderer.setViewport(0, 0, W, H);
  renderer.setScissor(0, 0, W, H);
  renderer.clear();
}

export type { ClipName };
const api = { rig, draw, clear, renderer, W, H, measure };
export type Api = typeof api;

if (params.get('mode') === 'sheet') runSheet(api);
if (params.get('mode') === 'film')
  (window as unknown as { __film: unknown }).__film = await (
    await import('./film.ts')
  ).createFilm(api);
(window as unknown as { __ready: boolean }).__ready = true;

/** Pixel-accurate box of a pose, in multiples of the idle standing height, from the alpha channel. */
function measure(pose: Pose) {
  const size = 300;
  clear();
  draw(pose, W / 2, size * 2, size);
  const gl = renderer.getContext();
  const half = size * HALF_WIDTH;
  const x0 = Math.round(W / 2 - half);
  const y0 = Math.round(H - size * 2 - size * BELOW);
  const w = Math.round(half * 2);
  const h = Math.round(size * (ABOVE + BELOW));
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let top = -1,
    bottom = h,
    left = w,
    right = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3]! > 32) {
        top = Math.max(top, y);
        bottom = Math.min(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  const feet = size * BELOW;
  return {
    top: +((top - feet) / size).toFixed(3),
    bottom: +((bottom - feet) / size).toFixed(3),
    left: +((left - half) / size).toFixed(3),
    right: +((right - half) / size).toFixed(3),
  };
}
(window as unknown as { __api: unknown }).__api = { rig, draw, clear, measure };
