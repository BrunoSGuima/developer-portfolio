// The numbers both renderer candidates report, so the comparison is like for like.
export const start = performance.now();
export const MODEL_URL = '/models/RobotExpressive.glb';
export const SIZE = 200;
export const BENCH_FRAMES = 240;

const pixel = new Uint8Array(4);
/** Waits until the GPU has really finished: gl.finish() returns early in Chromium. */
export const sync = (gl: WebGLRenderingContext | WebGL2RenderingContext) =>
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

export interface CompareResult {
  firstFrameMs: number;
  meanMs: number;
  p95Ms: number;
  renderer: string;
}

export function summarise(samples: number[], firstFrameMs: number, gl: WebGL2RenderingContext) {
  const sorted = [...samples].sort((a, b) => a - b);
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const result: CompareResult = {
    firstFrameMs,
    meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    renderer: info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown',
  };
  (window as unknown as { __result: CompareResult }).__result = result;
}
