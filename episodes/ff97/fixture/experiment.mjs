// Episode 97 fixture: "WAV through a pipe: what do the RIFF size and the data size say when ffmpeg cannot seek back?"
// Synthetic input only: a 440 Hz sine, 48000 Hz, stereo, 1 s, pcm_s16le. 48000 * 2 * 2 = 192000 bytes of audio, byte rate 192000.
// Cases (every one is the same audio, only the container path differs):
//   file        ffmpeg ... -f wav <file>                      (the output can be sought, the sizes are written at the end)
//   pipe        ffmpeg ... -f wav -                           (stdout captured by Node, a pipe cannot be sought)
//   bext_pipe   -write_bext 1 -f wav -
//   rf64_pipe   -rf64 always -f wav -
//   rf64_file   -rf64 always -f wav <file>
//   w64_pipe    -f w64 -
//   w64_file    -f w64 <file>
//   raw_hdr     -f s16le - plus a 44 byte header written by Node (the length is known in advance: 1 s)
//   patched     the pipe capture with its two size fields patched by Node after the last byte arrived
//   w64_patched the w64 pipe capture with its two 64 bit size fields patched the same way
// Readers:
//   reader 1  ffprobe (format and stream duration, on the file and on stdin) and ffmpeg decoding (bytes out, from the file and from stdin)
//   reader 2  the bytes in Node: the chunk list, the RIFF size field, the data size field, the ds64 fields, and the duration a player gets
//             by dividing the claimed data bytes by the byte rate
// Windows safe: argument arrays, os.tmpdir() and path.join, no shell, binary Buffers on stdout.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const RATE = 48000, CH = 2, SECONDS = 1, BYTES = RATE * CH * 2 * SECONDS, BYTE_RATE = RATE * CH * 2;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const num = (s) => (s === undefined || s === null || s === 'N/A' ? null : Number(s));
const r6 = (v) => (v === null || v === undefined ? null : Math.round(v * 1e6) / 1e6);

const SRC = ['-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=${RATE}:duration=${SECONDS}`, '-ac', String(CH), '-c:a', 'pcm_s16le'];
export const OUTS = {
  file: {args: ['-f', 'wav'], sink: 'file', shown: 'ffmpeg -f lavfi -i sine=... -f wav out.wav'},
  pipe: {args: ['-f', 'wav'], sink: 'pipe', shown: 'ffmpeg -f lavfi -i sine=... -f wav -'},
  bext_pipe: {args: ['-write_bext', '1', '-f', 'wav'], sink: 'pipe', shown: 'ffmpeg ... -write_bext 1 -f wav -'},
  rf64_pipe: {args: ['-rf64', 'always', '-f', 'wav'], sink: 'pipe', shown: 'ffmpeg ... -rf64 always -f wav -'},
  rf64_file: {args: ['-rf64', 'always', '-f', 'wav'], sink: 'file', shown: 'ffmpeg ... -rf64 always -f wav out.wav'},
  w64_pipe: {args: ['-f', 'w64'], sink: 'pipe', shown: 'ffmpeg ... -f w64 -'},
  w64_file: {args: ['-f', 'w64'], sink: 'file', shown: 'ffmpeg ... -f w64 out.w64'},
  raw: {args: ['-f', 's16le'], sink: 'pipe', shown: 'ffmpeg ... -f s16le -'},
};

export function ffmpegOut(key, dir) {
  const o = OUTS[key];
  const file = path.join(dir, `${key}.${key.startsWith('w64') ? 'w64' : 'wav'}`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...SRC, ...o.args, o.sink === 'pipe' ? '-' : file], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg ${key} failed: ${r.stderr}`);
  return o.sink === 'pipe' ? r.stdout : fs.readFileSync(file);
}

// ---------------- reader 2: the bytes ----------------
const ascii = (b, o, n) => b.toString('latin1', o, o + n);
const u64 = (b, o) => Number(b.readBigUInt64LE(o));
const u64hex = (b, o) => '0x' + b.readBigUInt64LE(o).toString(16);
const fmtOf = (b, o) => ({tag: b.readUInt16LE(o), channels: b.readUInt16LE(o + 2), rate: b.readUInt32LE(o + 4), byteRate: b.readUInt32LE(o + 8), align: b.readUInt16LE(o + 12), bits: b.readUInt16LE(o + 14)});
export const hexOf = (b, o = 0, n = 48) => (b.subarray(o, o + n).toString('hex').match(/../g) ?? []).join(' ');

export function parseWav(b) {
  const magic = ascii(b, 0, 4);
  const out = {magic, kind: null, riffField: null, dataField: null, ds64: null, fmt: null, chunks: [], dataOffset: null, payload: null, claimedBytes: null, naiveSeconds: null, riffHex: null, dataHex: null, bytes: b.length};
  if (magic === 'RIFF' || magic === 'RF64') {
    out.kind = magic === 'RIFF' ? 'riff' : 'rf64';
    out.riffField = b.readUInt32LE(4);
    out.riffHex = '0x' + out.riffField.toString(16);
    let pos = 12;
    while (pos + 8 <= b.length) {
      const id = ascii(b, pos, 4), size = b.readUInt32LE(pos + 4);
      out.chunks.push({id, offset: pos, size});
      if (id === 'fmt ') out.fmt = fmtOf(b, pos + 8);
      if (id === 'ds64') out.ds64 = {riff: u64(b, pos + 8), data: u64(b, pos + 16), samples: u64(b, pos + 24)};
      if (id === 'data') { out.dataOffset = pos + 8; out.dataField = size; out.dataHex = '0x' + size.toString(16); break; }
      pos += 8 + size + (size & 1);
    }
    out.claimedBytes = out.kind === 'rf64' && out.dataField === 0xffffffff && out.ds64 ? out.ds64.data : out.dataField;
  } else if (magic === 'riff') {
    out.kind = 'w64';
    out.riffField = u64(b, 16);
    out.riffHex = u64hex(b, 16);
    let pos = 40;
    while (pos + 24 <= b.length) {
      const id = ascii(b, pos, 4), size = u64(b, pos + 16);
      out.chunks.push({id, offset: pos, size});
      if (id === 'fmt ') out.fmt = fmtOf(b, pos + 24);
      if (id === 'data') { out.dataOffset = pos + 24; out.dataField = size; out.dataHex = u64hex(b, pos + 16); break; }
      pos += Math.ceil(size / 8) * 8;
    }
    out.claimedBytes = out.dataField === null ? null : out.dataField - 24;
  }
  if (out.dataOffset !== null) out.payload = b.length - out.dataOffset;
  if (out.claimedBytes !== null && out.fmt) out.naiveSeconds = out.claimedBytes / out.fmt.byteRate;
  return out;
}

// a standard 44 byte header for pcm16
export function wavHeader(rate, ch, dataBytes, riffField = 36 + dataBytes) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(riffField >>> 0, 4); h.write('WAVEfmt ', 8, 'latin1'); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36, 'latin1'); h.writeUInt32LE(dataBytes >>> 0, 40);
  return h;
}

// the repair after capture: write the two size fields from the number of bytes that actually arrived
export function patchSizes(buf) {
  const p = parseWav(buf);
  if (p.kind !== 'riff') throw new Error('patchSizes handles plain RIFF only');
  const out = Buffer.from(buf);
  out.writeUInt32LE(buf.length - 8, 4);
  out.writeUInt32LE(buf.length - p.dataOffset, p.dataOffset - 4);
  return out;
}

// the same repair for wave64: both fields are 64 bit and count the 24 byte chunk header
export function patchW64(buf) {
  const p = parseWav(buf);
  if (p.kind !== 'w64') throw new Error('patchW64 handles wave64 only');
  const out = Buffer.from(buf);
  out.writeBigUInt64LE(BigInt(buf.length), 16);
  out.writeBigUInt64LE(BigInt(buf.length - (p.dataOffset - 24)), p.dataOffset - 8);
  return out;
}

export const diffOffsets = (a, b) => { const d = []; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d.push(i); return d; };

// ---------------- reader 1: ffprobe and ffmpeg ----------------
function probe(target, input) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-of', 'json', '-show_entries', 'format=format_name,duration,size:stream=codec_name,sample_rate,channels,duration,duration_ts', ...(input ? ['-i', 'pipe:0'] : [target])], {input, encoding: 'utf8', maxBuffer: 1 << 26});
  let j = {};
  try { j = JSON.parse(r.stdout || '{}'); } catch { j = {}; }
  const s = (j.streams ?? [])[0] ?? {}, f = j.format ?? {};
  return {ok: r.status === 0 && Boolean(j.streams?.length), format: f.format_name ?? null, formatDuration: num(f.duration), streamDuration: num(s.duration), durationTs: num(s.duration_ts), rate: num(s.sample_rate), channels: num(s.channels), error: r.status === 0 ? '' : (r.stderr ?? '').trim().split(/\r?\n/).pop()};
}
function decode(target, input) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', input ? 'pipe:0' : target, '-f', 's16le', '-'], {input, maxBuffer: 1 << 26});
  return {bytes: r.stdout.length, status: r.status, data: r.stdout};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), source: {rate: RATE, channels: CH, seconds: SECONDS, audioBytes: BYTES, byteRate: BYTE_RATE}, cases: {}};
  const bufs = {};
  for (const key of Object.keys(OUTS)) bufs[key] = ffmpegOut(key, dir);
  // the two repairs
  const audio = bufs.raw;
  bufs.raw_hdr = Buffer.concat([wavHeader(RATE, CH, audio.length), audio]);
  bufs.patched = patchSizes(bufs.pipe);
  bufs.w64_patched = patchW64(bufs.w64_pipe);
  const fileAudio = bufs.file.subarray(parseWav(bufs.file).dataOffset);
  for (const [key, b] of Object.entries(bufs)) {
    if (key === 'raw') continue;
    const out = path.join(dir, `cap_${key}.${key.startsWith('w64') ? 'w64' : 'wav'}`);
    fs.writeFileSync(out, b);
    const p = parseWav(b);
    const pf = probe(out, null), ps = probe(null, b);
    const df = decode(out, null), ds = decode(null, b);
    ev.cases[key] = {
      command: OUTS[key]?.shown ?? (key === 'raw_hdr' ? 'ffmpeg ... -f s16le -  (Node writes a 44 byte header first)' : key === 'w64_patched' ? 'ffmpeg ... -f w64 -  (Node patches the two sizes)' : 'ffmpeg ... -f wav -  (Node patches the two sizes)'),
      bytes: b.length, headerHex: hexOf(b, 0, 96),
      magic: p.magic, kind: p.kind, riffField: p.riffField, dataField: p.dataField, riffHex: p.riffHex, dataHex: p.dataHex, ds64: p.ds64, chunks: p.chunks.map((c) => c.id), dataOffset: p.dataOffset, payload: p.payload,
      claimedBytes: p.claimedBytes, naiveSeconds: r6(p.naiveSeconds), fmt: p.fmt,
      probeFile: pf, probeStdin: ps,
      decodeFileBytes: df.bytes, decodeStdinBytes: ds.bytes,
      decodeFileEqualsAudio: df.bytes === audio.length && df.data.equals(audio), decodeStdinEqualsAudio: ds.bytes === audio.length && ds.data.equals(audio),
      payloadEqualsFileAudio: p.payload === fileAudio.length && b.subarray(p.dataOffset).equals(fileAudio),
    };
  }
  ev.pipeVsFile = {sameLength: bufs.pipe.length === bufs.file.length, differAt: diffOffsets(bufs.pipe, bufs.file), pipeBytes: bufs.pipe.length, fileBytes: bufs.file.length};
  // where does ffprobe get 1 s from? Append one more second of audio bytes after the data chunk: a true size field stops at 1 s, a placeholder runs to the end of the file
  const extra = Buffer.concat([audio]);
  const tail = (b, name) => { const f = path.join(dir, name); fs.writeFileSync(f, Buffer.concat([b, extra])); const p = probe(f, null); const d = decode(f, null); return {duration: p.formatDuration, decodeBytes: d.bytes}; };
  ev.appended = {file: tail(bufs.file, 'app_file.wav'), pipe: tail(bufs.pipe, 'app_pipe.wav'), appendedBytes: extra.length};
  ev.patchedEqualsFile = bufs.patched.equals(bufs.file);
  ev.rawBytes = audio.length;
  return ev;
}
