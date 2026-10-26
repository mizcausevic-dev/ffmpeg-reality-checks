// Usage: node episodes/ff53/fixture/run.mjs [outdir]   (default: ./out/ff53)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, slim} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff53');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames, ${ev.source.width}x${ev.source.height}, ffv1 ${ev.source.bytes} bytes\n`);
const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : String(v)), f4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : String(v));
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(14)} ${r.label.padEnd(18)} ${String(r.bytes).padStart(8)} bytes (ffprobe ${r.probeBytes})  ${r.frames} frames ${r.pixFmt}`);
  console.log(`               PSNR Y  ffmpeg ${f2(r.ffmpeg.psnrY)}  node ${f2(r.node.psnrY)} dB    SSIM Y  ffmpeg ${f4(r.ffmpeg.ssimY)}  node ${f4(r.node.ssimY)}    (ffmpeg average PSNR ${f2(r.ffmpeg.psnrAvg)}, SSIM All ${f4(r.ffmpeg.ssimAll)})`);
}
console.log('\nx265 against x264 at the same -crf (bytes ratio, PSNR Y difference by ffmpeg / node, SSIM Y difference by ffmpeg):');
for (const crf of [18, 23, 28]) { const a = ev.runs[`x264_${crf}`], b = ev.runs[`x265_${crf}`]; console.log(`  crf ${crf}: bytes ${(b.bytes / a.bytes).toFixed(3)}x (${(100 * (b.bytes / a.bytes - 1)).toFixed(1)}%), PSNR Y ${(b.ffmpeg.psnrY - a.ffmpeg.psnrY).toFixed(2)} / ${(b.node.psnrY - a.node.psnrY).toFixed(2)} dB, SSIM Y ${(b.ffmpeg.ssimY - a.ffmpeg.ssimY).toFixed(4)}`); }
{ const a = ev.runs.x264_default, b = ev.runs.x265_default; console.log(`  defaults: bytes ${(b.bytes / a.bytes).toFixed(3)}x (${(100 * (b.bytes / a.bytes - 1)).toFixed(1)}%), PSNR Y ${(b.ffmpeg.psnrY - a.ffmpeg.psnrY).toFixed(2)} / ${(b.node.psnrY - a.node.psnrY).toFixed(2)} dB, SSIM Y ${(b.ffmpeg.ssimY - a.ffmpeg.ssimY).toFixed(4)}`); }
console.log(`\ndefault file equals explicit crf file: x264 default == crf 23: ${ev.runs.x264_default.md5 === ev.runs.x264_23.md5}, x265 default == crf 28: ${ev.runs.x265_default.md5 === ev.runs.x265_28.md5}`);
console.log(`second encode at crf 23 is the same file: x264 ${ev.repeat.x264 === ev.runs.x264_23.md5}, x265 ${ev.repeat.x265 === ev.runs.x265_23.md5}`);
const out = JSON.parse(JSON.stringify({...ev, runs: Object.fromEntries(Object.entries(ev.runs).map(([k, r]) => [k, slim(r)]))}, (k, v) => (k === 'hashes' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(out, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
