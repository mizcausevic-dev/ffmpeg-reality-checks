// Usage: node episodes/ff60/fixture/run.mjs [outdir]   (default: ./out/ff60)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, PATHS, KINDS, STRATS, STRAT_IDS, cell} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg')) { console.error('ffmpeg must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff60');
fs.rmSync(dir, {recursive: true, force: true});
const ev = runExperiment(dir);
console.log(ev.ffmpeg.split('\n')[0]);
console.log(`libass in the build: ${ev.libassEnabled}; libass package: ${ev.libass}`);
console.log(`control (no subtitles): ${ev.control.bytes} bytes of gray pixels, md5 ${ev.control.md5}`);
console.log(`references (same file, safe name) burn ${ev.references.map((r) => r.burned).join(', ')} pixels; lookalike files burn ${ev.decoys.map((d) => `${d.rel} ${d.burned}`).join(', ')}\n`);
const short = {right: 'right', wrong: 'WRONG', none: 'none', error: 'error'};
console.log('path'.padEnd(12) + 'kind'.padEnd(6) + STRAT_IDS.map((s) => s.padEnd(11)).join(''));
for (const p of PATHS) for (const k of KINDS) console.log(p.id.padEnd(12) + k.padEnd(6) + STRAT_IDS.map((s) => short[cell(ev, p.id, k, s).classA].padEnd(11)).join(''));
console.log(`\nreaders disagree on ${ev.cases.filter((c) => c.classA !== c.classB).length} of ${ev.cases.length} cases`);
console.log('\nerror texts of the raw strings:');
for (const p of PATHS) { const c = cell(ev, p.id, 'abs', 'raw'); if (c.classA === 'error') console.log(`  ${p.id.padEnd(10)} ${c.error}`); }
console.log('\nshell as a third layer' + (ev.shellSkipped ? ' (skipped: no /bin/sh on this system)' : '') + ':');
for (const s of ev.shell) console.log(`  ${s.path.padEnd(6)} ${s.how.padEnd(7)} ${s.typed.padEnd(44)} ${s.classA}${s.error ? ' (' + s.error + ')' : ''}`);
console.log(`\nffprobe on the bare name: status ${ev.protocol.bare.status}, ${ev.protocol.bare.error}; with ./ in front: status ${ev.protocol.dot.status}, format ${ev.protocol.dot.format}; with file: in front: status ${ev.protocol.file.status}, format ${ev.protocol.file.format}`);
console.log('\nwithout the lookalike files:');
for (const n of ev.noDecoy) console.log(`  ${n.path.padEnd(10)} ${n.error}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
