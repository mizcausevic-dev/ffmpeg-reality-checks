// Usage: node episodes/fs03/fixture/run.mjs [outdir]   (default: ./out/fs03). Runs fl03's experiment and writes the same evidence.json.
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fs03');
const ev = runExperiment(dir);
console.log(`${ev.ffmpeg} [${ev.build}]  recipe worst error ${ev.recipe.encodes.recipe.read.auto.worstError}, plain read as BT.709 ${ev.recipe.encodes.plain.read.bt709.worstError}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`Evidence written to ${path.join(dir, 'evidence.json')}`);
