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

// How hard the user is scrolling right now (0..1.6). Every wheel tick / swipe adds to it and it
// fades out within a second, so a gentle scroll gives a gentle ripple and a hard one a big swell.
let scrollEnergy = 0;
const addEnergy = (n) => { scrollEnergy = Math.min(1.6, scrollEnergy + n); };
const waveEnv = { v: 0 };   // 0 -> 1 -> 0 envelope of each transition (the long tail is the water settling)
let waveDir = 1;            // smoothed scroll direction, so waves never jump when you reverse
let activeIndex = currentIndex; // the title in the centre; only this one breathes
const breath = blobs.map(() => 0); // per-title breathing weight (eases to 1 for the active title)

// Horizontal float: the blob drifts a few pixels sideways with the scroll, then glides back to the centre.
const DRIFT_MAX = 0.2;  // furthest it may drift, in world units (about 30px on a laptop screen)
const DRIFT_SIGN = -1;  // -1: the blob moves WITH the content (scroll forward -> drifts left). Set 1 to reverse.
const drift = { x: 0, vx: 0, target: 0, hold: 0, dragging: false };
const nudgeDrift = (n) => {
  if (reduceMotion) return;
  drift.target = THREE.MathUtils.clamp(drift.target + n, -DRIFT_MAX, DRIFT_MAX);
};

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
const textUniforms = { progress: { value: 0 }, direction: { value: 1 }, uWave: { value: 0 }, uPhase: { value: 0 } };
const makeTextMaterial = () => new THREE.ShaderMaterial({
  vertexShader: textVertex,
  fragmentShader: `uniform float uOpacity; void main() { gl_FragColor = vec4(vec3(1.0), uOpacity); }`,
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  uniforms: {
    progress: textUniforms.progress,
    direction: textUniforms.direction,
    uWave: textUniforms.uWave,
    uPhase: textUniforms.uPhase,
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
  /* the badge moves every frame, so it must fade in with opacity ONLY: a transform
     transition here would smooth its movement over seconds and make it feel laggy */
  .ui__fade--opacity { transition: opacity 2.6s ease 0.5s; }

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

  .ui__right { justify-self: end; display: flex; align-items: center; gap: 28px; }
  button.ui__link { background: none; border: 0; font: inherit; cursor: pointer; }
  .ui__sound { display: inline-flex; align-items: center; gap: 8px; }
  .ui__eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 11px; }
  .ui__eq i { width: 2px; height: 2px; background: currentColor; border-radius: 1px; }
  .ui__sound.is-on .ui__eq i { animation: ui-eq 1.8s ease-in-out infinite; }
  .ui__sound.is-on .ui__eq i:nth-child(2) { animation-delay: -0.6s; }
  .ui__sound.is-on .ui__eq i:nth-child(3) { animation-delay: -1.2s; }
  @keyframes ui-eq { 0%, 100% { height: 3px; } 50% { height: 11px; } }
  @media (prefers-reduced-motion: reduce) { .ui__sound.is-on .ui__eq i { animation: none; height: 7px; } }

  .ui__progress { position: absolute; right: 32px; bottom: calc(34px + env(safe-area-inset-bottom, 0px)); width: 180px; height: 1px;
    background: rgba(255,255,255,0.28); }
  .ui__progress span { position: absolute; left: 0; top: 0; height: 100%; width: 0; background: #fff;
    transition: width 1.4s cubic-bezier(.4,0,.2,1); }

  .ui__credit { position: absolute; left: 32px; bottom: calc(34px + env(safe-area-inset-bottom, 0px));
  display: block; line-height: 1; }

  .ui__badge { position: absolute; left: 50%; bottom: calc(70px + env(safe-area-inset-bottom, 0px)); width: 124px; height: 124px;
    margin-left: -62px; pointer-events: auto; cursor: pointer; border-radius: 50%; will-change: transform; }
  .ui__badge:focus-visible { outline: 1px solid rgba(255,255,255,0.7); outline-offset: 4px; }
  .ui__ring { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; will-change: transform; }
  .ui__ring text { fill: currentColor; font-size: 15px; font-weight: 500; }
  .ui__ripple { position: absolute; inset: 0; border-radius: 50%; border: 1px solid currentColor;
    pointer-events: none; animation: ui-ripple 1.5s cubic-bezier(.2,.7,.2,1) forwards; }
  @keyframes ui-ripple { from { transform: scale(0.7); opacity: 0.7; } to { transform: scale(1.9); opacity: 0; } }
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
    .ui__credit { left: 20px; bottom: calc(28px + env(safe-area-inset-bottom, 0px)); }
    .ui__badge { width: 100px; height: 100px; margin-left: -50px; bottom: calc(56px + env(safe-area-inset-bottom, 0px)); }
  }

  @media (max-width: 380px) {
    .ui { font-size: 13px; }
    .ui__right { gap: 14px; }
  }
`;
document.head.appendChild(style);

const ui = document.createElement('div');
ui.className = 'ui';
ui.innerHTML = `
  <nav class="ui__nav ui__fade">
    <a class="ui__link" href="#">${NAV.left}</a>
    <a class="ui__link" href="https://www.behance.net/jainesh" target="_blank" rel="noopener noreferrer">${NAV.center}</a>
    <div class="ui__right">
      <button class="ui__link ui__sound" type="button" aria-pressed="false" aria-label="Turn sound on">
        <span>Sound</span><span class="ui__eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <a class="ui__link" href="https://www.linkedin.com/in/jainesh-prajapati" target="_blank" rel="noopener noreferrer">${NAV.right}</a>
    </div>
  </nav>
  <div class="ui__progress ui__fade"><span></span></div>
  <a class="ui__link ui__credit ui__fade" href="https://www.behance.net/jainesh" target="_blank" rel="noopener noreferrer">Made by Jainesh</a>
  <div class="ui__badge ui__fade ui__fade--opacity" role="button" tabindex="0" aria-label="Next blob">
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
ui.querySelectorAll('a.ui__link').forEach((a) => {
  // only stop the placeholder "#" link from jumping to the top; real links open normally
  if (a.getAttribute('href') === '#') {
    a.addEventListener('click', (e) => e.preventDefault());
  }
});

const progressEl = ui.querySelector('.ui__progress span');
const badge = ui.querySelector('.ui__badge');
const ring = ui.querySelector('.ui__ring');
const star = ui.querySelector('.ui__star');

function updateUI() {
  progressEl.style.width = `${((currentIndex + 1) / blobs.length) * 100}%`;
}
updateUI();

/* ---- Badge: a springy magnet that reacts to the cursor ----
   Zone 1 (anywhere on screen): it drifts inside a small fixed box toward the cursor.
   Zone 2 (inside MAGNET_RADIUS): it is pulled toward the cursor, harder the closer you get.
   Flicking the cursor past it spins the ring, pressing squishes it, clicking sends a ripple. */

const BADGE = {
  AREA_X: 40, AREA_Y: 24,      // zone 1: how far it drifts in total across the screen (px)
  MAGNET_RADIUS: 240,          // zone 2: distance (px) at which it starts chasing the cursor
  PULL: 0.42,                  // zone 2: share of the cursor offset it follows at point-blank range
  MAX_X: 90, MAX_Y: 60,        // hard limits, so it always stays inside its area
  STIFFNESS: 20, DAMPING: 6.5, // spring feel: lower stiffness = lazier, lower damping = more wobble
  SPIN: 14, SPIN_MAX: 240,     // resting spin and the fastest a flick can make it turn (deg/s)
};

const clamp = THREE.MathUtils.clamp;
const pointer = { x: 0, y: 0, px: window.innerWidth / 2, py: window.innerHeight / 2 };
const badgeRest = { x: window.innerWidth / 2, y: window.innerHeight - 130 }; // where it sits with no offset
const badgeState = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: BADGE.SPIN, scale: 1, hover: false, press: false };

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.px = e.clientX;
  pointer.py = e.clientY;
  if (reduceMotion) return;
  // a flick near the badge kicks the ring around in the direction the cursor moved
  if (Math.hypot(e.clientX - badgeRest.x, e.clientY - badgeRest.y) < BADGE.MAGNET_RADIUS) {
    const kick = clamp(e.movementX || 0, -50, 50) * 0.9;
    badgeState.spin = clamp(badgeState.spin + kick, -BADGE.SPIN_MAX, BADGE.SPIN_MAX);
  }
}, { passive: true });

badge.addEventListener('pointerenter', () => { badgeState.hover = true; });
badge.addEventListener('pointerleave', () => { badgeState.hover = false; badgeState.press = false; });
badge.addEventListener('pointerdown', () => { badgeState.press = true; });
window.addEventListener('pointerup', () => { badgeState.press = false; });

function activateBadge() {
  const r = document.createElement('span');
  r.className = 'ui__ripple';
  r.addEventListener('animationend', () => r.remove());
  badge.appendChild(r);
  addEnergy(0.5);
  sound.blip(740);
  step(1);
}
badge.addEventListener('click', activateBadge);
badge.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateBadge(); }
});

function updateBadge(dt) {
  // where the badge would sit with no offset (measured, so it stays right on every screen)
  const rect = badge.getBoundingClientRect();
  badgeRest.x = rect.left + rect.width / 2 - badgeState.x;
  badgeRest.y = rect.top + rect.height / 2 - badgeState.y;

  let tx = 0;
  let ty = 0;
  let near = 0;
  if (!reduceMotion) {
    tx = pointer.x * BADGE.AREA_X;
    ty = pointer.y * BADGE.AREA_Y;

    const dx = pointer.px - badgeRest.x;
    const dy = pointer.py - badgeRest.y;
    const f = 1 - Math.hypot(dx, dy) / BADGE.MAGNET_RADIUS;
    if (f > 0) {
      near = f * f * (3 - 2 * f); // smoothstep: 0 at the edge of the zone, 1 right on top of it
      tx += dx * BADGE.PULL * near;
      ty += dy * BADGE.PULL * near;
    }
    tx = clamp(tx, -BADGE.MAX_X, BADGE.MAX_X);
    ty = clamp(ty, -BADGE.MAX_Y, BADGE.MAX_Y);
  }

  // damped spring toward the target: this is what gives it the soft, slightly wobbly follow
  badgeState.vx += ((tx - badgeState.x) * BADGE.STIFFNESS - badgeState.vx * BADGE.DAMPING) * dt;
  badgeState.vy += ((ty - badgeState.y) * BADGE.STIFFNESS - badgeState.vy * BADGE.DAMPING) * dt;
  badgeState.x += badgeState.vx * dt;
  badgeState.y += badgeState.vy * dt;

  // ring: turns faster the closer the cursor is; flicks (above) add a kick that eases back out
  const restSpin = reduceMotion ? 0 : BADGE.SPIN + near * 22 + (badgeState.hover ? 26 : 0);
  badgeState.spin += (restSpin - badgeState.spin) * (1 - Math.exp(-dt * 1.1));
  badgeState.angle = (badgeState.angle + badgeState.spin * dt) % 360;

  const targetScale = (badgeState.press ? 0.9 : 1) + near * 0.1 + (badgeState.hover ? 0.1 : 0);
  badgeState.scale += (targetScale - badgeState.scale) * (1 - Math.exp(-dt * 8));

  const tilt = reduceMotion ? 0 : clamp(badgeState.vx * 0.12, -28, 28); // star leans into the movement
  badge.style.transform = `translate(${badgeState.x.toFixed(2)}px, ${badgeState.y.toFixed(2)}px)`;
  ring.style.transform = `rotate(${badgeState.angle.toFixed(2)}deg)`;
  star.style.transform =
    `translate(${(badgeState.x * 0.7).toFixed(2)}px, ${(badgeState.y * 0.7).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${badgeState.scale.toFixed(3)})`;
}

/* ----------------------------------- Sound --------------------------------- */
/*  No audio files: the sweep is generated live with the Web Audio API.       */
/*  A soft filtered-noise whoosh plays on every scroll / swipe / key transition: */
/*  it rises going forward, falls going back, and gets longer and louder the    */
/*  harder you scroll. There is no background sound.                           */
/*  Off by default. Browsers only allow sound after a click/tap/key press.     */

const SOUND = {
  MASTER: 0.8,          // overall volume, 0..1
  SWEEP_VOLUME: 0.2,    // sweep loudness for a normal scroll; harder scrolls are louder
  SWEEP_SECONDS: 1.1,   // base length of the whoosh
  SWEEP_LOW: 300,       // Hz: the sweep moves between these two pitches
  SWEEP_HIGH: 2000,
  REVERB_SECONDS: 3,    // length of the airy tail
  FADE_SECONDS: 1.2,    // fade in / out when toggling
};

const sound = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const st = { ctx: null, master: null, send: null, noise: null, on: false };

  function impulse(ctx, seconds) {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    return buf;
  }

  function build() {
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // shared reverb: anything connected to `send` gets the airy tail
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, SOUND.REVERB_SECONDS);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    conv.connect(wet);
    wet.connect(master);
    const send = ctx.createGain();
    send.connect(conv);

    // one shared burst of white noise, reused by every sweep
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    Object.assign(st, { ctx, master, send, noise });
  }

  function start() {
    if (!AC) return;
    if (!st.ctx) build();
    st.on = true;
    st.ctx.resume();
    const now = st.ctx.currentTime;
    st.master.gain.cancelScheduledValues(now);
    st.master.gain.setTargetAtTime(SOUND.MASTER, now, SOUND.FADE_SECONDS / 3);
  }

  function stop() {
    if (!st.ctx) return;
    st.on = false;
    const now = st.ctx.currentTime;
    st.master.gain.cancelScheduledValues(now);
    st.master.gain.setTargetAtTime(0, now, SOUND.FADE_SECONDS / 3);
    setTimeout(() => { if (!st.on) st.ctx.suspend(); }, SOUND.FADE_SECONDS * 1000 + 300);
  }

  // The transition whoosh: forward = rising pitch, back = falling pitch
  function sweep(direction, energy) {
    if (!st.on) return;
    const { ctx } = st;
    const now = ctx.currentTime;
    const e = Math.min(energy, 1.6);
    const dur = SOUND.SWEEP_SECONDS + e * 0.7;
    const peak = SOUND.SWEEP_VOLUME * (0.6 + e * 0.9);

    const src = ctx.createBufferSource();
    src.buffer = st.noise;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    const from = direction > 0 ? SOUND.SWEEP_LOW : SOUND.SWEEP_HIGH;
    const to = direction > 0 ? SOUND.SWEEP_HIGH : SOUND.SWEEP_LOW;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    let out = gain;
    if (ctx.createStereoPanner) { // sweeps across the speakers with the content
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(0.45 * direction, now);
      pan.pan.linearRampToValueAtTime(-0.45 * direction, now + dur);
      gain.connect(pan);
      out = pan;
    }
    out.connect(st.master);
    out.connect(st.send);
    src.start(now);
    src.stop(now + dur + 0.1);
  }

  // A tiny soft "tick" for button presses
  function blip(freq = 660) {
    if (!st.on) return;
    const { ctx } = st;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(g);
    g.connect(st.master);
    g.connect(st.send);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  function setMaster(v) { if (st.ctx && st.on) st.master.gain.setTargetAtTime(v, st.ctx.currentTime, 0.1); }

  document.addEventListener('visibilitychange', () => {
    if (!st.ctx || !st.on) return;
    if (document.hidden) st.ctx.suspend(); else st.ctx.resume();
  });

  return { supported: !!AC, start, stop, sweep, blip, setMaster };
})();

// ---- the nav toggle (remembers your choice) ----
const soundBtn = ui.querySelector('.ui__sound');

// Keep sound OFF by default (icon off), and only enable if toggled
let soundWanted = false;

// Only enable sound if user previously enabled it in localStorage AND THEN turn it on
try {
  const storedPref = localStorage.getItem('blob-sound');
  if (storedPref === '1') {
    soundWanted = true;
  } else {
    soundWanted = false;
  }
} catch (err) {
  soundWanted = false;
}

function showSoundState() {
  // Update the icon to match the soundWanted state, which is false by default unless user enabled it before
  soundBtn.classList.toggle('is-on', soundWanted);
  soundBtn.setAttribute('aria-pressed', String(soundWanted));
  soundBtn.setAttribute('aria-label', soundWanted ? 'Turn sound off' : 'Turn sound on');
}
showSoundState();

if (!sound.supported) soundBtn.hidden = true;

soundBtn.addEventListener('click', () => {
  soundWanted = !soundWanted;
  try { localStorage.setItem('blob-sound', soundWanted ? '1' : '0'); } catch (err) { /* ignore */ }
  showSoundState();
  if (soundWanted) { sound.start(); sound.blip(880); } else sound.stop();
});

// If sound was on last time, the browser still needs one click / tap / key press before it will play
if (soundWanted && sound.supported) {
  const unlock = () => { if (soundWanted) sound.start(); };
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { once: true }));
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
  activeIndex = next;

  // Shortest path around the loop decides the slide direction
  const forward = (next - currentIndex + len) % len;
  const direction = forward <= len / 2 ? 1 : -1;
  const nextTexture = textures[blobs[next].config.map];
  // Scroll strength: a hard scroll gives a bigger overshoot, a bigger swell and a longer settle
  const energy = Math.min(scrollEnergy, 1.6);
  nudgeDrift(DRIFT_SIGN * direction * (0.07 + energy * 0.07));
  sound.sweep(direction, energy);
  const settle = `back.out(${(0.5 + energy * 0.8).toFixed(2)})`; // incoming title overshoots, then floats back
  const offscreen = (i, sign) => sign * (halfW() + widthOf(i) / 2 + 0.25);

  textUniforms.direction.value = direction;

  // Gradient crossfades inside the shader (no pop)
  material.uniforms.uGradientNext.value = nextTexture;
  gsap.to(material.uniforms.uGradientMix, { value: 1, duration: DURATION, ease: EASE });

  // Every title glides one slot: previous <- current <- next. The title arriving in the centre
  // overshoots a little and settles, like something floating on water; the others drift softly.
  texts.forEach((t, i) => {
    const oldRel = relOf(i, currentIndex);
    const newRel = relOf(i, next);
    const wasVisible = Math.abs(oldRel) <= 1;
    const willShow = Math.abs(newRel) <= 1;
    if (!wasVisible && !willShow) return;

    const mat = t.material;
    if (!wasVisible) {
      t.visible = true;
      t.position.x = offscreen(i, direction);
      mat.uniforms.uOpacity.value = 0;
    }

    const target = willShow ? slot(i, newRel, next) : null;
    gsap.to(t.position, {
      x: target ? target.x : offscreen(i, -direction),
      duration: DURATION * 1.4,
      ease: newRel === 0 ? settle : 'power3.out',
      overwrite: 'auto',
    });
    gsap.to(mat.uniforms.uOpacity, {
      value: !target || !target.show ? 0 : newRel === 0 ? 1 : GHOST,
      duration: DURATION,
      ease: EASE,
      overwrite: 'auto',
    });
  });

  // Water surface under the titles: swells up fast, then calms down slowly. The harder you
  // scroll, the longer it takes to settle (and the bigger it gets, see the render loop).
  gsap.killTweensOf(waveEnv);
  gsap.timeline()
    .to(waveEnv, { v: 1, duration: 0.35, ease: 'power2.out' })
    .to(waveEnv, { v: 0, duration: 1.6 + energy * 0.8, ease: 'sine.inOut' });

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

// Firefox reports wheel ticks in "lines" instead of pixels, so normalise first
const wheelUnits = (e) => (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);

window.addEventListener('wheel', (e) => {
  // Left/right scrolling (trackpad swipe, shift + wheel) works like up/down scrolling
  const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
  const raw = (horizontal ? e.deltaX : e.deltaY) * wheelUnits(e);
  const mag = Math.abs(raw);

  addEnergy(mag / 250); // keeps feeding the ripples while a transition is running: scroll harder, get more water
  if (horizontal) nudgeDrift(DRIFT_SIGN * Math.sign(raw) * Math.min(mag / 1500, 0.05)); // keeps pushing while you keep scrolling

  if (mag < WHEEL_THRESHOLD) return;
  step(Math.sign(raw));
}, { passive: true });

window.addEventListener('keydown', (e) => {
  const next = e.key === 'ArrowDown' || e.key === 'ArrowRight';
  const prev = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
  if (!next && !prev) return;
  addEnergy(0.3);
  step(next ? 1 : -1);
});

let touchX = 0;
let touchY = 0;
window.addEventListener('touchstart', (e) => {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
  drift.dragging = true;
  drift.hold = 0;
}, { passive: true });
window.addEventListener('touchmove', (e) => {
  if (reduceMotion) return;
  const dx = e.touches[0].clientX - touchX;
  drift.hold = THREE.MathUtils.clamp(-DRIFT_SIGN * dx * 0.0012, -DRIFT_MAX, DRIFT_MAX); // follows the finger
}, { passive: true });
window.addEventListener('touchend', (e) => {
  drift.dragging = false;
  drift.target = drift.hold; // let go: it eases back from wherever the finger left it
  drift.hold = 0;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  if (Math.abs(d) > 40) {
    addEnergy(Math.min(Math.abs(d) / 200, 1.2)); // a long swipe = a strong scroll
    step(d < 0 ? 1 : -1);
  }
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

    const audioFolder = gui.addFolder('Sound');
    audioFolder.add(SOUND, 'SWEEP_VOLUME', 0, 0.4, 0.001).name('Sweep volume');
    audioFolder.add(SOUND, 'MASTER', 0, 1, 0.01).name('Master').onChange((v) => sound.setMaster(v));

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
  // Only the title in the centre breathes; the previous / next ones stay still. The weight eases
  // between 0 and 1, so when the active title changes the float hands over smoothly.
  const titleY = Math.sin(t * 0.8 + 0.9) * 0.028 * amp;
  texts.forEach((tx, i) => {
    if (!tx.visible) return;
    breath[i] += ((i === activeIndex ? 1 : 0) - breath[i]) * (1 - Math.exp(-dt * 2.2));
    tx.position.y = titleY * breath[i];
  });

  // Water under the titles: strength follows the transition envelope AND how hard you are
  // scrolling right now. Direction is smoothed so reversing never makes the waves jump.
  scrollEnergy *= Math.exp(-dt * 1.3);
  waveDir += (textUniforms.direction.value - waveDir) * (1 - Math.exp(-dt * 3));
  textUniforms.uPhase.value += dt * waveDir;
  textUniforms.uWave.value = Math.min(waveEnv.v * (0.4 + scrollEnergy), 2.2);

  // Horizontal float: a soft spring chases the drift target, and the target relaxes back to 0.
  // The slight lag and overshoot is what makes it feel like floating rather than sliding.
  drift.target *= Math.exp(-dt * 1.6);
  const driftGoal = drift.dragging ? drift.hold : drift.target;
  drift.vx += ((driftGoal - drift.x) * 14 - drift.vx * 5.5) * dt;
  drift.x += drift.vx * dt;
  sphere.position.x = drift.x;
  sphere.rotation.z = THREE.MathUtils.clamp(-drift.vx * 0.18, -0.15, 0.15); // leans a touch into the move

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