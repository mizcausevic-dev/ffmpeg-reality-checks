// Usage: node episodes/ff49/fixture/run.mjs [outdir]   (default: ./out/ff49)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, SIGNALS, QS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff49');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`${ev.seconds} s of stereo audio at ${ev.sampleRate} Hz, libmp3lame. Average kbit/s read by Node (frame headers) / ffprobe packets / ffprobe format bit_rate\n`);
console.log('quality    ' + QS.map((q) => String(q).padStart(7)).join(''));
for (const s of SIGNALS) console.log(s.padEnd(10) + ' ' + QS.map((q) => String(ev.vbr[s][q].nodeKbps.toFixed(1)).padStart(7)).join(''));
console.log('\nsame table, ffprobe packets');
for (const s of SIGNALS) console.log(s.padEnd(10) + ' ' + QS.map((q) => String(ev.vbr[s][q].probePacketKbps.toFixed(1)).padStart(7)).join(''));
console.log('\nsame table, ffprobe format bit_rate');
for (const s of SIGNALS) console.log(s.padEnd(10) + ' ' + QS.map((q) => String(ev.vbr[s][q].probeFormatKbps.toFixed(1)).padStart(7)).join(''));
console.log('\nframe bitrate range inside each file at quality 2 (min to max kbit/s), distinct values, tag');
for (const s of SIGNALS) { const v = ev.vbr[s][2]; console.log(`${s.padEnd(10)} ${v.min} to ${v.max}  (${v.distinct.length} distinct)  frames ${v.nodeFrames} (ffprobe packets ${v.probePackets})  tag ${v.tag}`); }
console.log('\ncontrol: -b:a 128k');
for (const s of SIGNALS) { const v = ev.cbr[s]; console.log(`${s.padEnd(10)} node ${v.nodeKbps}  probe packets ${v.probePacketKbps}  format ${v.probeFormatKbps}  distinct ${JSON.stringify(v.distinct)}  tag ${v.tag}`); }
console.log(`noise -b:a 320k: node ${ev.cbr320.nodeKbps}, distinct ${JSON.stringify(ev.cbr320.distinct)}`);
console.log('\n5 s silence then 5 s noise');
for (const [q, v] of Object.entries(ev.mixed)) console.log(`quality ${q}: whole file ${v.nodeKbps}, first half ${v.firstHalfKbps}, second half ${v.secondHalfKbps}, frame range ${v.min} to ${v.max}, frames within 25 kbit/s of the average ${v.nearAverage} of ${v.nodeFrames}`);
const slim = JSON.parse(JSON.stringify(ev));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
