import { defineConfig } from 'tsup';
import * as fs from 'fs';
import * as path from 'path';

export default defineConfig({
  entry: {
    'bin/mcp': 'src/bin/mcp.ts',
    'bin/sse': 'src/bin/sse.ts',
    index: 'src/index.ts',
    server: 'src/server.ts',
    config: 'src/config.ts',
  },
  format: ['esm'],
  outExtension() {
    return {
      js: '.js',
    };
  },
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  splitting: false,
  treeshake: true,
  onSuccess: async () => {
    // Garante que dist/package.json tenha type: module para execução nativa ESM
    const distPkgPath = path.resolve('dist/package.json');
    fs.writeFileSync(distPkgPath, JSON.stringify({ type: 'module' }, null, 2));

    // Garante shebang no topo dos binários
    for (const binName of ['dist/bin/mcp.js', 'dist/bin/sse.js']) {
      const binPath = path.resolve(binName);
      if (fs.existsSync(binPath)) {
        let content = fs.readFileSync(binPath, 'utf8');
        if (!content.startsWith('#!/usr/bin/env node')) {
          content = '#!/usr/bin/env node\n' + content;
          fs.writeFileSync(binPath, content, 'utf8');
        }
      }
    }
  },
});
