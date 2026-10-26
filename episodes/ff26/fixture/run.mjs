// Usage: node episodes/ff26/fixture/run.mjs [outdir]   (default: ./out/ff26)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff26');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nsource: ${ev.source.pix_fmt}, color_range ${ev.source.color_range}\n`);
for (const [k, r] of Object.entries(ev.cases)) {
  const p = r.patches;
  console.log(`${k.padEnd(14)} ${r.pix_fmt.padEnd(9)} tag=${r.color_range.padEnd(8)} black Y ${String(p.black.rawY).padStart(3)}  white Y ${String(p.white.rawY).padStart(3)}  shadow Y ${String(p.shadow.rawY).padStart(3)}  highlight Y ${String(p.highlight.rawY).padStart(3)}  | shown black ${p.black.shownByTag} white ${p.white.shownByTag} shadow ${p.shadow.shownByTag} highlight ${p.highlight.shownByTag}  | raw md5 ${r.rawMd5.slice(0, 8)}\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
