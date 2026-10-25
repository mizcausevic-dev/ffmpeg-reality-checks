#!/usr/bin/env node
// Usage: node episodes/ep01/fixture/run.mjs [outdir]   (default: ./out/ep01)
import fs from 'node:fs';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from './experiment.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('BLOCKED: ffmpeg and ffprobe must be on PATH'); process.exit(2); }
const dir = path.resolve(process.argv[2] ?? 'out/ep01');
const {frameLookup, srcMd5, ...ev} = runExperiment(dir);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(ev.ffmpeg);
console.log(`You asked for ${ev.request.clipSeconds} s starting at ${ev.request.seekSeconds} s (first frame ${ev.request.expectedFirstFrame}, ${ev.request.expectedFrames} frames). Source keyframes at ${ev.source.keyframes.join(', ')} s.\n`);
console.log('variant'.padEnd(22), 'first frame'.padEnd(12), 'starts at'.padEnd(10), 'frames'.padEnd(7), 'seconds'.padEnd(8), 'packets in file');
for (const [k, v] of Object.entries(ev.variants)) console.log(k.padEnd(22), String(v.firstSourceFrame).padEnd(12), `${v.firstSourceTime}s`.padEnd(10), String(v.decodedFrames).padEnd(7), String(v.decodedSeconds).padEnd(8), v.packets);
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
