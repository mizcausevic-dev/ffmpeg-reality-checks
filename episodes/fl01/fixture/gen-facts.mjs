// Usage: node episodes/fl01/fixture/gen-facts.mjs   (re-runs the fixture, then rewrites the E block in fl01 and fs01 Scenes.tsx)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runAll} from './experiment.mjs';
import {sceneFacts, factsBlock, blockRe} from './facts.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-facts-'));
try {
  const block = factsBlock(sceneFacts(runAll(dir)));
  for (const id of ['fl01', 'fs01']) {
    const f = path.join(import.meta.dirname, '..', '..', id, 'video', 'Scenes.tsx');
    if (!fs.existsSync(f)) { console.log('skip', id); continue; }
    const s = fs.readFileSync(f, 'utf8');
    if (!blockRe.test(s)) throw new Error(`${f} has no E:start / E:end block`);
    fs.writeFileSync(f, s.replace(blockRe, () => block));
    console.log('updated', f);
  }
} finally { fs.rmSync(dir, {recursive: true, force: true}); }
