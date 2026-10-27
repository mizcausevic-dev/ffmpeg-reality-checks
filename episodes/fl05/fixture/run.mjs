// Usage: node episodes/fl05/fixture/run.mjs [outdir]   (default: ./out/fl05)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl05');
const ev = await runExperiment(dir);
console.log(`${ev.ffmpeg}   [build: ${ev.build}]\n`);
const s = ev.sources;
console.log('ff02  RGB input, no -pix_fmt:', s.ff02.variants.default_rgb_input.profile, s.ff02.variants.default_rgb_input.pixFmt, '| with -pix_fmt yuv420p:', s.ff02.variants.pix_fmt_yuv420p.profile, s.ff02.variants.pix_fmt_yuv420p.pixFmt, '| PSNR', s.ff02.variants.default_rgb_input.psnrVsOriginal, 'vs', s.ff02.variants.pix_fmt_yuv420p.psnrVsOriginal);
for (const [k, c] of Object.entries(s.ff09.cases)) console.log(`ff09  ${k.padEnd(11)} ${c.command.split('-vf ')[1].padEnd(46)} -> ${c.scaleTo} exit ${c.exit} wrote ${c.disk.exists && c.disk.video ? 'yes' : 'no'}`);
for (const [k, f] of Object.entries(s.ff03.files)) console.log(`ff03  ${k.padEnd(10)} ${f.order.join(', ')}  moov at ${f.moovOffset} of ${f.bytes}`);
for (const [k, h] of Object.entries(s.ff03.http)) for (const [m, r] of Object.entries(h)) console.log(`ff03  ${k.padEnd(10)} ${m.padEnd(9)} ${r.bytesServed} of ${r.fileBytes} bytes, ${r.requests} request(s)`);
for (const k of ['def', 'copy', 'remux', 'hvc', 'rep', 'repvc', 'mkv']) { const f = s.ff31.files[k]; console.log(`ff31  ${k.padEnd(6)} ${f.command.padEnd(52)} tag ${f.probe.tagString} stsd ${f.box?.fourcc ?? '-'} frames ${f.decoded.frames}`); }
console.log(`ff31  diffs def:remux ${s.ff31.diffs['def:remux'].count} bytes, copy:remux ${s.ff31.diffs['copy:remux'].count}`);
console.log('\ncomposite: fresh RGB PNG fixture', ev.composite.fixture.pngSize, ev.composite.fixture.pngPixFmt, ev.composite.fixture.frames, 'frames');
for (const [k, c] of Object.entries(ev.composite.cases)) {
  console.log(`${k.padEnd(12)} exit ${String(c.exit).padEnd(3)} ${c.wrote ? `${c.probe.profile} ${c.probe.pixFmt} ${c.probe.width}x${c.probe.height} tag ${c.probe.tag} order ${c.order.join(',')} frames ${c.decoded.frames}` : `nothing written; ${c.refusal}`}`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
