// Usage: node episodes/ff31/fixture/run.mjs [outdir]   (default: ./out/ff31)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff31');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + `   [build: ${ev.build}]\n`);
console.log(`source: lavfi testsrc2 ${ev.source.width}x${ev.source.height}, ${ev.source.fps} fps, ${ev.source.seconds} s = ${ev.source.frames} frames, ${ev.source.encoder}\n`);
for (const [k, f] of Object.entries(ev.files)) {
  console.log(`${k.padEnd(8)} ${f.command}`);
  const b = f.box;
  console.log(`         ffprobe tag ${f.probe.tagString} (${f.probe.tagHex})   ` + (b
    ? `stsd FourCC ${b.fourcc}, hvcC ${b.hvcC}, arrays [${b.arrays.map((a) => `${a.type}:${a.complete}`).join(' ')}], samples ${b.samples}, samples with in-band parameter sets ${b.samplesWithParamSets}, first sample NALs [${b.firstSampleNals}]`
    : `mkv CodecID V_MPEGH/ISO/HEVC ${f.mkv.codecId}, hvc1 in header ${f.mkv.hasHvc1}, hev1 in header ${f.mkv.hasHev1}`));
  console.log(`         ${f.bytes} bytes   packet md5 ${f.packetMd5.slice(0, 12)}   frame hash ${f.decoded.sha.slice(0, 12)} (${f.decoded.frames} frames)` + (b ? `   sample sha ${b.sampleSha.slice(0, 12)}` : ''));
}
console.log('\nbyte level differences between files of the same length:');
for (const [k, d] of Object.entries(ev.diffs)) {
  console.log(`  ${k.padEnd(10)} ${d.sameLength ? `${d.count} bytes differ, all inside the sample entry: ${d.insideSampleEntry}, at ${d.offsets.join(', ')}` : 'different length'}`);
  for (const w of d.where ?? []) console.log(`             ${w.offset}: ${w.from.path} -> ${w.from.field}; ${w.from.hex} becomes ${w.to.hex}; context "${w.from.ascii}" becomes "${w.to.ascii}"`);
}
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
