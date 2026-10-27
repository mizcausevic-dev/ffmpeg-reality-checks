// Usage: node episodes/ff79/fixture/run.mjs [outdir]   (default: ./out/ff79)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff79');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.samples} samples at ${ev.source.rate} Hz, click at ${ev.source.clickAt}, ${ev.source.gapClicks} gap-coded clicks`);
console.log(`control (wav through pcm_s16le): click ${ev.control.click}, ${ev.control.samples} samples\n`);
for (const [k, r] of Object.entries(ev.encodes)) {
  console.log(`${k.padEnd(5)} ${r.command}`);
  console.log(`      ${r.bytes} bytes, OpusHead pre-skip ${r.head.preSkip} (${r.head.preSkipHex}, ${(r.head.preSkip / 48).toFixed(2)} ms)${r.head.codecDelayNs ? `, CodecDelay ${r.head.codecDelayNs} ns, SeekPreRoll ${r.head.seekPreRollNs} ns` : ''}`);
  console.log(`      decoded ${r.samples} samples, click at ${r.click} (shift ${r.shift}), ffprobe stream start ${r.probe.streamStart}, format start ${r.probe.formatStart}, initial_padding ${r.probe.initialPadding}, duration ${r.probe.duration}`);
}
console.log('');
for (const [k, r] of Object.entries(ev.patched)) console.log(`patched ${k.padEnd(9)} pre-skip ${String(r.head.preSkip).padStart(4)}: decoded ${r.samples} samples, click at ${r.click} (shift ${r.shift})`);
console.log('');
for (const [k, r] of Object.entries(ev.cuts)) {
  console.log(`${k.padEnd(11)} ${r.command}`);
  console.log(`            pre-skip ${r.head.preSkip}, decoded ${r.samples}, first click ${r.first}, decoded sample 0 = source sample ${r.startsAt}, wanted ${r.wanted}, offset ${r.offset}, tail ${r.tail}, ffprobe stream start ${r.probe.streamStart}, duration ${r.probe.duration}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
