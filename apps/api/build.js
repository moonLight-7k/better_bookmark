const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./src/server.ts'],
  outfile: './dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external: [
    'onnxruntime-node',
    'sharp',
    'cohere-ai', 'ollama'
  ]
}).catch(() => process.exit(1));
