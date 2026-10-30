import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// An optional external install keeps restricted workspaces free of dependencies.
// A normal `npm ci` needs no flag and uses this project's own install.
const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const command = args[0] || 'dev';
const toolIndex = args.indexOf('--tools');
const toolRoot = toolIndex < 0 ? root : resolve(args[toolIndex + 1]);
const requireTool = createRequire(join(toolRoot, 'package.json'));

async function sourceDocument() {
  const snapshot = JSON.parse(await readFile(join(root, 'src/tweets.json'), 'utf8'));
  return JSON.stringify({
    capturedAt: snapshot.capturedAt,
    scope: 'A selected collection, not a complete census of X. Counts are archive observations and may lag X.',
    ranking: 'Likes descending by default, unknown values last, then tweet date descending.',
    sources: snapshot.tweets
  }, null, 2) + '\n';
}

if (command === 'typecheck') {
  const directory = await mkdtemp(join(tmpdir(), 'signal-pond-ts-'));
  const config = join(directory, 'tsconfig.json');
  const externalPaths = toolRoot === root ? {} : {
    typeRoots: [join(toolRoot, 'node_modules/@types')],
    paths: {
      'react': [join(toolRoot, 'node_modules/@types/react/index.d.ts')],
      'react/*': [join(toolRoot, 'node_modules/@types/react/*')],
      'react-dom/*': [join(toolRoot, 'node_modules/@types/react-dom/*')]
    }
  };
  await writeFile(config, JSON.stringify({ extends: join(root, 'tsconfig.json'), compilerOptions: externalPaths }));
  const result = spawnSync(process.execPath, [requireTool.resolve('typescript/bin/tsc'), '--project', config, '--noEmit'], { stdio: 'inherit', cwd: root });
  await rm(directory, { recursive: true, force: true });
  process.exitCode = result.status ?? 1;
} else {
  const vite = await import(pathToFileURL(requireTool.resolve('vite')).href);
  const config = {
    root,
    configFile: false,
    base: './',
    esbuild: { jsx: 'automatic' },
    plugins: [{
      name: 'snapshot-source',
      configureServer(server) {
        server.middlewares.use('/sources.json', async (_request, response) => {
          try { response.setHeader('Content-Type', 'application/json'); response.end(await sourceDocument()); }
          catch { response.statusCode = 500; response.end('The local source snapshot is unavailable.'); }
        });
      }
    }],
    resolve: {
      alias: [
        { find: /^react-dom(\/.*)?$/, replacement: join(toolRoot, 'node_modules/react-dom') + '$1' },
        { find: /^react(\/.*)?$/, replacement: join(toolRoot, 'node_modules/react') + '$1' }
      ]
    },
    build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
    server: { host: '127.0.0.1', port: 5173 },
    preview: { host: '127.0.0.1', port: 4173 }
  };
  if (command === 'build') {
    await vite.build(config);
    await writeFile(join(root, 'dist/sources.json'), await sourceDocument());
  }
  else if (command === 'dev') {
    const server = await vite.createServer(config);
    await server.listen();
    server.printUrls();
  } else if (command === 'preview') {
    const server = await vite.preview(config);
    server.printUrls();
  } else throw new Error(`Unknown site command: ${command}`);
}
