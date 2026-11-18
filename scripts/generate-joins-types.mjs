import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const source = resolve(root, process.env.JOINS_OPENAPI_PATH || '../../Backend/code/src/joins/openapi.yaml');
const output = resolve(root, 'src/generated/joins-api.d.ts');
const generated = resolve(tmpdir(), `joins-api-${process.pid}.d.ts`);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

if (!existsSync(source)) {
  throw new Error(`Join contract not found: ${source}. Set JOINS_OPENAPI_PATH to the backend openapi.yaml path.`);
}

try {
  execFileSync(npx, ['openapi-typescript', source, '-o', generated], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const generatedText = readFileSync(generated, 'utf8');

  if (process.argv.includes('--check')) {
    const committedText = readFileSync(output, 'utf8');
    if (generatedText !== committedText) {
      throw new Error('Generated join types differ from src/generated/joins-api.d.ts. Run npm run generate:joins.');
    }
    console.log('Join contract types are up to date.');
  } else {
    writeFileSync(output, generatedText);
    console.log(`Generated ${output}`);
  }
} finally {
  rmSync(generated, { force: true });
}
