// Usage: node episodes/fl03/fixture/run.mjs [outdir]   (default: ./out/fl03)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl03');
const ev = runExperiment(dir);
console.log(`${ev.ffmpeg} [${ev.build}]\n`);
console.log('ff17 matrix: green read as bt709 after the default command ->', JSON.stringify(ev.ff17.encodes.default.read.bt709.patches.green), 'worst error', ev.ff17.encodes.default.read.bt709.worstError);
console.log('ff76 gray: red/green/blue/yellow stored by format=gray ->', ['red', 'green', 'blue', 'yellow'].map((n) => ev.ff76.patches.rgb.gray.native[n][0]).join(','));
console.log('ff26 range: default black/white raw Y ->', ev.ff26.cases.default.patches.black.rawY, ev.ff26.cases.default.patches.white.rawY, '; -color_range pc tag', ev.ff26.cases.pc_tag.color_range, 'shown black', ev.ff26.cases.pc_tag.patches.black.shownByTag);
console.log('ff44 HDR: 100 nit white lands at Y', ev.ff44.hdr.pix.y[4], '(expected', ev.ff44.expected[4] + ')');
console.log('ff22 chroma: vertical red line after yuv420p ->', JSON.stringify(ev.ff22.runs.vline_yuv420p.rgb[0]));
console.log('ff85 dither: format=yuv420p distinct', ev.ff85.modes.default.distinct, '; sws_dither=none distinct', ev.ff85.modes.none.distinct);
console.log('\nrecipe:', ev.recipe.command);
for (const [k, e] of Object.entries(ev.recipe.encodes)) {
  console.log(`${k.padEnd(8)} label: ${e.tag.pixFmt} matrix ${e.tag.colorSpace ?? 'none'} range ${e.tag.range ?? 'none'} | raw Y black ${e.rawY.black} white ${e.rawY.white} | signalstats black ${e.stats.black.min} white ${e.stats.white.max} | worst error auto ${e.read.auto.worstError} bt601 ${e.read.bt601.worstError} bt709 ${e.read.bt709.worstError}`);
}
console.log('\nlabel only (pixels untouched):', JSON.stringify(ev.labelOnly));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
