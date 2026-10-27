// Usage: node episodes/ff93/fixture/run.mjs [outdir]   (default: ./out/ff93)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff93');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const f = (v) => (v === null || v === undefined ? 'N/A' : (Math.round(v * 1e4) / 1e4).toString());
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(11)} ${r.command}`);
  console.log(`            display order types ${r.types.slice(0, 13)}...  has_b_frames ${r.start.hasBFrames}  format start ${f(r.start.format)}  stream start ${f(r.start.stream)}`);
  console.log(`            packets ${r.pk.n}: first pts ${f(r.pk.firstPts)} first dts ${f(r.pk.firstDts)} (dts N/A on ${r.pk.dtsNA}), min dts ${f(r.pk.minDts)}, max (pts - dts) ${f(r.pk.maxLead)} s, dts == pts on ${r.pk.dtsEqualsPts}, dts > pts on ${r.pk.dtsAbovePts}, pts monotonic in file order: ${r.pk.ptsMonotonicInFileOrder}`);
  console.log(`            frames ${r.fr.n}: pkt_dts == pts on ${r.fr.pktDtsEqualsPts}, pkt_dts N/A on ${r.fr.pktDtsNA}, best_effort == pts on ${r.fr.bestEffortEqualsPts}, pkt_dts differs from the frame's own packet dts on ${r.fr.differsFromOwnPacket} of ${r.fr.matchedToPacket}`);
  console.log(`            showinfo ${r.si.n} frames, pts == decoder frame pts: ${r.si.ptsEqualsFrames}, prints a dts field: ${r.si.anyDts}`);
  console.log(`            bytes ${JSON.stringify(r.bytes_)}`);
  const first = r.packets.slice(0, 6).map((p) => `${f(p.ptsT)}/${f(p.dtsT)}`).join('  ');
  console.log(`            first six packets pts/dts: ${first}\n`);
}
console.log('ignore_editlist 1 on bf2.mp4:', JSON.stringify(ev.ignoreEditlist));
console.log('frameTable:', JSON.stringify(ev.frameTable));
console.log('decodeOrder:', JSON.stringify(ev.decodeOrder));
console.log('same decoded frames as the mp4:', JSON.stringify(ev.sameFramesAsMp4));
console.log('hex:', JSON.stringify(ev.hex));
const slim = JSON.parse(JSON.stringify(ev));
for (const r of Object.values(slim.runs)) { r.packets = r.packets.slice(0, 12); r.frames = r.frames.slice(0, 12); r.showinfo = r.showinfo.slice(0, 12); }
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
