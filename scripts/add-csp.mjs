import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { environment } from '../src/environments/environment.production.ts';
const root = 'dist/coaching-platform/browser';
async function processDirectory(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) {
      await processDirectory(path);
      continue;
    }
    if (!item.name.endsWith('.html')) continue;
    let html = await readFile(path, 'utf8');
    const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter((match) => !/\bsrc\s*=/i.test(match[1]) && match[2].trim())
      .map((match) => "'sha256-" + createHash('sha256').update(match[2]).digest('base64') + "'");
    const policy = [
      "default-src 'self'",
      `script-src 'self' ${hashes.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      `connect-src 'self' ${new URL(environment.apiBaseUrl).origin}`,
      "img-src 'self' blob: data: https://res.cloudinary.com",
      'frame-src https://www.youtube-nocookie.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    html = html.replace(
      '<head>',
      `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`,
    );
    await writeFile(path, html);
  }
}
await processDirectory(root);
console.log('Added Content Security Policy hashes to generated static pages.');
