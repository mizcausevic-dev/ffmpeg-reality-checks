// Usage: node episodes/ff52/fixture/run.mjs [outdir]   (default: ./out/ff52)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff52');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const show = (k, r) => {
  console.log(`${k.padEnd(8)} ${r.command}`);
  console.log(`         exit ${r.status}, ${r.bytes} bytes, valid gif ${r.gif.valid}, ${r.gif.frames} frames, delays ${[...new Set(r.gif.delays)].join('/')} cs, NETSCAPE blocks ${r.gif.netscapeBlocks}, loop count in the bytes: ${r.gif.loop === null ? 'none' : r.gif.loop}`);
  console.log(`         ffmpeg demuxer replay (20 s): ${r.replay.frames} frames = ${r.replay.passes === 'capped' ? 'still playing at the 20 s limit' : r.replay.passes + ' passes'}${r.probe ? `; ffprobe ${r.probe.frames} frames, ${r.probe.duration} s` : ''}`);
};
for (const [k, r] of Object.entries(ev.runs)) show(k, r);
console.log(`\nbyte differences: -loop 0 vs 3 at offsets [${ev.diffs.p0_vs_p3}], 0 vs 65535 at [${ev.diffs.p0_vs_p65535}], default vs 0 at [${ev.diffs.default_vs_p0}]; -loop 0 file is ${ev.diffs.sizeGap} bytes bigger than -loop -1\n`);
for (const [k, r] of Object.entries(ev.input)) show(k, r);
console.log('\nknown positive, a gif built in Node:');
for (const [k, r] of Object.entries(ev.hand)) console.log(`   loop ${k.padEnd(4)} bytes say ${r.gif.loop === null ? 'none' : r.gif.loop}, ${r.gif.frames} frames; ffmpeg replay: ${r.replayPerPass.frames} frames = ${r.replayPerPass.passes === 'capped' ? 'still playing at the limit' : r.replayPerPass.passes + ' passes'}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, (k, v) => (k === 'hashes' ? undefined : v), 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
