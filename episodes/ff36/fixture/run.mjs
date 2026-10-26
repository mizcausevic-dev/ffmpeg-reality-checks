// Usage: node episodes/ff36/fixture/run.mjs [outdir]   (default: ./out/ff36)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff36');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\n${ev.x264}\nsource: ${ev.source.size}, ${ev.source.frames} frames, ${ev.source.seconds} s, lossless FFV1; cap under test ${ev.maxrateKbps} kbps\n`);
for (const [k, r] of Object.entries(ev.cases)) {
  console.log(`${k.padEnd(14)} avg ${r.kbpsProbe.toFixed(0).padStart(5)}/${r.kbpsAnnexB.toFixed(0).padStart(5)} kbps  worst 1 s ${r.worstProbe.toFixed(0).padStart(5)}/${r.worstAnnexB.toFixed(0).padStart(5)} kbps  PSNR ${r.psnrFfmpeg.toFixed(2)}/${r.psnrNode.toFixed(2)} dB  pkt md5 ${r.packetMd5Ffmpeg.slice(0, 8)}  vbv ${r.vbvInStream}/${r.bufInStream} rc ${r.rcInStream}\n               ${r.command}${r.warning ? `\n               warning: ${r.warning}` : ''}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
