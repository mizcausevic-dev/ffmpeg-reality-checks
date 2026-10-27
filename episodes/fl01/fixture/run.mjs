// Usage: node episodes/fl01/fixture/run.mjs [outdir]   (default: ./out/fl01)
// Re-runs the five source fixtures live, runs the recipe check, prints a summary and writes evidence.json.
import fs from 'node:fs';
import path from 'node:path';
import {runAll, ASK} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl01');
const ev = runAll(dir);
const S = ev.sources;
console.log(ev.ffmpeg + `   (${ev.build})\n`);
console.log('ff01 -c copy, 3 s from 7.5 s:');
for (const [k, v] of Object.entries(S.ff01.variants)) console.log(`  ${k.padEnd(22)} starts ${v.firstSourceTime}s, ${v.decodedFrames} frames (${v.decodedSeconds}s), ${v.packets} packets`);
console.log('ff23 -ss/-to:');
for (const [k, r] of Object.entries(S.ff23.runs)) console.log(`  ${r.command.padEnd(52)} ${r.declared.frames} frames, source ${r.content.firstSeconds}s to ${r.content.endSeconds}s`);
console.log('ff21 keyframes:');
for (const [k, r] of Object.entries(S.ff21.runs)) console.log(`  ${r.command.padEnd(100)} ${r.keyframes.join(', ')}`);
console.log('ff32 -sseof:');
for (const k of ['g100_enc', 'g100_copy', 'g10_copy', 'g10_enc29', 'g10_copy29', 'av', 'big_enc']) { const r = S.ff32.runs[k]; console.log(`  ${r.command.padEnd(46)} ${r.frames} frames (${r.first}..${r.last}), picture ${r.packetSeconds}s, audio ${r.audioSeconds}s`); }
console.log('ff15 -shortest:');
for (const [k, r] of Object.entries(S.ff15.runs)) console.log(`  ${r.command.padEnd(76)} file ${r.declared.container}s, ${r.decoded.videoFrames} frames, audio ${r.decoded.audioSeconds}s`);
console.log(`\nRecipe: ${ASK.length} s from ${ASK.start} s on a ${ASK.seconds} s, ${ASK.fps} fps coded clip (frames ${ASK.startFrame} to ${ASK.startFrame + ASK.wantFrames - 1}). keyframes grid ${ev.recipe.source.keyframes.grid}, prepared ${ev.recipe.source.keyframes.prepared}`);
const line = (k, r) => console.log(`  ${k.padEnd(22)} ${String(r.frames).padStart(3)} frames ${r.first}..${r.last}  packets ${r.packets} (hidden ${r.verdict.hiddenPackets})  md5 ${r.verdict.md5} code ${r.verdict.code}  EXACT ${r.verdict.exact}\n      ${r.command ?? ''}`);
line('control reference', ev.recipe.control.reference);
for (const [k, r] of Object.entries(ev.recipe.runs)) line(k, r);
console.log('Ends:');
for (const [k, r] of Object.entries(ev.recipe.ends)) console.log(`  ${k.padEnd(10)} file ${r.declared.container}s video ${r.declared.video}s: ${r.decoded.videoFrames} frames, audio ${r.decoded.audioSeconds}s   ${r.command}`);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
