// Usage: node episodes/fl06/fixture/gen-scene-data.mjs
// Rewrites the DATA block in the fl06 and fs06 Scenes.tsx from the two saved evidence files.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sceneData, dataBlock, dataRe} from './scene-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const block = dataBlock(sceneData());
for (const f of [path.join(here, '..', 'video', 'Scenes.tsx'), path.join(here, '..', '..', 'fs06', 'video', 'Scenes.tsx')]) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  if (!dataRe.test(src)) throw new Error(`${f} has no DATA block`);
  fs.writeFileSync(f, src.replace(dataRe, () => block));
  console.log('updated', f);
}
