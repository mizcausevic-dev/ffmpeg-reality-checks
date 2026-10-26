// Usage: node episodes/ff48/fixture/run.mjs [outdir]   (default: ./out/ff48)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff48');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`clip: ${ev.frames} frames (${ev.distinctFrames} distinct), shot A frames 0..${ev.shotA - 1}, shot B frames ${ev.shotA}..${ev.frames - 1}`);
console.log(`mean luma: shot A ${ev.shotMean.a}, shot B ${ev.shotMean.b}; luma entropy: shot A up to ${ev.shotEntropy.aMax} bits, shot B ${ev.shotEntropy.bMin} to ${ev.shotEntropy.bMax}; highest entropy: frame ${ev.best} (${ev.bestEntropy})\n`);
for (const [k, c] of Object.entries(ev.cases)) {
  console.log(`${k.padEnd(8)} ${c.chain}`);
  console.log(`         by pts ${JSON.stringify(c.byPts)}  by md5 ${JSON.stringify(c.byMd5)}  by raw ${JSON.stringify(c.byRaw)}  model ${JSON.stringify(c.model)}`);
  if (c.entropy) console.log(`         entropy ${JSON.stringify(c.entropy)}  mean luma ${JSON.stringify(c.mean)}  rank of 100 ${JSON.stringify(c.rank)}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
