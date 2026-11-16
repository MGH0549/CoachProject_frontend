// CSP changes HTML after Angular's build. Regenerate hashes from the final files
// so the service worker can validate and cache the actual deployed app shell.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Generator } from '@angular/service-worker/config';

const root = 'dist/coaching-platform/browser';
const filesystem = {
  async list(directory) {
    const entries = await readdir(join(root, directory), { withFileTypes: true });
    const files = await Promise.all(
      entries.map((entry) => {
        const path = `${directory.replace(/\/$/, '')}/${entry.name}`;
        return entry.isDirectory() ? filesystem.list(path) : [path];
      }),
    );
    return files.flat();
  },
  read: (file) => readFile(join(root, file), 'utf8'),
  async hash(file) {
    return createHash('sha1')
      .update(await readFile(join(root, file)))
      .digest('hex');
  },
  write: (file, contents) => writeFile(join(root, file), contents),
};
const config = JSON.parse(await readFile('ngsw-config.json', 'utf8'));
const manifest = await new Generator(filesystem, '/').process(config);
await writeFile(join(root, 'ngsw.json'), JSON.stringify(manifest, null, 2));
console.log('Generated service worker hashes after CSP processing.');
