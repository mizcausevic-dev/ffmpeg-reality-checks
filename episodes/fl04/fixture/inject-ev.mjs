// Usage: node episodes/fl04/fixture/inject-ev.mjs [evidence.json]   (default: ./out/fl04/evidence.json)
// Writes sceneNumbers(evidence) between the EV markers of fl04/video/Scenes.tsx and fs04/video/Scenes.tsx.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sceneNumbers} from './experiment.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const EV_RE = /\/\*EV:start\*\/\nconst EV: any = (.*);\n\/\*EV:end\*\//s;
export const evBlock = (ev) => `/*EV:start*/\nconst EV: any = ${JSON.stringify(sceneNumbers(ev))};\n/*EV:end*/`;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ev = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] ?? 'out/fl04/evidence.json'), 'utf8'));
  for (const id of ['fl04', 'fs04']) {
    const f = path.join(here, '..', '..', id, 'video', 'Scenes.tsx');
    const s = fs.readFileSync(f, 'utf8');
    if (!EV_RE.test(s)) throw new Error(`no EV markers in ${f}`);
    fs.writeFileSync(f, s.replace(EV_RE, () => evBlock(ev)));
    console.log('updated', f);
  }
}
