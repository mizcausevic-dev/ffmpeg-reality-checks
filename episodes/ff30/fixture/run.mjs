// Usage: node episodes/ff30/fixture/run.mjs [outdir]   (default: ./out/ff30)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff30');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nsource: ${ev.source.size}, ${ev.source.frames} frames, ${ev.source.seconds} s, lossless FFV1\n`);
for (const [k, r] of Object.entries(ev.cases)) {
  console.log(`${k.padEnd(12)} crf ${r.crf}  b:v ${r.bFlag.padEnd(5)}  ${r.kbpsProbe.toFixed(0).padStart(5)} kbps (ffprobe) ${r.kbpsIvf.toFixed(0).padStart(5)} kbps (ivf)  PSNR ${r.ffmpegPsnrAvg.toFixed(2)} (ffmpeg) ${r.nodePsnrAvg.toFixed(2)} (node)  SSIM ${r.ffmpegSsimAll.toFixed(3)}  pkt md5 ${r.packetMd5Ffmpeg.slice(0, 8)}\n   ${r.command}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
