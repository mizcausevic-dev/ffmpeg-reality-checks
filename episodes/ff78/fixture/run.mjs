// Usage: node episodes/ff78/fixture/run.mjs [outdir]   (default: ./out/ff78)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff78');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.samples} samples at ${ev.source.rate} Hz, impulse at ${ev.source.impAt}, tone burst from ${ev.source.toneFrom} for ${ev.source.toneLen}, ${ev.source.gapImpulses} gap-coded impulses`);
console.log(`control (wav through pcm_s16le): impulse peak ${ev.control.imp.peak}, tone onset ${ev.control.tone.onset}, ${ev.control.imp.samples} samples\n`);
for (const [k, r] of Object.entries(ev.encodes)) {
  const m = r.mp3;
  console.log(`${k.padEnd(14)} ${r.command}`);
  console.log(`               ${r.bytes} bytes, ${m.walked} frames walked (${m.audioFrames} audio), tag ${m.tag}${m.tag ? ` frames ${m.tagFrames} delay ${m.delay} padding ${m.padding} (${m.delayHex}) encoder ${m.encoder}` : ''}`);
  console.log(`               decoded ${r.samples} samples (header predicts ${r.expectedLength}), ${r.sig === 'imp' ? `impulse at ${r.peak}` : `tone onset ${r.onset}`}, shift ${r.shift}, ffprobe start ${r.probe.startTime} duration ${r.probe.duration}`);
}
console.log('');
const g = ev.gapsFull;
console.log(`gaps.mp3 (cbr, tag): decoded ${g.samples} samples, first impulse ${g.first}, starts at source sample ${g.startsAt}, ${g.peaks} impulses found`);
for (const [k, r] of Object.entries(ev.cuts)) {
  console.log(`${k.padEnd(12)} ${r.command}`);
  console.log(`             frames ${r.mp3.audioFrames}, tag ${r.mp3.tag} delay ${r.mp3.delay} padding ${r.mp3.padding}, decoded ${r.samples} (header predicts ${r.expectedLength}), first impulse ${r.first}, decoded sample 0 = source sample ${r.startsAt}, wanted ${r.wanted}, late ${r.late}, ffprobe start ${r.probe.startTime}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
