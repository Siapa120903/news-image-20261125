// Wednesday 25 November 2026, drawn from scratch in code.
// A Node program, standard library only. No network, no file reads,
// no clock, no randomness: running it twice writes identical bytes.
// It paints a newspaper front page, 1024 by 1024, about the day:
// a Houthi drone strike on a tower in Riyadh, China's Shenzhou-24
// launch with Pakistan's first astronaut, falling Asian tech shares,
// Mount Mayon's eruption, and four more stories at the foot.
// Glyphs come from a small 5 by 7 bitmap font stored as bit rows,
// shapes are painted pixel by pixel, and the PNG is encoded by hand.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';

const WIDTH = 1024;
const HEIGHT = 1024;

const paper = [247, 243, 232];
const ink = [24, 24, 24];
const scarlet = [178, 34, 34];
const ocean = [38, 84, 138];
const navy = [22, 52, 88];
const leaf = [46, 125, 72];
const amber = [198, 142, 32];
const smoke = [110, 110, 105];
const sand = [232, 226, 210];
const snow = [255, 255, 255];

type Triple = [number, number, number];
const canvas = new Uint8Array(WIDTH * HEIGHT * 3);
for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
  canvas[i * 3] = paper[0];
  canvas[i * 3 + 1] = paper[1];
  canvas[i * 3 + 2] = paper[2];
}

function put(x: number, y: number, colour: number[]): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const at = (y * WIDTH + x) * 3;
  canvas[at] = colour[0]!;
  canvas[at + 1] = colour[1]!;
  canvas[at + 2] = colour[2]!;
}

function box(x: number, y: number, w: number, h: number, colour: number[]): void {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) put(xx, yy, colour);
  }
}

function frame(x: number, y: number, w: number, h: number, colour: number[], thick = 2): void {
  box(x, y, w, thick, colour);
  box(x, y + h - thick, w, thick, colour);
  box(x, y, thick, h, colour);
  box(x + w - thick, y, thick, h, colour);
}

function segment(x0: number, y0: number, x1: number, y1: number, colour: number[], thick = 2): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    box(x - Math.floor(thick / 2), y - Math.floor(thick / 2), thick, thick, colour);
    if (x === x1 && y === y1) break;
    const doubled = 2 * err;
    if (doubled >= dy) { err += dy; x += stepX; }
    if (doubled <= dx) { err += dx; y += stepY; }
  }
}

function disc(cx: number, cy: number, radius: number, colour: number[]): void {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius) put(x, y, colour);
    }
  }
}

function ring(cx: number, cy: number, radius: number, colour: number[], thick = 3): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < thick; k += 1) {
      put(Math.round(cx + (radius - k) * Math.cos(rad)), Math.round(cy + (radius - k) * Math.sin(rad)), colour);
    }
  }
}

// A 5 by 7 font. Each glyph is seven rows; each row is five bits
// packed into a number, the leftmost column in the highest bit.
const GLYPHS: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 6, 8, 16, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 2, 8],
  '-': [0, 0, 0, 14, 0, 0, 0],
  '%': [25, 26, 2, 4, 8, 11, 19],
  '+': [0, 4, 4, 14, 4, 4, 0],
  "'": [4, 4, 8, 0, 0, 0, 0],
  ':': [0, 12, 12, 0, 12, 12, 0],
  '/': [1, 2, 2, 4, 8, 8, 16],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '&': [12, 18, 20, 8, 21, 18, 13],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 6, 4, 0, 4],
  '"': [10, 10, 0, 0, 0, 0, 0],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '>': [8, 4, 2, 1, 2, 4, 8],
  '$': [4, 15, 20, 14, 5, 30, 4],
};

function measure(text: string, size: number): number {
  return text.length * 6 * size - size;
}

function paintText(x: number, y: number, text: string, size: number, colour: number[]): void {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS['?']!;
    for (let row = 0; row < 7; row += 1) {
      const bits = glyph[row]!;
      for (let col = 0; col < 5; col += 1) {
        if ((bits >> (4 - col)) & 1) box(cursor + col * size, y + row * size, size, size, colour);
      }
    }
    cursor += 6 * size;
  }
}

function paintCentred(y: number, width: number, text: string, size: number, colour: number[]): void {
  paintText(Math.floor((width - measure(text, size)) / 2), y, text, size, colour);
}

function splitLines(text: string, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const trial = current ? current + ' ' + word : word;
    if (measure(trial, size) <= maxWidth) {
      current = trial;
    } else {
      if (current) out.push(current);
      current = word;
    }
  }
  if (current) out.push(current);
  return out;
}

function paintPara(x: number, y: number, text: string, size: number, maxWidth: number, colour: number[], leading: number): number {
  const lines = splitLines(text, size, maxWidth);
  lines.forEach((lineText, i) => paintText(x, y + i * leading, lineText, size, colour));
  return y + lines.length * leading;
}

// CRC32, used by the PNG chunks below.
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(kind: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const tagged = Buffer.concat([Buffer.from(kind, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tagged), 0);
  return Buffer.concat([length, tagged, crc]);
}

function savePng(path: string): void {
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * (1 + WIDTH * 3)] = 0;
    raw.set(canvas.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3), y * (1 + WIDTH * 3) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png);
  chmodSync(path, 0o644);
}

// ---- The front page ----
// Outer frame and red rule.
frame(14, 14, WIDTH - 28, HEIGHT - 28, ink, 4);
box(22, 22, WIDTH - 44, 8, scarlet);

// Masthead, naming the day.
paintCentred(44, WIDTH, 'THE WORLD IN ONE DAY', 7, ink);
paintCentred(108, WIDTH, 'THE NEWS OF WEDNESDAY 25 NOVEMBER 2026', 3, scarlet);
box(60, 148, WIDTH - 120, 3, ink);

// Lead story: Riyadh struck.
box(40, 168, 620, 34, scarlet);
paintText(56, 176, 'RIYADH STRUCK', 4, snow);
paintPara(40, 214, 'A Houthi drone hits a tower in Riyadh, injuring 11 people, in the second strike on the Saudi capital in days.', 3, 620, ink, 28);
paintPara(40, 342, 'Saudi civil defence calls the attack', 2, 620, smoke, 20);
paintPara(40, 364, 'a terrorist attack on a civilian tower.', 2, 620, smoke, 20);

// The tower, top right.
box(790, 190, 60, 180, navy);
box(775, 170, 90, 20, ocean);
box(800, 150, 40, 20, ocean);
box(760, 210, 24, 12, smoke);
box(830, 250, 30, 12, smoke);
paintText(748, 388, 'RIYADH, SAUDI ARABIA', 2, ink);

// Divider.
box(40, 420, WIDTH - 80, 3, ink);

// Three columns, each with a headline bar and a short report.
const columns = [
  {
    x: 40, bar: navy, head: 'SHENZHOU-24',
    body: "China launches Shenzhou-24 from Jiuquan, carrying Pakistan's first astronaut into space on a Long March 2F rocket.",
  },
  {
    x: 364, bar: scarlet, head: 'TECH SLIDE',
    body: 'Asian tech shares slide as AI confidence weakens, after a Wall Street retreat and a sharp sell-off in AI stocks.',
  },
  {
    x: 688, bar: leaf, head: 'MAYON ERUPTS',
    body: 'Mount Mayon in the Philippines erupts, sending an ash cloud 3,000 metres into the sky and raising fears of a bigger blast.',
  },
];
for (const col of columns) {
  box(col.x, 440, 296, 30, col.bar);
  paintText(col.x + 10, 446, col.head, 2, snow);
  paintPara(col.x, 484, col.body, 2, 296, ink, 19);
}

// A falling chart under the markets column.
frame(364, 620, 296, 90, ink, 2);
const chart = [20, 26, 22, 38, 34, 52, 48, 66, 78];
for (let i = 1; i < chart.length; i += 1) {
  segment(364 + 10 + (i - 1) * 32, 620 + chart[i - 1]!, 364 + 10 + i * 32, 620 + chart[i]!, scarlet, 4);
}
paintText(372, 718, 'ASIAN TECH SHARES DOWN', 2, scarlet);

// A rocket under the space column, a volcano under the eruption column.
box(40, 620, 296, 90, sand);
frame(40, 620, 296, 90, ink, 2);
box(180, 640, 20, 50, scarlet);
segment(190, 640, 170, 660, scarlet, 3);
segment(190, 640, 210, 660, scarlet, 3);
box(175, 690, 30, 8, amber);
paintText(56, 722, 'JIUQUAN, CHINA', 2, ink);
box(688, 620, 296, 90, sand);
frame(688, 620, 296, 90, ink, 2);
segment(760, 700, 830, 630, ink, 3);
segment(830, 630, 900, 700, ink, 3);
box(820, 620, 20, 12, scarlet);
paintText(700, 722, 'MAYON, PHILIPPINES', 2, ink);

// Four more stories at the foot.
box(40, 760, WIDTH - 80, 3, ink);
paintText(40, 780, 'ALSO TODAY', 3, scarlet);
const also = [
  'COP31 ENDS WITH NO DEAL: climate talks in Antalya collapse.',
  'CARTAGENA HOSTAGES: gunmen seize a supermarket in Colombia.',
  'BIRD FLU: US reports three human H5N1 cases, one death.',
  'SHEIN TO PAY $100M to settle lawsuits in the US.',
];
also.forEach((story, i) => {
  const y = 824 + i * 34;
  disc(52, y + 8, 6, scarlet);
  paintText(72, y, story, 2, ink);
});

// Footer, naming the day once more.
box(40, 968, WIDTH - 80, 3, ink);
paintCentred(982, WIDTH, '25 NOVEMBER 2026', 2, smoke);

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
savePng(join(outputDir, 'entry.png'));
