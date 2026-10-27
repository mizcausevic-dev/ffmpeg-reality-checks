// Usage: node episodes/fl08/fixture/run.mjs [outdir]   (default: <os tmpdir>/fl08-out; evidence.json is written next to this file's episode: episodes/fl08/evidence.json)
// Runs the colordetect investigation live on whatever ffmpeg is on PATH (6.1.1: the filter is missing, the pixel readers still run; 8.x: colordetect is read too).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), 'fl08-out'));
const t0 = Date.now();
const ev = runExperiment(dir);
const R = ev.range.cases, A = ev.alpha.cases;
console.log(`${ev.ffmpeg}   (${ev.build})   libavfilter ${ev.libs.libavfilter ?? '?'}\n`);
console.log(`colordetect filter: ${ev.colordetect.exists ? 'present' : 'MISSING'}  (exit ${ev.colordetect.probe.status}, "No such filter" ${ev.colordetect.probe.noSuchFilter})`);
console.log('\nRange (3 frames of 256x16). tag = ffprobe color_range; Y = raw min..max; stats = signalstats; rgb = G after -pix_fmt rgb24; recipe = pixel proof; colordetect = 8.x only');
for (const [k, c] of Object.entries(R)) {
  const cd = c.colordetect ? `colordetect "${c.colordetect.all.rangeText}"` : 'colordetect n/a';
  const same = c.content && R[`${c.content}_none`] ? (c.raw.sha === R[`${c.content}_none`].raw.sha ? 'same bytes as untagged' : 'BYTES CHANGED') : '';
  console.log(`  ${k.padEnd(14)} tag ${String(c.probeRange).padEnd(7)} Y ${c.raw.ymin}..${c.raw.ymax}  stats ${c.signalstats.ymin}..${c.signalstats.ymax}  rgb ${c.rgb.min}..${c.rgb.max} (${c.rgb.distinct} levels)  recipe ${c.recipe.verdict.padEnd(12)} ${same.padEnd(22)} ${cd}`);
}
console.log('\nAlpha (64x16 rgba, 3 frames). raw = min alpha, channel above alpha count, pixel verdict; alphaextract+signalstats = alpha min..max');
for (const [k, c] of Object.entries(A)) {
  const cd = c.colordetect ? `colordetect "${c.colordetect.rgba.alphaText}"` : 'colordetect n/a';
  console.log(`  ${k.padEnd(18)} first ${c.first.join(',').padEnd(15)} alpha ${c.raw.minA}..${c.raw.maxA}  over-alpha ${String(c.raw.straightEvidence).padStart(4)}  pixels say ${c.raw.verdict.padEnd(12)} stats ${c.alphaSignalstats.ymin}..${c.alphaSignalstats.ymax}  ${cd}`);
}
const T = ev.alpha.fileTags;
console.log(`\nFile tags for a straight and a premultiplied-consistent alpha file: pix_fmt ${T.pix_fmt.join(' / ')}, alpha keys ${JSON.stringify(T.alphaKeys)}, identical stream metadata ${T.identicalStreamMetadata}`);
const O = ev.alpha.overlay;
console.log(`Overlay of ${O.layer} over ${O.background}: straight ${O.straight}, premultiplied ${O.premultiplied} (red differs by ${O.redDifference})`);
console.log(`Deterministic encodes: ${ev.deterministic}`);
if (ev.colordetect.exists) {
  console.log('\ncolordetect help:\n  ' + ev.colordetect.help.join('\n  '));
  console.log('Traces left on frames (recorded, not asserted):\n' + JSON.stringify(ev.colordetect.props, null, 2));
}
const out = path.join(import.meta.dirname, '..', ev.build === 'v6' ? 'evidence.json' : `evidence-${ev.build}.json`);
fs.writeFileSync(out, JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${out}   (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
