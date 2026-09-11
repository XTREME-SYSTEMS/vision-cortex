import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await build({
  entryPoints: [path.join(__dirname, 'src/runner.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/worker.js'),
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['nodemailer'],
  alias: {
    'base44:runtime': path.resolve(__dirname, '../base44/runtime/index.ts')
  },
  sourcemap: true,
});

console.log('Worker build succeeded -> dist/worker.js');
