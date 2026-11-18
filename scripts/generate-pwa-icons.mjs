import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Regenerate after replacing the shared website logo. Requires Playwright Chromium.
const logo = await readFile('public/images/brand/logo.png');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await mkdir('public/icons', { recursive: true });
  for (const [name, size, scale] of [
    ['icon-192.png', 192, 0.94],
    ['icon-512.png', 512, 0.94],
    ['icon-maskable-512.png', 512, 0.56],
    ['apple-touch-icon.png', 180, 0.94],
    ['favicon-32.png', 32, 0.94],
    ['favicon-48.png', 48, 0.94],
  ]) {
    const data = await page.evaluate(
      async ({ source, size, scale, rounded }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        if (rounded) {
          context.beginPath();
          context.roundRect(0, 0, size, size, size * 0.24);
          context.clip();
        }
        context.fillStyle = '#0a0a0a';
        context.fillRect(0, 0, size, size);
        context.imageSmoothingQuality = 'high';
        const ratio = (size * scale) / Math.max(image.naturalWidth, image.naturalHeight);
        const width = image.naturalWidth * ratio;
        const height = image.naturalHeight * ratio;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        return canvas.toDataURL('image/png').split(',')[1];
      },
      {
        source: `data:image/png;base64,${logo.toString('base64')}`,
        size,
        scale,
        // Apple and Android maskable icons receive their final shape from the OS.
        rounded: !['icon-maskable-512.png', 'apple-touch-icon.png'].includes(name),
      },
    );
    await writeFile(`public/icons/${name}`, Buffer.from(data, 'base64'));
  }
} finally {
  await browser.close();
}
console.log('Generated app, Apple, and browser icons from the FORMA logo.');
