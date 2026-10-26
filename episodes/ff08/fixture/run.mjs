// Usage: node episodes/ff08/fixture/run.mjs [outdir]   (default: ./out/ff08)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff08');
const ev = runExperiment(dir);
console.log(`${ev.ffmpeg}\n`);
console.log('file   packets  last pkt  skip(first)  container s  decoded samples  decoded s');
for (const k of ['a', 'b', 'join']) { const f = ev[k]; console.log(`${k.padEnd(6)} ${String(f.packets).padEnd(8)} ${String(f.lastPacketDuration).padEnd(9)} ${String(f.firstPacketSkipSamples).padEnd(12)} ${String(f.containerSeconds).padEnd(11)} ${String(f.decodedSamples).padEnd(16)} ${f.decodedSeconds}`); }
console.log(`\nvalid samples per file ${ev.source.validSamplesEach}; both ${ev.accounting.validSamplesTotal}`);
console.log(`join decodes ${ev.accounting.joinMinusSeparateDecodes} more samples than the two files decoded separately`);
console.log(`join decodes ${ev.accounting.joinMinusValid} more samples than the audio that was asked for`);
console.log(`priming per file ${ev.accounting.primingPerFile}, padding per file ${ev.accounting.paddingPerFile}; container duration is ${ev.accounting.containerExtraSamples} samples over 4.0 s`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
