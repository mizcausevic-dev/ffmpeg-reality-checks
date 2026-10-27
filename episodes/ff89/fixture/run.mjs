// Runs the ff89 experiment, prints the tables and writes out/ff89/evidence.json (next to the series repo root unless a directory is given).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment, FORMATS} from './experiment.mjs';

const outDir = path.resolve(process.argv[2] ?? 'out/ff89');
fs.mkdirSync(outDir, {recursive: true});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff89-'));
const ev = runExperiment(tmp);
console.log(ev.ffmpeg);
console.log('encoders', JSON.stringify(ev.encoders), 'decoders', JSON.stringify(ev.decoders));
for (const f of FORMATS) {
  const r = ev.formats[f.id];
  if (!r.available) { console.log(`${f.id}: encoder ${f.enc} missing`); continue; }
  if (!r.encoded) { console.log(`${f.id}: not encoded, exit ${r.encodeStatus}: ${r.encodeStderr.split(/\r?\n/).filter(Boolean).pop()}`); continue; }
  console.log(`\n${f.label}  [${r.probe.codec}, pix_fmt ${r.probe.pix_fmt}, alpha_mode ${r.probe.alpha_mode}]  ${r.bytes} bytes  autoSelected=${r.autoSelected} noAlphaWarning=${r.noAlphaWarning}`);
  console.log('   file readers', JSON.stringify(r.file_readers).slice(0, 300));
  for (const [id, d] of Object.entries(r.decodes)) {
    const c = d.cmp;
    console.log(`   decoder ${id}: frames ${c.frames} alpha levels ${c.alphaLevels.length} (${c.alphaLevels.join(',')}) opaque=${c.opaque} mismatch ${c.alphaMismatch} maxErr ${c.alphaMaxErr} meanErr ${c.alphaMeanErr.toFixed(3)} colorMaxErr(a>0) ${c.colorMaxErr} A=B ${d.readersAB} C mismatch ${d.readerCMismatch} a0 ${JSON.stringify(d.a0[0])} overMaxErr ${d.overMaxErr}`);
  }
}
for (const [k, v] of Object.entries(ev.conv)) console.log("conv", k, v && JSON.stringify({levels: v.alphaLevels.join(","), mis: v.alphaMismatch, max: v.alphaMaxErr, cmax: v.colorMaxErrAll}));
console.log('\nflat', JSON.stringify(ev.flat)); console.log('vp8Default', JSON.stringify(ev.vp8Default));
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(ev, (k, v) => (k === 'file' ? undefined : v), 2));
fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\nEvidence written to ${path.join(outDir, 'evidence.json')}`);
