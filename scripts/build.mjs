import { build } from 'esbuild';
await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'esm',jsxFactory:'ie.createElement',jsxFragment:'ie.Fragment',legalComments:'external',outfile:'assets/assets/article-migrate.js'});
await build({entryPoints:['src/workspace.css'],bundle:true,minify:true,outfile:'assets/assets/article-migrate.css'});
