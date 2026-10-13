import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { readFile } from 'node:fs/promises';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2022',
  external: ['obsidian', 'electron', ...builtinModules, ...builtinModules.map(x => `node:${x}`)],
  outfile: 'main.js',
  sourcemap: false,
  minify: false,
  banner: { js: `/*
${(await readFile(new URL('./LICENSE', import.meta.url), 'utf8')).trim()}

Source: https://github.com/Schnee013/obsidian-finder-pdf
*/` }
});
