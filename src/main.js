import './style.css';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils';
import vertexShader from '../shaders/vertex.glsl';
import fragmentShader from '../shaders/fragment.glsl';
import { Text } from 'troika-three-text';
import textVertex from '../shaders/textVertex.glsl';
import gsap from 'gsap';

/* -------------------------------------------------------------------------- */
/*  How the shape shader works (so the numbers below make sense)              */
/*   - uSmallWavePositionStrength = how TALL the bumps are (surface movement) */
/*   - uSmallWavePositionFrequency = how many bumps (low = big, high = tiny)  */
/*   - uPositionFrequency/Strength = warps the noise: swirlier, more folded   */
/*   - uTwist = twists the pattern around the Y axis                          */
/*   - uRingFrequency/Strength = wavy stripes along Y                         */
/*   - uColor* = how the gradient follows bump height / surface direction     */
/* -------------------------------------------------------------------------- */

const base = {
  uPositionFrequency: 1,
  uPositionStrength: 0.4,
  uSmallWavePositionFrequency: 0.5,
  uSmallWavePositionStrength: 0.5,
  uTwist: 0,
  uRingFrequency: 0,
  uRingStrength: 0,
  uColorBlob: 1.4,
  uColorNormal: 0.6,
  uColorShift: 0.5,
  roughness: 0.3,
  metalness: 0.2,
  envMapIntensity: 1,
  clearcoat: 0,
  clearcoatRoughness: 0,
  transmission: 0,
  flatShading: false,
  wireframe: false,
};

/*  blob(name, bg, gradientFile, overrides)
    bg: null -> auto from gradient | number -> hue shift | '#rrggbb' -> fixed  */
const blob = (name, bg, map, overrides) => ({
  name,
  bg,
  background: '#5a6478', // replaced once textures are loaded
  config: { ...base, ...overrides, map },
});

const blobs = [
  // Modelled on the Blobmixer screenshots (backgrounds sampled from them)
  blob('Fomosphere', '#72bcc5', 'fomosphere', {
    // large smooth folded ribbons, pearly metallic
    uPositionFrequency: 0.9, uPositionStrength: 0.9,
    uSmallWavePositionFrequency: 0.5, uSmallWavePositionStrength: 0.55,
    uTwist: 0.8,
    uColorBlob: 1.0, uColorNormal: 0.9, uColorShift: 0.55,
    roughness: 0.18, metalness: 0.55, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.05,
  }),
  blob('Discobrain', '#7705eb', 'discobrain', {
    // round silhouette, small bumps all over, glossy plastic
    uPositionFrequency: 1.6, uPositionStrength: 0.35,
    uSmallWavePositionFrequency: 2.6, uSmallWavePositionStrength: 0.14,
    uColorBlob: 3.0, uColorNormal: 0.7, uColorShift: 0.5,
    roughness: 0.2, metalness: 0.05, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.15,
  }),

  blob('Color Fusion', '#101044', 'cosmic-fusion', { roughness: 1, metalness: 0, envMapIntensity: 0.5, uPositionStrength: 0.3, uSmallWavePositionStrength: 0.7 }),
  blob('Purple Mirror', '#462C7D', 'purple-rain', { uPositionFrequency: 0.584, uPositionStrength: 0.276, uSmallWavePositionFrequency: 0.899, uSmallWavePositionStrength: 1.266, roughness: 0, metalness: 1, envMapIntensity: 2 }),
  blob('Alien Goo', '#55A9A0', 'lucky-day', { uPositionFrequency: 1.022, uPositionStrength: 0.99, uSmallWavePositionFrequency: 0.378, uSmallWavePositionStrength: 0.341, roughness: 0.292, metalness: 0.73, envMapIntensity: 0.86, clearcoat: 1 }),
  blob('Deep Ocean', '#232F72', 'deep-ocean', { uPositionFrequency: 0.6, uPositionStrength: 0.8, uSmallWavePositionFrequency: 0.3, uSmallWavePositionStrength: 0.6, roughness: 0.15, metalness: 0.6, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.1 }),
  blob('Foil', null, 'foil', { uPositionFrequency: 1.2, uPositionStrength: 0.35, uSmallWavePositionFrequency: 1.4, uSmallWavePositionStrength: 0.5, roughness: 0.05, metalness: 1, envMapIntensity: 2.2 }),
  blob('Halloween', '#FFD150', 'halloween', { uPositionFrequency: 0.9, uPositionStrength: 0.6, uSmallWavePositionFrequency: 0.7, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.8 }),
  blob('Hologram', '#495464', 'hologram', { uPositionFrequency: 0.8, uPositionStrength: 0.4, uSmallWavePositionFrequency: 1.0, uSmallWavePositionStrength: 0.6, roughness: 0.1, metalness: 0.9, envMapIntensity: 1.8, clearcoat: 1 }),
  blob('Imaginarium', '#CD3F3E', 'imaginarium', { uPositionFrequency: 0.5, uPositionStrength: 0.7, uSmallWavePositionFrequency: 0.5, uSmallWavePositionStrength: 0.8, roughness: 0.3, metalness: 0.4, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.1 }),
  blob('Passion', "#830000", 'passion', { uPositionFrequency: 0.9, uPositionStrength: 0.55, roughness: 0.2, envMapIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05 }),
  blob('Pink Floyd', '#F62477', 'pink-floyd', { uPositionFrequency: 0.6, uPositionStrength: 0.3, uSmallWavePositionFrequency: 0.9, uSmallWavePositionStrength: 0.3, roughness: 0.1, metalness: 0.5, envMapIntensity: 1.4, clearcoat: 1 }),
];

const SHAPE_KEYS = [
  'uPositionFrequency', 'uPositionStrength',
  'uSmallWavePositionFrequency', 'uSmallWavePositionStrength',
  'uTwist', 'uRingFrequency', 'uRingStrength',
  'uColorBlob', 'uColorNormal', 'uColorShift',
];
const MATERIAL_KEYS = ['roughness', 'metalness', 'envMapIntensity', 'clearcoat', 'clearcoatRoughness', 'transmission'];

/* -------------------------------------------------------------------------- */
/*  Setup                                                                     */
/* -------------------------------------------------------------------------- */

const DURATION = 1;
const EASE = 'power2.inOut';
const WHEEL_THRESHOLD = 8;
const COOLDOWN_MS = 200;

let isAnimating = false;
let currentIndex = 0;
let lockedUntil = 0;
let started = false;
let gui = null;

const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const rgbeLoader = new RGBELoader(loadingManager);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#5a6478');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#canvas'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// ACES dulls and hue-shifts saturated colours, so the blob stops matching the flat
// background. No tone mapping keeps gradient colours true. Switch it in the debug panel.
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;
if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
else renderer.outputEncoding = THREE.sRGBEncoding;

/* ---------------------------- Textures (preload) --------------------------- */

const textures = {};
blobs.forEach(({ config }) => {
  if (textures[config.map]) return;
  const t = textureLoader.load(`./gradients/${config.map}.png`);
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  else t.encoding = THREE.sRGBEncoding;
  textures[config.map] = t;
});

/* ------------------------ Backgrounds from gradients ----------------------- */

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max ? d / max : 0, max];
}

// Dominant hue of a gradient image -> vivid mid-tone CSS colour
function autoBackground(image, shift = 180) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let x = 0;
  let y = 0;
  let satSum = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const w = s * v;
    x += Math.cos(h * Math.PI * 2) * w;
    y += Math.sin(h * Math.PI * 2) * w;
    satSum += s;
  }
  if (satSum / pixels < 0.15 || (!x && !y)) return '#5a6478';

  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return `hsl(${Math.round((hue + shift) % 360)}, 48%, 58%)`;
}

function resolveBackgrounds() {
  blobs.forEach((b) => {
    if (typeof b.bg === 'string') b.background = b.bg;
    else b.background = autoBackground(textures[b.config.map].image, typeof b.bg === 'number' ? b.bg : 180);
  });
  scene.background.set(blobs[currentIndex].background);
}

/* --------------------------------- Blob ------------------------------------ */

const first = blobs[currentIndex].config;

const uniforms = {
  uTime: { value: 0 },
  uTimeFrequency: { value: 0.3 },
  uSmallWaveTimeFrequency: { value: 0.3 },
  uGradient: { value: textures[first.map] },
  uGradientNext: { value: textures[first.map] },
  uGradientMix: { value: 0 },
};
SHAPE_KEYS.forEach((k) => { uniforms[k] = { value: first[k] }; });

const material = new CustomShaderMaterial({
  baseMaterial: THREE.MeshPhysicalMaterial,
  vertexShader,
  fragmentShader,
  metalness: first.metalness,
  roughness: first.roughness,
  envMapIntensity: first.envMapIntensity,
  clearcoat: first.clearcoat,
  clearcoatRoughness: first.clearcoatRoughness,
  transmission: first.transmission,
  flatShading: first.flatShading,
  wireframe: first.wireframe,
  uniforms,
});

const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, 70));
geometry.computeTangents();

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// On tall, narrow screens the blob would fill the whole width, so shrink it with the aspect ratio
const blobScale = () => THREE.MathUtils.clamp(camera.aspect * 1.3, 0.62, 1);
let baseScale = blobScale();

rgbeLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
  }
);

/* --------------------------------- Titles ---------------------------------- */

const GHOST = 0.28;    // opacity of the previous / next title peeking in at the screen edges
// The next three are fractions of half the visible width, so they scale on every screen
const PEEK = 0.21;     // how much of each neighbour may show
const GAP = 0.085;     // minimum clear space between the centre title and a neighbour
const MIN_PEEK = 0.05; // if less than this would show, hide the neighbour instead of a stray sliver
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const len = blobs.length;

// Signed distance from the current blob around the loop: 0 = current, -1 = previous, 1 = next
const relOf = (i, cur) => {
  let r = (((i - cur) % len) + len) % len;
  if (r > len / 2) r -= len;
  return r;
};

// progress/direction are shared so every title twirls together; opacity is per title
const textUniforms = { progress: { value: 0 }, direction: { value: 1 } };
const makeTextMaterial = () => new THREE.ShaderMaterial({
  vertexShader: textVertex,
  fragmentShader: `uniform float uOpacity; void main() { gl_FragColor = vec4(vec3(1.0), uOpacity); }`,
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  uniforms: {
    progress: textUniforms.progress,
    direction: textUniforms.direction,
    uOpacity: { value: 0 },
  },
});

const textWidths = blobs.map(() => 0);

// Half the visible width, in world units, at the plane the titles sit on (z = 2)
const halfW = () =>
  Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - 2) * camera.aspect;

// Title size comes from the visible width, not the pixel width, so a title always takes
// about 60% of the screen. Capped on ultra-wide screens; long names shrink to fit.
const titleSize = (name) => Math.min(halfW(), 1.37) * Math.min(0.26, 2.6 / name.length);

const widthOf = (i) => textWidths[i] || titleSize(blobs[i].name) * blobs[i].name.length * 0.46;

// Where a title sits and whether it shows. The centre title is at x = 0. A neighbour
// hugs its screen edge but is never allowed to reach into the centre title: if there
// isn't room (small phones, long names) it is hidden rather than overlapping.
function slot(i, rel, centerIdx) {
  if (rel === 0) return { x: 0, show: true };
  const edge = halfW();
  const w = widthOf(i);
  const room = edge - (widthOf(centerIdx) / 2 + GAP * edge); // free space beside the centre title
  const peek = Math.min(PEEK * edge, room);
  const show = peek >= MIN_PEEK * edge;
  const sign = rel < 0 ? -1 : 1;
  const x = show ? sign * (edge - peek + w / 2) : sign * (edge + w / 2 + 0.2);
  return { x, show };
}

function layoutTexts() {
  texts.forEach((t, i) => {
    const rel = relOf(i, currentIndex);
    if (Math.abs(rel) > 1) return;
    const { x, show } = slot(i, rel, currentIndex);
    t.position.x = x;
    t.material.uniforms.uOpacity.value = rel === 0 ? 1 : show ? GHOST : 0;
  });
}

// Measure a title after (re)layout so neighbour placement uses its real width
const syncText = (t, i) => t.sync(() => {
  const bb = t.textRenderInfo.blockBounds;
  textWidths[i] = bb[2] - bb[0];
  if (!isAnimating) layoutTexts();
});

const texts = blobs.map((b, index) => {
  const rel = relOf(index, currentIndex);
  const mat = makeTextMaterial();
  mat.uniforms.uOpacity.value = rel === 0 ? 1 : 0; // neighbours fade in once layoutTexts() has measured them

  const t = new Text();
  t.text = b.name;
  t.font = './aften_screen.woff';
  t.anchorX = 'center';
  t.anchorY = 'middle';
  t.material = mat;
  t.position.set(0, 0, 2);
  t.visible = Math.abs(rel) <= 1;
  t.letterSpacing = -0.08;
  t.fontSize = titleSize(b.name);
  t.glyphGeometryDetail = 20;
  syncText(t, index);
  scene.add(t);
  return t;
});
layoutTexts();

/* ----------------------------------- UI ------------------------------------ */
/*  Edit these three labels for your own nav, and BADGE_TEXT for the ring.    */

const NAV = { left: 'Blob Studio', center: 'Explore', right: 'About' };
const BADGE_TEXT = 'EXPLORE THE BLOBS · SCROLL OR SWIPE · ';

const style = document.createElement('style');
style.textContent = `
  .ui { position: fixed; inset: 0; pointer-events: none; z-index: 10;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: rgba(255,255,255,0.92); font-size: 16px; letter-spacing: 0.005em; }

  /* everything fades in very slowly once the scene is ready */
  .ui__fade { opacity: 0; transition: opacity 2.6s ease 0.5s, transform 2.6s cubic-bezier(.2,.7,.2,1) 0.5s; }
  .ui.is-ready .ui__fade { opacity: 1; transform: none; }

  .ui__nav { position: absolute; top: 28px; left: 32px; right: 32px;
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    transform: translateY(-10px); }
  .ui__link { color: inherit; text-decoration: none; pointer-events: auto; width: fit-content;
    position: relative; padding-bottom: 2px; transition: opacity 0.9s ease; }
  .ui__link::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
    background: currentColor; transform: scaleX(0); transform-origin: left;
    transition: transform 0.9s cubic-bezier(.2,.7,.2,1); }
  .ui__link:hover::after, .ui__link:focus-visible::after { transform: scaleX(1); }
  .ui__nav .ui__link:last-child { justify-self: end; }
  .ui__nav .ui__link:nth-child(2) { justify-self: center; }

  .ui__progress { position: absolute; right: 32px; bottom: calc(34px + env(safe-area-inset-bottom, 0px)); width: 180px; height: 1px;
    background: rgba(255,255,255,0.28); }
  .ui__progress span { position: absolute; left: 0; top: 0; height: 100%; width: 0; background: #fff;
    transition: width 1.4s cubic-bezier(.4,0,.2,1); }

  .ui__badge { position: absolute; left: 50%; bottom: calc(70px + env(safe-area-inset-bottom, 0px)); width: 124px; height: 124px;
    margin-left: -62px; pointer-events: auto; cursor: pointer; border-radius: 50%; will-change: transform; }
  .ui__badge:focus-visible { outline: 1px solid rgba(255,255,255,0.7); outline-offset: 4px; }
  .ui__ring { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; will-change: transform; }
  .ui__ring text { fill: currentColor; font-size: 15px; font-weight: 500; }
  .ui__star { position: absolute; left: 50%; top: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px;
    fill: none; stroke: currentColor; stroke-width: 1.3; stroke-linejoin: round; will-change: transform; }

  @media (max-height: 560px) {
    .ui__badge { width: 76px; height: 76px; margin-left: -38px; bottom: 18px; }
    .ui__star { width: 22px; height: 22px; margin: -11px 0 0 -11px; }
    .ui__nav { top: 18px; }
  }

  @media (max-width: 640px) {
    .ui { font-size: 14px; }
    .ui__nav { left: 20px; right: 20px; top: 20px; }
    .ui__progress { right: 20px; bottom: calc(28px + env(safe-area-inset-bottom, 0px)); width: 110px; }
    .ui__badge { width: 100px; height: 100px; margin-left: -50px; bottom: calc(56px + env(safe-area-inset-bottom, 0px)); }
  }
`;
document.head.appendChild(style);

const ui = document.createElement('div');
ui.className = 'ui';
ui.innerHTML = `
  <nav class="ui__nav ui__fade">
    <a class="ui__link" href="#">${NAV.left}</a>
    <a class="ui__link" href="#">${NAV.center}</a>
    <a class="ui__link" href="#">${NAV.right}</a>
  </nav>
  <div class="ui__progress ui__fade"><span></span></div>
  <div class="ui__badge ui__fade" role="button" tabindex="0" aria-label="Next blob">
    <svg class="ui__ring" viewBox="0 0 200 200" aria-hidden="true">
      <defs><path id="badge-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"/></defs>
      <text><textPath href="#badge-circle" textLength="476" lengthAdjust="spacing">${BADGE_TEXT}</textPath></text>
    </svg>
    <svg class="ui__star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c.8 5.5 4.5 9.2 10 10-5.5.8-9.2 4.5-10 10-.8-5.500-4.5-9.200-10-10 5.500-.8 9.200-4.500 10-10z"/>
    </svg>
  </div>
`;
document.body.appendChild(ui);
ui.querySelectorAll('.ui__link').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

const progressEl = ui.querySelector('.ui__progress span');
const badge = ui.querySelector('.ui__badge');
const ring = ui.querySelector('.ui__ring');
const star = ui.querySelector('.ui__star');

function updateUI() {
  progressEl.style.width = `${((currentIndex + 1) / blobs.length) * 100}%`;
}
updateUI();

/* ---- Badge: ring turns slowly, whole badge drifts a little toward the cursor ---- */

const pointer = { x: 0, y: 0 };            // -1..1 across the screen
const badgeState = { x: 0, y: 0, angle: 0, speed: 14, scale: 1, hover: false };

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

badge.addEventListener('pointerenter', () => { badgeState.hover = true; });
badge.addEventListener('pointerleave', () => { badgeState.hover = false; });
badge.addEventListener('click', () => step(1));
badge.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(1); }
});

function updateBadge(dt) {
  const MAX = 14; // px the badge may drift: a small, fixed area
  const ease = 1 - Math.exp(-dt * 2.5); // low number = slow, soft follow

  const tx = reduceMotion ? 0 : pointer.x * MAX;
  const ty = reduceMotion ? 0 : pointer.y * MAX * 0.6;
  badgeState.x += (tx - badgeState.x) * ease;
  badgeState.y += (ty - badgeState.y) * ease;

  // ring: slow spin, a touch faster on hover
  const targetSpeed = reduceMotion ? 0 : badgeState.hover ? 40 : 14;
  badgeState.speed += (targetSpeed - badgeState.speed) * ease;
  badgeState.angle = (badgeState.angle + badgeState.speed * dt) % 360;

  badgeState.scale += ((badgeState.hover ? 1.18 : 1) - badgeState.scale) * ease;

  badge.style.transform = `translate(${badgeState.x.toFixed(2)}px, ${badgeState.y.toFixed(2)}px)`;
  ring.style.transform = `rotate(${badgeState.angle.toFixed(2)}deg)`;
  // star drifts a bit further than the ring, so it feels like it floats inside it
  star.style.transform =
    `translate(${(badgeState.x * 0.7).toFixed(2)}px, ${(badgeState.y * 0.7).toFixed(2)}px) scale(${badgeState.scale.toFixed(3)})`;
}

/* ------------------------------- Transitions ------------------------------- */

function updateBlob(config) {
  const tween = { duration: DURATION, ease: EASE };

  SHAPE_KEYS.forEach((k) => {
    if (config[k] !== undefined) gsap.to(material.uniforms[k], { value: config[k], ...tween });
  });
  MATERIAL_KEYS.forEach((k) => {
    if (config[k] !== undefined) gsap.to(material, { [k]: config[k], ...tween });
  });

  if (config.wireframe !== undefined) material.wireframe = config.wireframe;
  if (config.flatShading !== undefined && material.flatShading !== config.flatShading) {
    material.flatShading = config.flatShading;
    material.needsUpdate = true;
  }
}

function goTo(next) {
  if (isAnimating || next === currentIndex) return;
  if (performance.now() < lockedUntil) return;
  isAnimating = true;

  // Shortest path around the loop decides the slide direction
  const forward = (next - currentIndex + len) % len;
  const direction = forward <= len / 2 ? 1 : -1;
  const nextTexture = textures[blobs[next].config.map];
  const FAR = halfW() + 3;

  textUniforms.direction.value = direction;

  // Gradient crossfades inside the shader (no pop)
  material.uniforms.uGradientNext.value = nextTexture;
  gsap.to(material.uniforms.uGradientMix, { value: 1, duration: DURATION, ease: EASE });

  // Every title glides one slot: previous <- current <- next. Titles entering the
  // edge come in from off-screen, titles leaving slide out past the other side.
  texts.forEach((t, i) => {
    const oldRel = relOf(i, currentIndex);
    const newRel = relOf(i, next);
    const wasVisible = Math.abs(oldRel) <= 1;
    const willShow = Math.abs(newRel) <= 1;
    if (!wasVisible && !willShow) return;

    const mat = t.material;
    if (!wasVisible) {
      t.visible = true;
      t.position.x = direction * FAR;
      mat.uniforms.uOpacity.value = 0;
    }

    const target = willShow ? slot(i, newRel, next) : null;
    gsap.to(t.position, { x: target ? target.x : -direction * FAR, duration: DURATION, ease: EASE });
    gsap.to(mat.uniforms.uOpacity, {
      value: !target || !target.show ? 0 : newRel === 0 ? 1 : GHOST,
      duration: DURATION,
      ease: EASE,
    });
  });

  gsap.to(textUniforms.progress, {
    value: 0.5,
    duration: DURATION,
    ease: 'linear',
    onComplete: () => {
      material.uniforms.uGradient.value = nextTexture;
      material.uniforms.uGradientMix.value = 0;
      currentIndex = next;
      texts.forEach((t, i) => { t.visible = Math.abs(relOf(i, currentIndex)) <= 1; });
      isAnimating = false;
      lockedUntil = performance.now() + COOLDOWN_MS;
      textUniforms.progress.value = 0;
      updateUI();
    },
  });

  gsap.to(sphere.rotation, { y: sphere.rotation.y - direction * Math.PI * 4, duration: DURATION, ease: EASE });

  const bg = new THREE.Color(blobs[next].background);
  gsap.to(scene.background, { r: bg.r, g: bg.g, b: bg.b, duration: DURATION, ease: 'linear' });

  updateBlob(blobs[next].config);
}

const step = (direction) => goTo((currentIndex + direction + blobs.length) % blobs.length);

/* --------------------------------- Input ----------------------------------- */

window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
  step(Math.sign(e.deltaY));
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
});

let touchX = 0;
let touchY = 0;
window.addEventListener('touchstart', (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  if (Math.abs(d) > 40) step(d < 0 ? 1 : -1);
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  baseScale = blobScale();
  texts.forEach((t, i) => {
    t.fontSize = titleSize(blobs[i].name);
    syncText(t, i);
  });
  if (!isAnimating) layoutTexts();
});

/* ------------------------------ Debug panel -------------------------------- */
/*  Open the site with  ?debug  (e.g. http://localhost:5173/?debug)           */
/*  Needs:  npm i lil-gui                                                     */
/*  Tune the CURRENT blob live, then press "Copy preset" and paste the result  */
/*  into the blobs list.                                                      */

if (location.search.includes('debug')) {
  import('lil-gui').then(({ default: GUI }) => {
    gui = new GUI({ title: 'Blob tuner' });
    const u = material.uniforms;

    const shape = gui.addFolder('Shape');
    shape.add(u.uSmallWavePositionStrength, 'value', 0, 1.5, 0.001).name('Bump height');
    shape.add(u.uSmallWavePositionFrequency, 'value', 0.1, 4, 0.001).name('Bump count');
    shape.add(u.uPositionStrength, 'value', 0, 2, 0.001).name('Warp strength');
    shape.add(u.uPositionFrequency, 'value', 0.1, 3, 0.001).name('Warp frequency');
    shape.add(u.uTwist, 'value', -3, 3, 0.001).name('Twist');
    shape.add(u.uRingStrength, 'value', 0, 0.5, 0.001).name('Stripe height');
    shape.add(u.uTimeFrequency, 'value', 0, 1, 0.001).name('Warp speed');
    shape.add(u.uSmallWaveTimeFrequency, 'value', 0, 1, 0.001).name('Bump speed');

    const look = gui.addFolder('Material');
    look.add(material, 'roughness', 0, 1, 0.001);
    look.add(material, 'metalness', 0, 1, 0.001);
    look.add(material, 'envMapIntensity', 0, 3, 0.001);
    look.add(material, 'clearcoat', 0, 1, 0.001);
    look.add(material, 'clearcoatRoughness', 0, 1, 0.001);

    const colour = gui.addFolder('Colour');
    colour.add(u.uColorBlob, 'value', 0, 6, 0.001).name('Follow bumps');
    colour.add(u.uColorNormal, 'value', 0, 3, 0.001).name('Follow direction');
    colour.add(u.uColorShift, 'value', -2, 2, 0.001).name('Shift');
    const bgState = { background: '#' + scene.background.getHexString() };
    colour.addColor(bgState, 'background').onChange((v) => scene.background.set(v));

    const sceneFolder = gui.addFolder('Scene');
    const maps = {
      None: THREE.NoToneMapping,
      Linear: THREE.LinearToneMapping,
      ACES: THREE.ACESFilmicToneMapping,
      Cineon: THREE.CineonToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
    };
    if (THREE.NeutralToneMapping !== undefined) maps.Neutral = THREE.NeutralToneMapping;
    sceneFolder.add(renderer, 'toneMapping', maps).name('Tone mapping').onChange(() => { material.needsUpdate = true; });
    sceneFolder.add(renderer, 'toneMappingExposure', 0.3, 2, 0.01).name('Exposure');

    gui.add({
      copy() {
        const r = (n) => Math.round(n * 1000) / 1000;
        const out = {};
        SHAPE_KEYS.forEach((k) => { out[k] = r(u[k].value); });
        MATERIAL_KEYS.forEach((k) => { out[k] = r(material[k]); });
        const text = `bg: '#${scene.background.getHexString()}',\nconfig: ${JSON.stringify(out, null, 2)}`;
        console.log(text);
        navigator.clipboard?.writeText(text);
      },
    }, 'copy').name('Copy preset');
  });
}

/* ------------------------------- Render loop ------------------------------- */

const clock = new THREE.Clock();
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const t = clock.getElapsedTime();
  uniforms.uTime.value = t;

  // Slow "breathing": the blob and the titles drift up and down a hair, slightly out
  // of phase with each other (about an 8 second cycle), plus a barely-there scale pulse.
  const amp = reduceMotion ? 0 : 1;
  sphere.position.y = Math.sin(t * 0.8) * 0.045 * amp;
  sphere.scale.setScalar(baseScale * (1 + Math.sin(t * 0.55 + 1.2) * 0.012 * amp));
  const titleY = Math.sin(t * 0.8 + 0.9) * 0.028 * amp;
  texts.forEach((tx) => { if (tx.visible) tx.position.y = titleY; });

  updateBadge(dt);

  if (gui) gui.controllersRecursive().forEach((c) => c.updateDisplay());
  renderer.render(scene, camera);
}

loadingManager.onLoad = () => {
  if (started) return;
  started = true;
  resolveBackgrounds();
  layoutTexts();
  ui.classList.add('is-ready');
  animate();
};