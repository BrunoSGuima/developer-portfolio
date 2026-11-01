// Runs under the site's real CSP. Records what the policy allows and what it blocks, including a
// negative control (an embedded texture) that must fail, or this test proves nothing.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const violations: { directive: string; blocked: string }[] = [];
document.addEventListener('securitypolicyviolation', (e) => {
  violations.push({ directive: e.effectiveDirective, blocked: e.blockedURI });
});

const attempt = async (run: () => Promise<unknown>) => {
  try {
    await run();
    return 'loaded';
  } catch (error) {
    return `failed: ${String(error).slice(0, 120)}`;
  }
};
const silent = () => new Promise((r) => setTimeout(r, 300));
const report: Record<string, unknown> = {};
const probe = async (name: string, run: () => Promise<unknown>) => {
  const before = violations.length;
  const outcome = await attempt(run);
  await silent();
  report[name] = { outcome, violations: violations.slice(before) };
};

const hasTexture = async (url: string) => {
  const gltf = await new GLTFLoader().loadAsync(url);
  let found = false;
  gltf.scene.traverse((o) => {
    const material = (o as unknown as { material?: { map?: { image?: unknown } } }).material;
    if (material?.map?.image) found = true;
  });
  if (!found) throw new Error('no texture image was decoded');
};

await probe('model without images (RobotExpressive)', () =>
  new GLTFLoader().loadAsync('/models/RobotExpressive.glb'),
);
await probe('NEGATIVE CONTROL: GLB with embedded PNG', () =>
  hasTexture('/models/control-embedded.glb'),
);
await probe('glTF with same-origin external PNG', () =>
  hasTexture('/models/control-external.gltf'),
);
await probe(
  'blob: worker (how Draco and KTX2 decoders start)',
  () =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob(['postMessage(1)'], { type: 'text/javascript' }));
      const worker = new Worker(url);
      worker.onmessage = resolve;
      worker.onerror = () => reject(new Error('worker blocked'));
      setTimeout(() => reject(new Error('worker timeout')), 1000);
    }),
);
await probe('WebAssembly compile (Draco, KTX2, Meshopt WASM)', () =>
  WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])),
);
(window as unknown as { __csp: unknown }).__csp = report;
