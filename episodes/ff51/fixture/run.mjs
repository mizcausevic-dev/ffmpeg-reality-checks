// Usage: node episodes/ff51/fixture/run.mjs [outdir]   (default: ./out/ff51)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff51');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
const show = (k, r, cmd) => {
  console.log(`${k.padEnd(9)} ${cmd ?? ''}`);
  console.log(`          exit ${r.status ?? '-'}, ${r.bytes} bytes, ffprobe streams: [${r.probe.streams.join(', ')}]${r.probe.error ? ` (${r.probe.error})` : ''}`);
  console.log(`          subtitle packets ${r.probe.packets} (empty ${r.probe.emptyPackets}), cue packets match source times: ${r.probe.timesMatch}; ffmpeg srt export: ${r.decoded.cues} cues, times match ${r.decoded.timesMatch}, italic kept ${r.decoded.italic}`);
  console.log(`          bytes: tx3g ${r.bytesRead.tx3g}, S_TEXT/UTF8 ${r.bytesRead.srtId}, S_TEXT/ASS ${r.bytesRead.assId}, cue words found ${r.bytesRead.words} of 4, italic markup html ${r.bytesRead.italicHtml} ass ${r.bytesRead.italicAss}`);
};
show('srcmp4', ev.srcmp4, 'source: mov_text in mp4');
show('srcmkv', ev.srcmkv, 'source: subrip in mkv');
for (const [k, r] of Object.entries(ev.runs)) show(k, r, r.command);
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
