// Usage: node episodes/ff77/fixture/run.mjs [outdir]   (default: ./out/ff77)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, write, SEEKS} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff77');
fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const f2 = (v) => (v === null || v === undefined ? 'N/A' : v.toFixed(1));
console.log('file         mvhd  mehd  sidx  moof  mfra  node s | ffprobe disk fmt/stream/frames | stdin fmt | decoded');
for (const [n, f] of Object.entries({...ev.files, ...ev.controls})) {
  const d = f.node;
  console.log(`${n.padEnd(12)} ${String(d.mvhd.duration).padStart(5)} ${(d.mehd ? d.mehd.duration : '-').toString().padStart(5)} ${String(d.sidx.length).padStart(5)} ${String(d.fragments).padStart(5)} ${(d.mfra ? d.mfra.entries : '-').toString().padStart(5)} ${f2(d.seconds).padStart(7)} | ${f2(f.disk.format)} ${f2(f.disk.stream)} ${String(f.disk.nbFrames).padStart(4)} | ${f2(f.pipe.format).padStart(5)} | ${f.decoded.frames}${d.baseOk ? '' : '  (base offsets stale)'}`);
}
console.log('\nseeks (expected / disk / stdin): ' + SEEKS.map((s) => `${s.kind} ${s.t}`).join(' | '));
for (const [n, f] of Object.entries({...ev.files, ...ev.controls})) console.log(`${n.padEnd(12)} ` + f.seeks.disk.map((s, i) => `${s.expected}/${s.id}/${f.seeks.pipe[i].id}`).join('  '));
console.log('\ntruncated at 55 percent: ' + JSON.stringify(Object.fromEntries(Object.entries(ev.truncated).map(([k, v]) => [k, {whole: v.node.wholeFragments, probe: v.disk.ok ? v.disk.format : v.disk.error, decoded: v.decoded.frames}]))));
console.log('remux: ' + JSON.stringify({mvhd: ev.remux.file.node.mvhd.duration, moof: ev.remux.file.node.fragments, stdin: ev.remux.file.pipe.format, same: ev.remux.sameHashes}));
console.log('pipe write: ' + JSON.stringify({reg: ev.pipeWrite.reg, frag: {exit: ev.pipeWrite.frag.exit, bytes: ev.pipeWrite.frag.bytes, mfra: ev.pipeWrite.frag.file.node.mfra, decoded: ev.pipeWrite.frag.file.decoded.frames}, sidxbase: ev.pipeWrite.sidxbase}));
write(path.join(dir, 'evidence.json'), ev);
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
