// Usage: node episodes/ff94/fixture/run.mjs [outdir]   (default: ./out/ff94)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, commandOf, DIRECTIONS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff94');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `   libsoxr: ${ev.soxr}\n`);
for (const [rin, ro] of DIRECTIONS) {
  console.log(`== ${rin} -> ${ro}`);
  for (const c of ev.cells.filter((x) => x.rin === rin && x.ro === ro)) {
    const a = c.align ? `  interior error ${c.align.interiorMax} LSB (one sample late: ${c.shifted.interiorMax}), edge ${c.align.edgeMax}, first sample ${c.align.first}, tone offset ${c.phaseStartUs} / ${c.phaseEndUs} us, ${c.freq} Hz` : '';
    console.log(`${c.label.padEnd(7)} ${c.method.padEnd(10)} in ${String(c.n).padEnd(6)} ideal ${String(Math.round(c.ideal * 1e4) / 1e4).padEnd(10)} out ${String(c.rawSamples).padEnd(6)} (wav ${c.wavSamples}, ffprobe ${c.probeTs}, rate ${c.wavRate}) diff ${Math.round(c.diff * 1e3) / 1e3}  ${c.seconds.toFixed(5)} s${a}`);
  }
}
console.log('\n100 pieces, 48000 -> 44100');
for (const [k, p] of Object.entries(ev.pieces)) console.log(`${k.padEnd(9)} ${p.method.padEnd(9)} ${p.size} in: ${p.perPiece} out each; sum ${p.joinedSamples} (wav ${p.joinedWav}, concat ffprobe ${p.joinedProbeTs}) whole ${p.wholeSamples} ideal ${p.ideal}; drift ${p.drift} samples = ${p.driftMs} ms; tone offset at the end ${p.phaseEndUs} us (whole signal ${p.wholePhaseEndUs} us)`);
console.log('\ncommands:'); for (const m of ['aresample', 'ar', 'soxr', 'asetrate']) console.log('  ' + commandOf(m, 48000, 44100));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
