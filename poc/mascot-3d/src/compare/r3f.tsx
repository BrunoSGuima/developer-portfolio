import { advance, Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimationMixer, OrthographicCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BENCH_FRAMES, MODEL_URL, SIZE, start, summarise, sync } from './shared.ts';

function Robot() {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const mixer = useMemo(() => new AnimationMixer(gltf.scene), [gltf]);
  const gl = useThree((s) => s.gl);
  const set = useThree((s) => s.set);
  const ran = useRef(false);

  useEffect(() => {
    const camera = new OrthographicCamera(-4, 4, 7, -1, 0.1, 50);
    camera.position.z = 10;
    set({ camera });
    mixer.clipAction(gltf.animations.find((c) => c.name === 'Walking')!).play();
  }, [gltf, mixer, set]);

  useFrame(() => {
    mixer.update(1 / 60);
  });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    advance(performance.now());
    sync(gl.getContext());
    const firstFrameMs = performance.now() - start;
    const samples: number[] = [];
    const frame = (now: number) => {
      const t0 = performance.now();
      advance(now);
      sync(gl.getContext());
      samples.push(performance.now() - t0);
      if (samples.length < BENCH_FRAMES) requestAnimationFrame(frame);
      else summarise(samples, firstFrameMs, gl.getContext() as WebGL2RenderingContext);
    };
    requestAnimationFrame(frame);
  }, [gl]);

  return <primitive object={gltf.scene} />;
}

createRoot(document.getElementById('root')!).render(
  <div style={{ width: SIZE, height: SIZE }}>
    <Canvas frameloop="never" dpr={2} gl={{ alpha: true, antialias: true }} orthographic>
      <ambientLight intensity={1} />
      <directionalLight intensity={2} position={[2, 4, 5]} />
      <Suspense fallback={null}>
        <Robot />
      </Suspense>
    </Canvas>
  </div>,
);
