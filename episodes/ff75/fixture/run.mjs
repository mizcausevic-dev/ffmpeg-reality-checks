// Usage: node episodes/ff75/fixture/run.mjs [outdir]   (default: ./out/ff75)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, modelAdded} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff75');
fs.rmSync(dir, {recursive: true, force: true});
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames, ${ev.source.distinct} distinct, flat ${ev.source.allFlat}, luma 60 + 3n: ${ev.source.rule}`);
for (const c of Object.values(ev.controls)) console.log(`control ${c.name.padEnd(8)} ${c.frames} frames, added ${c.addedCount} of ${JSON.stringify(c.addedKinds)}, reader 1 ${c.reader1}, reader 2 ${c.reader2}`);
console.log('\ncase           tpad options                              frames  head        tail        reader agreement');
for (const v of Object.values(ev.video)) {
  const f = (n, k, vals) => (n ? `${n} ${k}${vals ? ` ${vals.y}/${vals.u}/${vals.v}` : ''}` : '0');
  console.log(`${v.id.padEnd(13)}  ${v.vf.padEnd(42)}${String(v.frames).padStart(5)}   ${f(v.addedBefore, v.headKind, v.headValues).padEnd(18)}  ${f(v.addedAfter, v.tailKind, v.tailValues).padEnd(18)}  ${v.agree}`);
}
console.log('\nstop_duration, nearest whole frame (model floor(s * fps + 0.5)):');
for (const f of ev.fps) console.log(`  ${f.fps} fps: 1 s adds ${f.add1} (model ${modelAdded(1, f.fps)}), 0.5 s adds ${f.add05} (model ${modelAdded(0.5, f.fps)})`);
console.log('\nblack by pixel format (added frame, last real frame):');
for (const [k, v] of Object.entries(ev.formats)) console.log(`  ${k.padEnd(9)} added ${JSON.stringify(v.added)} signalstats YMIN ${JSON.stringify(v.statsYminAdded)}; last real ${JSON.stringify(v.lastReal)}`);
console.log(`\nstop=-1 clone: guarded ${ev.infinite.guarded.frames} frames, tail all the last card ${ev.infinite.guarded.tailAllLast}; unguarded killed ${ev.infinite.unguarded.killed} at frame ${ev.infinite.unguarded.lastFrame}`);
console.log('\naudio (16000 samples at 16384, 8000 Hz):');
for (const [k, a] of Object.entries(ev.audio)) console.log(`  ${k.padEnd(10)} ${a.samples} samples, added ${a.addedSamples}, all zero ${a.addedAllZero}, silencedetect start ${a.silenceStart}`);
console.log('\nmuxed (video 50 frames + 25 padded, audio 2 s):');
for (const [k, m] of Object.entries(ev.mux)) console.log(`  ${k.padEnd(17)} format ${m.formatDuration} s, video ${m.videoFrames} frames, audio ${m.audioSamples} samples (${m.audioSeconds} s)`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
