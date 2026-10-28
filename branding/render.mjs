// Renders app icons, splash and store graphics from inline SVG using headless Chrome.
// Usage: node branding/render.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

const root = resolve(import.meta.dirname, '..');
const images = join(root, 'assets/images');
const store = join(root, 'branding/store');
mkdirSync(store, { recursive: true });

const GREEN_LIGHT = '#22C55E';
const GREEN_DARK = '#15803D';

const gradient = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GREEN_LIGHT}"/>
    <stop offset="1" stop-color="${GREEN_DARK}"/>
  </linearGradient>`;

/** White ring (80% progress) with a leaf, centred at (512, 512) in a 1024 box. */
function mark(color = '#fff', scale = 1) {
  const r = 250;
  const c = 2 * Math.PI * r;
  return `
  <defs>
    <mask id="leafMask">
      <rect width="1024" height="1024" fill="#000"/>
      <path d="M512 372 C610 412 628 548 512 652 C396 548 414 412 512 372 Z" fill="#fff"/>
      <path d="M512 440 L512 640" stroke="#000" stroke-width="16" stroke-linecap="round"/>
    </mask>
  </defs>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <circle cx="512" cy="512" r="${r}" fill="none" stroke="${color}" stroke-opacity="0.28" stroke-width="64"/>
    <circle cx="512" cy="512" r="${r}" fill="none" stroke="${color}" stroke-width="64" stroke-linecap="round"
      stroke-dasharray="${c * 0.78} ${c}" transform="rotate(-90 512 512)"/>
    <g transform="rotate(32 512 512)">
      <rect width="1024" height="1024" fill="${color}" mask="url(#leafMask)"/>
    </g>
  </g>`;
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const ICON_FULL = svg(1024, 1024, `<defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#bg)"/>${mark()}`);
const FOREGROUND = svg(1024, 1024, mark('#fff', 0.98));
const BACKGROUND = svg(1024, 1024, `<defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#bg)"/>`);
const SPLASH = svg(1024, 1024, mark('#fff', 1.6));

const FEATURE = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>${gradient}</defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <circle cx="930" cy="-40" r="230" fill="#fff" opacity="0.06"/>
  <circle cx="40" cy="520" r="200" fill="#fff" opacity="0.06"/>
  <svg x="40" y="70" width="360" height="360" viewBox="0 0 1024 1024">${mark('#fff', 1.25)}</svg>
  <g font-family="Segoe UI, Arial, sans-serif" fill="#fff">
    <text x="420" y="225" font-size="120" font-weight="800">Ситно</text>
    <text x="424" y="290" font-size="44" font-weight="600" opacity="0.95">Лічильник калорій</text>
    <g font-size="26" font-weight="600">
      <rect x="424" y="330" width="150" height="48" rx="24" fill="#fff" fill-opacity="0.18"/>
      <text x="499" y="363" text-anchor="middle">Калорії</text>
      <rect x="588" y="330" width="110" height="48" rx="24" fill="#fff" fill-opacity="0.18"/>
      <text x="643" y="363" text-anchor="middle">БЖВ</text>
      <rect x="712" y="330" width="110" height="48" rx="24" fill="#fff" fill-opacity="0.18"/>
      <text x="767" y="363" text-anchor="middle">Вода</text>
      <rect x="836" y="330" width="140" height="48" rx="24" fill="#fff" fill-opacity="0.18"/>
      <text x="906" y="363" text-anchor="middle">Історія</text>
    </g>
  </g>
</svg>`;

const jobs = [
  [ICON_FULL, 1024, 1024, join(images, 'icon.png')],
  [FOREGROUND, 1024, 1024, join(images, 'android-icon-foreground.png')],
  [FOREGROUND, 1024, 1024, join(images, 'android-icon-monochrome.png')],
  [BACKGROUND, 1024, 1024, join(images, 'android-icon-background.png')],
  [SPLASH, 1024, 1024, join(images, 'splash-icon.png')],
  [ICON_FULL, 48, 48, join(images, 'favicon.png')],
  [ICON_FULL, 512, 512, join(store, 'icon-512.png')],
  [FEATURE, 1024, 500, join(store, 'feature-graphic-1024x500.png')],
];

const tmp = mkdtempSync(join(tmpdir(), 'brand-'));
for (const [source, w, h, out] of jobs) {
  const html = join(tmp, 'page.html');
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${source}`
  );
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    `file:///${html.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
  console.log('✔', out);
}
writeFileSync(join(root, 'branding/icon.svg'), ICON_FULL);
writeFileSync(join(root, 'branding/feature-graphic.svg'), FEATURE);
