// Usage: node episodes/fl04/fixture/run.mjs [outdir]   (default: ./out/fl04)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/fl04');
const ev = runExperiment(dir);
console.log(`${ev.ffmpeg}   (build ${ev.build})\n`);
const s5 = ev.ff05.source, v5 = ev.ff05.variants;
console.log(`ff05  source ${s5.frames} frames over ${s5.duration} s, ${s5.distinctGapsMs.length} gap sizes (${s5.distinctGapsMs.join(' ')} ms), avg ${s5.avgFps} fps`);
for (const [k, v] of Object.entries(v5)) console.log(`      ${k.padEnd(12)} ${v.frames} frames, ${v.duplicatesByCounter} duplicates by counter, ${v.duplicatesByMd5} by md5, ${v.uniqueFrames} unique, ${v.distinctGapsMs.length} gap sizes`);
console.log(`ff16  source 60 frames, 30 fps, 2 s`);
for (const [k, r] of Object.entries(ev.ff16.runs)) console.log(`      ${k.padEnd(12)} ${r.inside.framesDecoded} frames, declared ${r.declared.duration} s at ${r.declared.fps} fps, packet gap ${r.inside.packetGap}`);
for (const [k, r] of Object.entries(ev.ff25.runs)) console.log(`ff25  ${k.padEnd(10)} kept ${r.byMd5.slice(0, 8).join(',')}   first at ${(r.byMd5[0] / r.fps).toFixed(3)} s   luma agrees ${JSON.stringify(r.byMd5) === JSON.stringify(r.byLuma)}`);
const show = (tag, k, r) => console.log(`${tag}  ${k.padEnd(10)} picture ${r.video.endPackets} s (${r.video.framesDecoded} frames) audio ${r.audio.endPackets} s (${r.audio.endDecoded} decoded) container ${r.container} s pitch ${r.pitch.goertzel}/${r.pitch.zeroCross}`);
show('ff29', 'source', ev.ff29.source.read);
for (const [k, r] of Object.entries(ev.ff29.runs)) show('ff29', k, r);
for (const [k, r] of Object.entries(ev.ff33.runs)) console.log(`ff33  ${k.padEnd(10)} ${r.video.framesDecoded} frames, picture ${r.video.endPackets} s, audio ${r.audio.endPackets} s, plays start at ${JSON.stringify(r.video.missingAtStart)}`);
console.log(`\nrecipe source: ${ev.recipe.source.frames} frames (${ev.recipe.source.unique} unique), looped ${ev.recipe.source.plays} times`);
for (const [k, r] of Object.entries(ev.recipe.runs)) { show('rcp ', k, r); console.log(`      timestamps (ffprobe) ${r.stamps.packets.distinct} distinct, ${r.stamps.packets.repeats} repeats, gaps ${r.stamps.packets.minGapMs} to ${r.stamps.packets.maxGapMs} ms; (decode) ${r.stamps.decoded.distinct} distinct, ${r.stamps.decoded.repeats} repeats, gaps ${r.stamps.decoded.minGapMs} to ${r.stamps.decoded.maxGapMs} ms; frames kept ${r.byMd5.length}, in source order ${r.byMd5.every((v, i) => i === 0 || v === (r.byMd5[i - 1] + 1) % 300)}\n      ${r.command}`); }
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'srcMd5' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
