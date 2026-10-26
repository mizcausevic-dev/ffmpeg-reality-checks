// Usage: node episodes/ff73/fixture/run.mjs [outdir]   (default: ./out/ff73)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, summary, minBs, modelMin, caseOf, haveDrawtext, findFont, TARGETS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
if (!haveDrawtext() || !findFont()) { console.log('no finding: drawtext (libfreetype) or a monospace font is missing on this machine'); process.exit(0); }
const dir = path.resolve(process.argv[2] ?? 'out/ff73');
fs.rmSync(dir, {recursive: true, force: true});
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`font ${ev.font}, size ${ev.fontsize}, canvas ${ev.canvas}, advance ${ev.advance} px, ${ev.cells} cells, ${ev.glyphs} reference glyphs, ambiguous positions ${ev.ambiguousPositions}`);
console.log(`control: ${ev.control.random.count} random strings through the clean route, mismatches ${ev.control.random.mismatches}; untouched frame decodes to ${JSON.stringify(ev.control.untouchedDecodes)} with ${ev.control.untouchedInk} ink pixels; it's vs its: ${JSON.stringify(ev.control.apostropheVsNone)}\n`);
const q = (v) => (v === null ? 'unreadable' : JSON.stringify(v));
for (const c of ev.cases.filter((x) => ['typed', 'file', 'extra', 'mechanism'].includes(x.group))) {
  console.log(`${c.id.padEnd(22)} ${c.textOpts.padEnd(34)} exit ${c.exit}  drawn ${q(c.drawn).padEnd(12)} ink ${String(c.ink).padStart(5)}  ${c.ok ? 'OK' : '  '}  readers agree ${c.agree}  ${c.warn}`);
}
console.log('\ncolon mechanism (framemd5):', JSON.stringify(ev.colonMechanism));
console.log('\nbackslashes that give the target (expansion on / off, bare / quoted):');
const s = summary(ev);
for (const t of Object.keys(TARGETS)) {
  console.log(`${t.padEnd(11)} ${TARGETS[t].text.padEnd(6)} on: bare ${JSON.stringify(s[t].normal.bare)} quoted ${JSON.stringify(s[t].normal.quoted)}   off: bare ${JSON.stringify(s[t].none.bare)} quoted ${JSON.stringify(s[t].none.quoted)}`);
  console.log(`${''.padEnd(18)} minimum on: bare ${minBs(ev, 'grid', t, 'bare')} (model ${modelMin(t, 'normal', 'bare')}) quoted ${minBs(ev, 'grid', t, 'quoted')} (model ${modelMin(t, 'normal', 'quoted')})   off: bare ${minBs(ev, 'none', t, 'bare')} (model ${modelMin(t, 'none', 'bare')}) quoted ${minBs(ev, 'none', t, 'quoted')} (model ${modelMin(t, 'none', 'quoted')})`);
}
const grid = ev.cases.filter((c) => c.group === 'grid' && c.target === 'percent' && c.style === 'quoted');
console.log('\npercent, quoted, expansion on, 0 to 9 backslashes: ' + grid.map((c) => `${c.bs}:${q(c.drawn)}`).join(' '));
console.log(`readers disagree on ${ev.cases.filter((c) => c.agree === false).length} of ${ev.cases.length} cases; unreadable by reader 2 (other font): ${ev.cases.filter((c) => c.drawn === null && c.exit === 0).length}; ffmpeg runs ${ev.runs}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
