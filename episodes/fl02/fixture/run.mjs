// Usage: node episodes/fl02/fixture/run.mjs [outdir]   (default: ./out/fl02; writes evidence.json there)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl02');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const e8 = ev.ff08;
console.log(`ff08  one file decodes ${e8.a.decodedSamples}, join ${e8.join.decodedSamples} (asked ${e8.accounting.validSamplesTotal}); extra ${e8.accounting.joinMinusValid} = 2 x (${e8.accounting.primingPerFile} + ${e8.accounting.paddingPerFile})`);
const b = ev.bridge;
console.log(`bridge  a.m4a edit list: ${b.single.editMs} ms from media time ${b.single.mediaTime}; decoded ${b.single.decodedHonoured}, with the edit list ignored ${b.single.decodedIgnored}; join edit list ${b.join.editMs} ms from ${b.join.mediaTime}`);
const m3 = ev.ff78.encodes;
console.log(`ff78  no tag: impulse ${m3.imp_cbr_raw.peak} (${m3.imp_cbr_raw.shift} late), ${m3.imp_cbr_raw.samples} samples; tag: ${m3.imp_cbr_tag.peak}, ${m3.imp_cbr_tag.samples}, delay ${m3.imp_cbr_tag.mp3.delay} padding ${m3.imp_cbr_tag.mp3.padding}; copy cut -ss 0.5 late ${ev.ff78.cuts.copyBefore5.late}; re-encode starts ${ev.ff78.cuts.reencode5.startsAt}`);
const o = ev.ff79;
console.log(`ff79  pre-skip ${o.encodes.ogg.head.preSkip}; click ${o.encodes.ogg.click}; patched 0 -> ${o.patched.ogg_0.click}, 1000 -> ${o.patched.ogg_1000.click}; re-encode starts ${o.cuts.reencode.startsAt}`);
const e6 = ev.ff46.runs;
console.log(`ff46  mp4 aPlus audio start ${e6['mp4.aPlus'].probe.audioStart}, ignore edit list ${e6['mp4.aPlus'].ignored.audioStart}; aMinus mp4 decodes ${e6['mp4.aMinus'].audio.samples}, mkv ${e6['mkv.aMinus'].audio.samples}`);
const r = ev.recipe;
for (const k of ['control', 'copy', 'notrim', 'recipe']) {
  const x = r[k];
  console.log(`recipe.${k.padEnd(7)} clicks ${JSON.stringify(x.clicks)} seam gap ${x.seamGap} samples ${x.samples}${x.editMs !== undefined ? ` | edit list ${x.editMs} ms media ${x.mediaTime}, ${x.sampleCount} packets, ffprobe ${x.ffprobePackets} packets ${x.ffprobeDuration} s` : ''}`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'md5' && Array.isArray(v) ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
