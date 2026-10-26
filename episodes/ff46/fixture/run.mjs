// Usage: node episodes/ff46/fixture/run.mjs [outdir]   (default: ./out/ff46)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff46');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`source: ${ev.source.frames} video frames (${ev.source.distinctFrames} distinct), ${ev.source.audioSamples} audio samples, tone onset at sample ${ev.source.onsetIndex}\n`);
for (const [k, r] of Object.entries(ev.runs)) {
  console.log(`${k.padEnd(10)} ${r.command}`);
  console.log(`           ffprobe: video starts ${r.probe.videoStart}, audio starts ${r.probe.audioStart} (first packets ${r.probe.videoFirstPacket} / ${r.probe.audioFirstPacket}); decoded ${r.audio.samples} samples, tone at sample ${r.audio.onsetIndex} = ${r.audio.onsetTime} s, equals source ${r.audio.equalsSource}`);
  console.log(`           bytes:   video starts ${r.bytes.videoStart}, audio starts ${r.bytes.audioStart}, tone predicted at ${r.bytes.onsetTime} s${r.container === 'mp4' ? `, audio skip ${r.bytes.audioSkip} s, edits ${JSON.stringify(r.bytes.audioEdits)} / video ${JSON.stringify(r.bytes.videoEdits)}` : ''}`);
  if (r.ignored) console.log(`           edit lists ignored: video ${r.ignored.videoStart}, audio ${r.ignored.audioStart}, ${r.ignored.audioSamples} samples, tone at ${r.ignored.audioOnsetTime} s`);
  console.log(`           frames ${r.video.frames} (equal to source ${r.video.equalsSource})   shift of the tone against the picture: decoded ${r.shift.decoded} s, bytes ${r.shift.bytes} s, stamps only ${r.shift.container} s`);
}
const slim = JSON.parse(JSON.stringify(ev, (k, v) => (k === 'md5' && Array.isArray(v) ? undefined : v)));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(slim, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
