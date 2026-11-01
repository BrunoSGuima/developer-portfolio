import {
  AmbientLight,
  AnimationMixer,
  DirectionalLight,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BENCH_FRAMES, MODEL_URL, SIZE, start, summarise, sync } from './shared.ts';

const renderer = new WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(2);
renderer.setSize(SIZE, SIZE);
document.getElementById('root')!.append(renderer.domElement);

const scene = new Scene();
scene.add(new AmbientLight(0xffffff, 1));
const key = new DirectionalLight(0xffffff, 2);
key.position.set(2, 4, 5);
scene.add(key);
const camera = new OrthographicCamera(-4, 4, 7, -1, 0.1, 50);
camera.position.z = 10;

const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
scene.add(gltf.scene);
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations.find((c) => c.name === 'Walking')!).play();
renderer.render(scene, camera);
sync(renderer.getContext());
const firstFrameMs = performance.now() - start;

const samples: number[] = [];
const frame = () => {
  const t0 = performance.now();
  mixer.update(1 / 60);
  renderer.render(scene, camera);
  sync(renderer.getContext());
  samples.push(performance.now() - t0);
  if (samples.length < BENCH_FRAMES) requestAnimationFrame(frame);
  else summarise(samples, firstFrameMs, renderer.getContext() as WebGL2RenderingContext);
};
requestAnimationFrame(frame);
