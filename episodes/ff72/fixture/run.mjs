// Usage: node episodes/ff72/fixture/run.mjs [outdir]   (default: ./out/ff72)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, LEVELS, RAW_BYTES} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff72');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nraw pcm per signal: ${RAW_BYTES} bytes; header blocks ${JSON.stringify(ev.headerBlocks)}\n`);
for (const [name, s] of Object.entries(ev.signals)) {
  console.log(`${name}: source md5 ${s.sourceMd5}`);
  for (const l of LEVELS) {
    const r = s.levels[l];
    const same = r.md5Ffmpeg === s.sourceMd5 && r.md5Raw === s.sourceMd5 && r.info.md5 === s.sourceMd5;
    console.log(`  level ${String(l).padEnd(2)} bytes ${String(r.bytes).padEnd(7)} (probe ${r.probeBytes}) frames ${String(r.frames).padEnd(4)} (probe ${r.probePackets}) block ${r.blockSizes.join('/')} frame bytes min ${Math.min(...r.frameBytes)} max ${Math.max(...r.frameBytes)} streaminfo ${r.info.minFrame}..${r.info.maxFrame} md5 all equal source: ${same}`);
  }
}
console.log('\ncontrols:', JSON.stringify(ev.controls));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
