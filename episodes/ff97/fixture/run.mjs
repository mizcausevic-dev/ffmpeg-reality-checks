// Usage: node episodes/ff97/fixture/run.mjs [outdir]   (default: ./out/ff97)
import fs from 'node:fs';
import path from 'node:path';
import {runExperiment} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';

if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const dir = path.resolve(process.argv[2] ?? 'out/ff97');
const ev = runExperiment(dir);
console.log(ev.ffmpeg + '\n');
console.log(`audio: ${ev.source.audioBytes} bytes, byte rate ${ev.source.byteRate}\n`);
const hx = (v) => (v === null || v === undefined ? 'N/A' : '0x' + Number(v).toString(16));
for (const [k, c] of Object.entries(ev.cases)) {
  console.log(`${k.padEnd(10)} ${c.command}`);
  console.log(`           ${c.bytes} bytes, chunks ${c.chunks.join(' ')}, payload ${c.payload}, riff field ${c.riffHex}, data field ${c.dataHex}${c.ds64 ? ', ds64 ' + JSON.stringify(c.ds64) : ''}`);
  console.log(`           claimed ${c.claimedBytes} bytes, a player gets ${c.naiveSeconds} s`);
  console.log(`           ffprobe file: ${c.probeFile.ok ? `format ${c.probeFile.formatDuration}, stream ${c.probeFile.streamDuration}` : 'fails: ' + c.probeFile.error}; stdin: ${c.probeStdin.ok ? `format ${c.probeStdin.formatDuration}, stream ${c.probeStdin.streamDuration}` : 'fails: ' + c.probeStdin.error}`);
  console.log(`           decode file ${c.decodeFileBytes} bytes, stdin ${c.decodeStdinBytes} bytes, same as the audio: ${c.decodeFileEqualsAudio} / ${c.decodeStdinEqualsAudio}; payload equals the file's audio: ${c.payloadEqualsFileAudio}\n`);
}
console.log('one more second appended after the data:', JSON.stringify(ev.appended));
console.log('patched equals the file byte for byte:', ev.patchedEqualsFile);
console.log('pipe vs file:', JSON.stringify(ev.pipeVsFile));
fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(ev, null, 2));
console.log(`\nEvidence written to ${path.join(dir, 'evidence.json')}`);
