// Usage: node episodes/fl08/fixture/gen-facts.mjs   (rewrites the E block in fl08 and fs08 Scenes.tsx from evidence.json + evidence-v8.json)
import fs from 'node:fs';
import path from 'node:path';
import {sceneFacts, factsBlock, blockRe} from './facts.mjs';
const here = path.join(import.meta.dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const block = factsBlock(sceneFacts(read('evidence.json'), read('evidence-v8.json')));
for (const id of ['fl08', 'fs08']) {
  const f = path.join(here, '..', id, 'video', 'Scenes.tsx');
  if (!fs.existsSync(f)) { console.log('skip', id); continue; }
  const s = fs.readFileSync(f, 'utf8');
  if (!blockRe.test(s)) throw new Error(`${f} has no E:start / E:end block`);
  fs.writeFileSync(f, s.replace(blockRe, () => block));
  console.log('updated', f);
}
