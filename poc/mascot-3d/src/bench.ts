// Open this page on real hardware: it reports the GPU it actually used, which the recording
// environment cannot reach. Every number is from this browser, on this device.
import { OrthographicCamera, WebGLRenderer } from 'three';
import { sync } from './compare/shared.ts';
import { Rig } from './rig.ts';

const FRAMES = 180;
const root = document.getElementById('root')!;
root.style.cssText = 'padding:16px;max-width:60rem';
const heading = document.createElement('h1');
heading.textContent = 'Mascot M1 bench: running…';
const table = document.createElement('pre');
root.append(heading, table);

const rig = await new Rig().load();
const results: {
  canvas: string;
  pixels: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  gpuMeanMs: number | null;
}[] = [];
let rendererName = 'unknown';

for (const [width, height, dpr] of [
  [200, 200, 1],
  [200, 200, 2],
  [1920, 1080, 1],
] as const) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
  renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;opacity:.9';
  document.body.append(renderer.domElement);
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (info) rendererName = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const aspect = width / height;
  const camera = new OrthographicCamera(-4 * aspect, 4 * aspect, 7, -1, 0.1, 50);
  camera.position.z = 10;

  const samples: number[] = [];
  const gpu: number[] = [];
  await new Promise<void>((resolve) => {
    const frame = () => {
      const i = samples.length;
      const t0 = performance.now();
      const query = timer ? gl.createQuery() : null;
      if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      rig.apply({ layers: [{ clip: 'Walking', time: (i / 60) % 0.96 }] });
      renderer.render(rig.scene, camera);
      if (query) gl.endQuery(timer.TIME_ELAPSED_EXT);
      sync(gl);
      samples.push(performance.now() - t0);
      if (query) {
        const poll = () => {
          if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE))
            return void setTimeout(poll, 4);
          gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
          gl.deleteQuery(query);
        };
        poll();
      }
      if (samples.length < FRAMES) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  // The first frames compile shaders: the budget is about the steady state
  const steady = samples.slice(10).sort((a, b) => a - b);
  results.push({
    canvas: `${width}x${height} @${dpr}x`,
    pixels: width * height * dpr * dpr,
    meanMs: +(steady.reduce((a, b) => a + b, 0) / steady.length).toFixed(2),
    p95Ms: +steady[Math.floor(steady.length * 0.95)]!.toFixed(2),
    maxMs: +steady.at(-1)!.toFixed(2),
    gpuMeanMs: gpu.length
      ? +(gpu.slice(10).reduce((a, b) => a + b, 0) / Math.max(1, gpu.length - 10)).toFixed(2)
      : null,
  });
  renderer.dispose();
  renderer.domElement.remove();
  renderer.forceContextLoss();
}
heading.textContent = 'Mascot M1 bench: done';
table.textContent = `Renderer: ${rendererName}\nDPR of this display: ${devicePixelRatio}\n\n${JSON.stringify(results, null, 2)}`;
(window as unknown as { __bench: unknown }).__bench = { renderer: rendererName, results };
