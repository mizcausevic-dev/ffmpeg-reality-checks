// Usage: node episodes/ff83/fixture/run.mjs [outdir]   (default: ./out/ff83)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff83');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
for (const g of ev.gaps) console.log(`gap ${g.id}: ${g.start} to ${g.end} s (${g.duration} s), ${g.kind}, peak ${g.peak} (${g.peakDb.toFixed(1)} dBFS), rms ${g.rms.toFixed(1)} (${g.rmsDb.toFixed(1)} dBFS)`);
console.log(`thresholds in sample units: ${Object.entries(ev.thresholds).map(([k, v]) => `${k} = ${v.s16.toFixed(3)} -> ${v.trunc}`).join('; ')}\n`);
for (const r of Object.values(ev.runs)) {
  console.log(`${r.name.padEnd(10)} ${r.command}`);
  console.log(`           exit ${r.status}${r.message ? ` (${r.message})` : ''}; ${r.count} silence${r.count === 1 ? '' : 's'}${r.found ? ` = gaps ${r.found.join('')}` : ''}: ${r.silences.map((s) => `${s.channel ? 'ch' + s.channel + ' ' : ''}${s.start}..${s.end} (${s.duration})`).join(', ') || '-'}; raw samples agree: ${r.agree}`);
}
console.log('\nboundary (s16, n=0.001): silent values', ev.boundary.s16.silent.join(' '), '| not silent', ev.boundary.s16.notSilent.join(' '));
console.log('boundary (s16, n=-50dB): silent values', ev.boundary.s16n50.silent.join(' '), '| not silent', ev.boundary.s16n50.notSilent.join(' '));
console.log('boundary (f32, n=0.001): silent values', ev.boundary.f32.silent.join(' '), '| not silent', ev.boundary.f32.notSilent.join(' '));
console.log(`late gap: true ${ev.late.trueStart} to ${ev.late.trueEnd}; reported ${ev.late.reported?.start} to ${ev.late.reported?.end}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
