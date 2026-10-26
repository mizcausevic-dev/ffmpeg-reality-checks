// Usage: node episodes/ff68/fixture/run.mjs [outdir]   (default: ./out/ff68)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment, CASES} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff68');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const f = (v) => (v === null || v === undefined ? 'n/a' : (Math.round(v * 1e4) / 1e4).toString());
for (const [k, r] of Object.entries(ev.runs)) {
  const p = r.probe, pk = r.packets, d = r.decoded;
  console.log(`${k.padEnd(9)} ${r.command}`);
  console.log(`          format ${f(p.format.duration)} s (start ${f(p.format.start)}) | video start ${f(p.video.start)} stream ${f(p.video.duration)} tag ${f(p.video.tagDuration)} packets sum ${f(pk.video.sumDur)} span ${f(pk.video.span)} decoded ${d.frames} frames = ${f(d.videoSeconds)} s`);
  console.log(`          audio start ${f(p.audio.start)} stream ${f(p.audio.duration)} tag ${f(p.audio.tagDuration)} packets ${pk.audio.n} sum ${f(pk.audio.sumDur)} span ${f(pk.audio.span)} decoded ${d.samples} samples = ${f(d.audioSeconds)} s (nominal ${d.expectedSamples})`);
  console.log(`          timeline (decoder + ffprobe starts) ${f(r.timeline.start)} to ${f(r.timeline.end)} = ${f(r.timeline.length)} s; format minus timeline ${f(r.gaps.formatVsTimeline)}`);
  const c = r.container;
  if (c.mvhd) console.log(`          container bytes: mvhd ${f(c.movieSeconds)} s; ${c.tracks.map((t) => `${t.handler} tkhd ${f(t.tkhdSeconds)} mdhd ${f(t.mediaSeconds)} stts ${f(t.sttsSeconds)} edits ${JSON.stringify(t.elst.map((e) => [e.segment, e.mediaTime]))}`).join(' | ')}`);
  else if (c.blocks) console.log(`          container bytes: Info Duration ${f(c.durationSeconds)} s; DURATION tags ${c.durationTags.map((t) => t.text.slice(0, 12)).join(', ')}; audio block steps ${c.audioStepsMs.join('/')} ms, all block times whole ms: ${c.wholeMs}`);
  else console.log(`          container bytes: PES pts video ${f(c.video.first)} to ${f(c.video.last)} (${c.video.count} PES), audio ${f(c.audio.first)} to ${f(c.audio.last)} (${c.audio.count} PES); model audio stream ${f(r.tsModel.audioStream)}, frames in the last audio PES ${r.tsModel.audioFramesInLastPes}`);
}
console.log('\nhex:', JSON.stringify(ev.hex));
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'blocks' ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
