import { DESKTOP_QUERY } from '../useMediaQuery.ts';

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Software rendering would burn the CPU for a decoration; `failIfMajorPerformanceCaveat` let it through in M1. */
export const isSoftwareRenderer = (renderer: string) => SOFTWARE_RENDERER.test(renderer);

function usableWebGL(allowSoftware: boolean): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return false;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return allowSoftware || !isSoftwareRenderer(renderer);
}

interface DeviceHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/** Only what browsers report: a browser that reports nothing isn't assumed to be weak. */
export const isLowEndDevice = ({ deviceMemory, hardwareConcurrency }: DeviceHints) =>
  (deviceMemory !== undefined && deviceMemory <= 2) ||
  (hardwareConcurrency !== undefined && hardwareConcurrency > 0 && hardwareConcurrency <= 2);

/** Whether this visit should use the 3D mascot at all; otherwise the 2D one simply stays. */
export function canRun3D(): boolean {
  if (!window.matchMedia(DESKTOP_QUERY).matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;
  // Set only by the flagged E2E build: headless browsers have nothing but a software renderer, and
  // CI machines have few cores.
  const testBuild = import.meta.env.VITE_MASCOT_3D_ALLOW_SOFTWARE === '1';
  if (!testBuild && isLowEndDevice(navigator)) return false;
  return usableWebGL(testBuild);
}
