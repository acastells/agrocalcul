import { build } from 'esbuild';
import { readFile, readdir, mkdir, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Embed only the browser source directory; server modules never become assets. */
async function readAssets(directory, prefix = '') {
  const assets = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) Object.assign(assets, await readAssets(path, relative));
    else if (/\.(html|css|m?js|svg)$/.test(entry.name))
      assets[relative] = await readFile(path, 'utf8');
  }
  return assets;
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist/.openai', { recursive: true });
const assets = await readAssets('web');
await build({
  entryPoints: ['server/worker.mjs'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  plugins: [
    {
      name: 'browser-assets',
      setup(builder) {
        builder.onResolve({ filter: /^agro:assets$/ }, () => ({
          path: 'assets',
          namespace: 'agro',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'agro' }, () => ({
          contents: `export default ${JSON.stringify(assets)};`,
          loader: 'js',
        }));
      },
    },
  ],
});
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
console.log('Worker, browser assets and immutable migrations built.');
