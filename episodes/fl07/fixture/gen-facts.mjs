// Usage: node episodes/fl07/fixture/gen-facts.mjs   (reads evidence-6.1.1.json and evidence-8.1.2.json, rewrites the E block in fl07 and fs07 Scenes.tsx)
import fs from 'node:fs';
import path from 'node:path';
import {sceneFacts, factsBlock, blockRe} from './facts.mjs';
const ep = path.join(import.meta.dirname, '..', '..');
const read = (n) => JSON.parse(fs.readFileSync(path.join(ep, 'fl07', `evidence-${n}.json`), 'utf8'));
const block = factsBlock(sceneFacts(read('6.1.1'), read('8.1.2')));
for (const id of ['fl07', 'fs07']) {
  const f = path.join(ep, id, 'video', 'Scenes.tsx');
  if (!fs.existsSync(f)) { console.log('skip', id); continue; }
  const s = fs.readFileSync(f, 'utf8');
  if (!blockRe.test(s)) throw new Error(`${f} has no E:start / E:end block`);
  fs.writeFileSync(f, s.replace(blockRe, () => block));
  console.log('updated', f);
}
