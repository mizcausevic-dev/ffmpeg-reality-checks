// Usage: node episodes/ff44/fixture/run.mjs [outdir]   (default: ./out/ff44)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, NITS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff44');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `\nzscale ${ev.zscale}  tonemap ${ev.tonemap}  colorspace ${ev.colorspace}\n`);
console.log('nits          ' + NITS.map((n) => String(n).padStart(6)).join(''));
console.log('PQ 10-bit     ' + ev.pqCodes10.map((n) => String(n).padStart(6)).join(''));
console.log('expected 8bit ' + ev.expected.map((n) => String(n).padStart(6)).join(''));
console.log('source tags   hdr ' + JSON.stringify(ev.srcTags.hdr) + '\n              sdr ' + JSON.stringify(ev.srcTags.sdr) + '\n');
const show = (kind, name, r) => {
  console.log(`${kind}.${name}  ${r.command ?? ''}`);
  if (r.unsupported) { console.log('   unsupported: true (missing ' + (r.missing ?? []).join(',') + ')'); return; }
  if (r.failed) { console.log('   FAILED: ' + r.error); return; }
  console.log('   tags   ' + [r.tags.pixFmt, r.tags.color_primaries, r.tags.color_transfer, r.tags.color_space, r.tags.color_range].join(' / '));
  console.log('   node Y ' + r.y.map((v) => String(v).padStart(6)).join(''));
  console.log('   stats  ' + r.stats.map((v) => String(Math.round(v * 10) / 10).padStart(6)).join('') + `   reader gap ${r.readerGap}   chroma dev ${r.cbMaxDev}`);
  console.log('   err    ' + r.sum.err.map((v) => String(v).padStart(6)).join('') + `   mae low ${r.sum.maeLow} mid ${r.sum.maeMid}  high distinct ${r.sum.highDistinct} max ${r.sum.highMax}`);
};
for (const kind of ['hdr', 'sdr']) for (const [name, r] of Object.entries(ev[kind])) show(kind, name, r);
show('hdr', 'recover (naive output through zscale)', ev.recover);
show('hdr', 'recoverRelabel (relabelled output through zscale)', ev.recoverRelabel);
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'node' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
