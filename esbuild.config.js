const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['dist/client/client/main.js'],
  bundle: true,
  outfile: 'public/js/main.js',
  format: 'esm',
  minify: false,
  sourcemap: true,
}).catch(() => process.exit(1));
