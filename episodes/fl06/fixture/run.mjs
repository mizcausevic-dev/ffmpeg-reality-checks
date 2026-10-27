// Usage: node episodes/fl06/fixture/run.mjs [outdir]   (default: ./out/fl06)
// Runs the PNG predictor measurement on whatever ffmpeg is on PATH, prints a summary and writes evidence.json.
// Run it on each build you want to compare, then: node episodes/fl06/fixture/compare.mjs <evidenceA.json> <evidenceB.json>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runExperiment, PREDS, CONTENT} from './experiment.mjs';
import {FILTER_NAMES} from './png.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const outDir = path.resolve(process.argv[2] ?? 'out/fl06');
fs.mkdirSync(outDir, {recursive: true});
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl06-'));
let ev;
try { ev = runExperiment(work); } finally { fs.rmSync(work, {recursive: true, force: true}); }

console.log(`${ev.ffmpeg}   (${ev.build}, ${ev.seconds} s)`);
console.log(ev.libs.join('\n'));
console.log(`help: ${ev.help.predLine}  -> default "${ev.help.predDefault}"\n`);
console.log('control (PNG built here with known filter bytes):');
for (const [k, c] of Object.entries(ev.control)) console.log(`  ${k.padEnd(10)} parser reads ${c.rowsMatchExactly ? 'exactly the bytes we wrote' : 'DIFFERENT bytes'}, histogram ${JSON.stringify(c.histogram)}; pixels node ${c.nodePixelMd5 === c.srcMd5 ? 'ok' : 'WRONG'}, ffmpeg ${c.ffmpegDecodedMd5 === c.srcMd5 ? 'ok' : 'WRONG'}`);
console.log('\nbytes per -pred (default first), and the filter histogram of the default file [none sub up avg paeth]:');
console.log(`${'content'.padEnd(24)}${['default', ...PREDS].map((p) => p.padStart(9)).join('')}   default histogram   same bytes as`);
for (const [name, s] of Object.entries(ev.summary)) console.log(`${name.padEnd(24)}${['default', ...PREDS].map((p) => String(s[p].bytes).padStart(9)).join('')}   ${JSON.stringify(s.default.histogram).padEnd(18)}  ${s.defaultEqualsExplicit.join(',') || '-'}`);
const bad = Object.entries(ev.contents).flatMap(([n, c]) => Object.entries(c.runs).filter(([, r]) => !r.pixelsMatchSource || !r.repeatsIdentical || !r.readersAgree).map(([p]) => `${n}/${p}`));
console.log(`\npixels identical to source and both readers agree and 3 repeats identical, for every run: ${bad.length === 0 ? 'yes' : 'NO: ' + bad.join(', ')}`);
console.log('\n-compression_level (bytes), default | paeth:');
for (const [name, r] of Object.entries(ev.levels)) console.log(`  ${name.padEnd(16)} ${[0, 1, 6, 9].map((l) => `l${l} ${r[`default_l${l}`].bytes} | ${r[`paeth_l${l}`].bytes}`).join('   ')}`);
fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(outDir, 'evidence.json')}`);
