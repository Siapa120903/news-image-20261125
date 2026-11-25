// News image for Wednesday 25 November 2026, drawn from scratch in code.
// Node 22, standard library only, no network, no files read, no clock,
// no randomness: the same input always writes the same PNG bytes.
// The program draws a newspaper front page at 1024x1024: a masthead
// naming the day, the day's biggest story (a Houthi drone strike on a
// tower in Riyadh, injuring 11 people), and the other stories a picture
// editor would put on the front page: China's Shenzhou-24 launch
// carrying Pakistan's first astronaut, the slide in Asian tech shares,
// the eruption of Mount Mayon in the Philippines, the COP31 talks
// ending with no deal, a hostage seizure in Cartagena, the first US
// human H5N1 bird flu deaths and cases, and Shein's $100m settlement.
// Text is drawn with a 5x7 bitmap font scaled up, shapes are drawn
// pixel by pixel, and the PNG is encoded by hand with zlib, so the
// whole image is produced by this one file.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// Colours: paper, ink, red, blue, green, gold, grey.
const PAPER: [number, number, number] = [247, 243, 232];
const INK: [number, number, number] = [24, 24, 24];
const RED: [number, number, number] = [178, 34, 34];
const BLUE: [number, number, number] = [38, 84, 138];
const DARKBLUE: [number, number, number] = [22, 52, 88];
const GREEN: [number, number, number] = [46, 125, 72];
const GOLD: [number, number, number] = [198, 142, 32];
const GREY: [number, number, number] = [110, 110, 105];
const LIGHT: [number, number, number] = [232, 226, 210];
const WHITE: [number, number, number] = [255, 255, 255];

type RGB = [number, number, number];
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) { px[i * 3] = PAPER[0]; px[i * 3 + 1] = PAPER[1]; px[i * 3 + 2] = PAPER[2]; }

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPixel(i, j, c);
}
function drawRect(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  fillRect(x, y, w, t, c); fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c); fillRect(x + w - t, y, t, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 2): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function filledCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPixel(x, y, c);
  }
}
function circleOutline(cx: number, cy: number, r: number, c: RGB, t = 3): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) setPixel(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
  }
}

// 5x7 bitmap font, one string per row, '#' = on. Only the characters used.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?']!;
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if (g[r]![col] === '1') fillRect(cx + col * scale, y + r * scale, scale, scale, c);
    }
    cx += 6 * scale;
  }
}
function drawTextCentred(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
  drawText(x + Math.floor((w - textWidth(s, scale)) / 2), y, s, scale, c);
}
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW) cur = trial;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(x: number, y: number, s: string, scale: number, maxW: number, c: RGB, lh: number): number {
  const lines = wrap(s, scale, maxW);
  lines.forEach((ln, i) => drawText(x, y + i * lh, ln, scale, c));
  return y + lines.length * lh;
}

// CRC32 for PNG chunks.
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(path: string): void {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, png);
  chmodSync(path, 0o644);
}

// ---- Layout: a newspaper front page, 1024 x 1024 ----
// Outer frame.
drawRect(14, 14, W - 28, H - 28, INK, 4);
fillRect(22, 22, W - 44, 8, RED);

// Masthead.
drawTextCentred(0, 44, W, 'THE WORLD IN ONE DAY', 7, INK);
drawTextCentred(0, 108, W, 'THE NEWS OF WEDNESDAY 25 NOVEMBER 2026', 3, RED);
fillRect(60, 148, W - 120, 3, INK);

// Main story: Riyadh struck.
fillRect(40, 168, 620, 34, RED);
drawText(56, 176, 'RIYADH STRUCK', 4, WHITE);
drawPara(40, 214, 'A Houthi drone hits a tower in Riyadh, injuring 11 people, in the second strike on the Saudi capital in days.', 3, 620, INK, 28);
drawPara(40, 342, 'Saudi civil defence calls the attack', 2, 620, GREY, 20);
drawPara(40, 364, 'a terrorist attack on a civilian tower.', 2, 620, GREY, 20);

// Tower picture, top right: a tall tower with smoke.
fillRect(790, 190, 60, 180, DARKBLUE);
fillRect(775, 170, 90, 20, BLUE);
fillRect(800, 150, 40, 20, BLUE);
fillRect(760, 210, 24, 12, GREY);
fillRect(830, 250, 30, 12, GREY);
drawText(748, 388, 'RIYADH, SAUDI ARABIA', 2, INK);

// Divider.
fillRect(40, 420, W - 80, 3, INK);

// Three columns.
const colY = 440;
const colW = 296;
const colX = [40, 364, 688];
const heads = ['SHENZHOU-24', 'TECH SLIDE', 'MAYON ERUPTS'];
const headCols: RGB[] = [DARKBLUE, RED, GREEN];
const bodies = [
  'China launches Shenzhou-24 from Jiuquan, carrying Pakistan\'s first astronaut into space on a Long March 2F rocket.',
  'Asian tech shares slide as AI confidence weakens, after a Wall Street retreat and a sharp sell-off in AI stocks.',
  'Mount Mayon in the Philippines erupts, sending an ash cloud 3,000 metres into the sky and raising fears of a bigger blast.',
];
colX.forEach((x, i) => {
  fillRect(x, colY, colW, 30, headCols[i]!);
  drawText(x + 10, colY + 6, heads[i]!, 2, WHITE);
  drawPara(x, colY + 44, bodies[i]!, 2, colW, INK, 19);
});

// Falling chart, under the tech column.
const chartX = 364, chartY = 620, chartW = 296, chartH = 90;
drawRect(chartX, chartY, chartW, chartH, INK, 2);
const pts = [20, 26, 22, 38, 34, 52, 48, 66, 78];
pts.forEach((p, i) => {
  if (i === 0) return;
  line(chartX + 10 + (i - 1) * 32, chartY + pts[i - 1]!, chartX + 10 + i * 32, chartY + p, RED, 4);
});
drawText(chartX + 8, chartY + chartH + 8, 'ASIAN TECH SHARES DOWN', 2, RED);

// Small pictures under the other two columns: a rocket and a volcano.
fillRect(40, 620, 296, 90, LIGHT);
drawRect(40, 620, 296, 90, INK, 2);
fillRect(180, 640, 20, 50, RED);
line(190, 640, 170, 660, RED, 3);
line(190, 640, 210, 660, RED, 3);
fillRect(175, 690, 30, 8, GOLD);
drawText(56, 722, 'JIUQUAN, CHINA', 2, INK);
fillRect(688, 620, 296, 90, LIGHT);
drawRect(688, 620, 296, 90, INK, 2);
line(760, 700, 830, 630, INK, 3);
line(830, 630, 900, 700, INK, 3);
fillRect(820, 620, 20, 12, RED);
drawText(700, 722, 'MAYON, PHILIPPINES', 2, INK);

// Bottom strip: four more stories.
fillRect(40, 760, W - 80, 3, INK);
drawText(40, 780, 'ALSO TODAY', 3, RED);
const strip = [
  'COP31 ENDS WITH NO DEAL: climate talks in Antalya collapse.',
  'CARTAGENA HOSTAGES: gunmen seize a supermarket in Colombia.',
  'BIRD FLU: US reports three human H5N1 cases, one death.',
  'SHEIN TO PAY $100M to settle lawsuits in the US.',
];
strip.forEach((s, i) => {
  const y = 824 + i * 34;
  filledCircle(52, y + 8, 6, RED);
  drawText(72, y, s, 2, INK);
});

// Footer.
fillRect(40, 968, W - 80, 3, INK);
drawTextCentred(0, 982, W, '25 NOVEMBER 2026', 2, GREY);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
writePng(join(outDir, 'entry.png'));
