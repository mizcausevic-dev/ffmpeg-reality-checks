// Usage: node episodes/ff74/fixture/run.mjs [outdir]   (default: ./out/ff74)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, caseOf, summary, runsOfIds} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff74');
fs.rmSync(dir, {recursive: true, force: true});
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} frames, ${ev.source.distinct} distinct, flat ${ev.source.flat}, id = luma - 16 for every frame: ${ev.source.rule}`);
for (const c of Object.values(ev.controls)) console.log(`control ${c.name.padEnd(7)} reader 1 ${c.readerOk}, reader 2 ${c.reader2Ok}, repeated ${JSON.stringify(c.repeated)}`);
console.log('\nloop=N:size=5:start=10');
for (const n of [0, 1, 2, 3]) { const c = caseOf(ev, n, 5, 10); console.log(`  N=${n}: ${c.frames} frames (+${c.extra}), repeated ${c.repeatedFrom}..${c.repeatedTo} ${c.maxPlays} plays, runs ${JSON.stringify(runsOfIds(c.ids).map((r) => `${r.from}-${r.to}`))}`); }
console.log('\nstart (loop=1, size=5): first repeated frame');
for (const s of [0, 1, 2, 10, 48]) { const c = caseOf(ev, 1, 5, s); console.log(`  start=${s}: repeated ${c.repeatedFrom}..${c.repeatedTo}, ${c.frames} frames`); }
console.log('\nsize (loop=1, start=10)');
for (const m of [1, 5, 25, 100]) { const c = caseOf(ev, 1, m, 10); console.log(`  size=${m}: repeated ${c.repeatedFrom}..${c.repeatedTo} (${c.segLen} frames), ${c.frames} frames`); }
console.log('\ntime / start edge cases');
for (const c of ev.time) console.log(`  ${c.command.replace(' -i counter.mkv -vf', '').padEnd(48)} frames ${c.frames} repeated ${c.repeatedFrom}..${c.repeatedTo}  model ${c.modelOk}`);
console.log('\nfps (loop=1:size=5:start=10)');
for (const f of ev.fps) console.log(`  ${f.fps} fps: ${f.frames} frames, repeated ${JSON.stringify(f.repeated.map((x) => x.id))}, ${f.seconds} s (source ${f.sourceSeconds} s), ffprobe ${JSON.stringify(f.probe)}`);
console.log('\nfrom a file: ' + ev.fromFile.map((c) => `${c.command.replace(' -i counter.mkv -vf', '').split(' ')[1]} -> ${c.repeatedFrom}..${c.repeatedTo} ${c.frames}f model ${c.modelOk}`).join('; '));
console.log('\nffprobe durations', JSON.stringify(ev.probe));
console.log(`\nloop=-1 guarded: ${ev.infinite.guarded.frames} frames, first runs ${JSON.stringify(runsOfIds(ev.infinite.guarded.ids).slice(0, 5).map((r) => `${r.from}-${r.to}`))}; unguarded killed ${ev.infinite.unguarded.killed} after ${ev.infinite.unguarded.seconds} s at frame ${ev.infinite.unguarded.lastFrame}`);
console.log(`\ngrid: ${ev.grid.length} cases, readers agree ${ev.grid.filter((c) => c.agree).length}, model matches ${ev.grid.filter((c) => c.modelOk).length}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
