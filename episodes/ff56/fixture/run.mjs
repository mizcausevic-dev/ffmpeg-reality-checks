// Usage: node episodes/ff56/fixture/run.mjs [outdir]   (default: ./out/ff56)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff56');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const list = (s) => (s ? s.map((x) => x.codec).join(' ') : 'unreadable');
console.log(`source frames ${ev.baseFrames}`);
for (const [k, v] of Object.entries(ev.sources)) console.log(`  source ${k.padEnd(7)} streams: ${list(v)}`);
console.log('');
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} ${r.command}`);
  console.log(`               exit ${r.status}${r.ok ? ' (ok)' : ' (FAILED)'}  file: ${r.exists ? `${r.size} bytes, moov ${r.moov}` : 'none'}  ffprobe opens: ${r.probeOpens}  out streams: ${list(r.probeStreams)}   mp4 tracks: ${r.boxTracks.map((t) => `${t.handler}/${t.fourcc}`).join(' ') || 'none'}`);
  if (!r.ok) console.log(`               error: ${r.firstError}`);
  else console.log(`               video frames same as source: ${r.videoSame}${r.cueBytes ? `, cue text in bytes: ${r.cueBytes.join(' ')}` : ''}`);
}
console.log(`\nfixed subtitle decoded by ffmpeg:\n${(ev.fixedSrt ?? '').trim()}`);
const slim = JSON.parse(JSON.stringify(ev));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
