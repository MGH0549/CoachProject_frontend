// Render the existing red APEX brand color and a simple A mark without native dependencies.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const outer = [
  [0.27, 0.73],
  [0.46, 0.25],
  [0.54, 0.25],
  [0.73, 0.73],
  [0.63, 0.73],
  [0.585, 0.61],
  [0.415, 0.61],
  [0.37, 0.73],
];
const inner = [
  [0.445, 0.53],
  [0.5, 0.38],
  [0.555, 0.53],
];
function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const bytes = Buffer.concat([name, data]);
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, checksum]);
}
function png(size) {
  const pixels = Buffer.alloc(size * (size * 3 + 1));
  const background = [236, 51, 71];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coverage = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const nx = (x + (sx + 0.5) / 4) / size;
          const ny = (y + (sy + 0.5) / 4) / size;
          if (inside(nx, ny, outer) && !inside(nx, ny, inner)) coverage++;
        }
      }
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      background.forEach((color, channel) => {
        pixels[offset + channel] = Math.round(color + ((255 - color) * coverage) / 16);
      });
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir('public/icons', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await writeFile(`public/icons/${name}`, png(size));
}
console.log('Generated Android, maskable, and Apple home-screen icons.');
