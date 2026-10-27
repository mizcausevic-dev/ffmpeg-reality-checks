import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, parseWav, wavHeader, patchSizes, patchW64, diffOffsets, buildOf, BYTES, BYTE_RATE, RATE, CH} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff97-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const C = (k) => ev.cases[k];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const ALL = 0xffffffff;

t('the byte reader behaves on bytes we write ourselves: a plain header, a header with placeholder sizes, an RF64 header with a ds64 chunk, a wave64 header, and the two patches', () => {
  const audio = Buffer.alloc(16000, 7);
  const good = parseWav(Buffer.concat([wavHeader(8000, 1, audio.length), audio]));
  assert.equal(good.kind, 'riff'); assert.equal(good.riffField, 36 + 16000); assert.equal(good.dataField, 16000); assert.equal(good.dataOffset, 44); assert.equal(good.payload, 16000);
  assert.deepEqual(good.fmt, {tag: 1, channels: 1, rate: 8000, byteRate: 16000, align: 2, bits: 16}); assert.equal(good.naiveSeconds, 1);
  const open = Buffer.concat([wavHeader(8000, 1, ALL, ALL), audio]);
  const p = parseWav(open);
  assert.equal(p.dataField, ALL); assert.equal(p.claimedBytes, 4294967295); near(p.naiveSeconds, 4294967295 / 16000, 1e-9); assert.equal(p.payload, 16000);
  const fixed = patchSizes(open); assert.equal(parseWav(fixed).riffField, 36 + 16000); assert.equal(parseWav(fixed).dataField, 16000); assert.equal(parseWav(fixed).naiveSeconds, 1);
  assert.deepEqual(diffOffsets(open, fixed), [4, 5, 6, 7, 40, 41, 42, 43]);
  // RF64: ds64 carries 64 bit sizes, the data field holds the all ones marker
  const ds = Buffer.alloc(8 + 28); ds.write('ds64', 0, 'latin1'); ds.writeUInt32LE(28, 4); ds.writeBigUInt64LE(16036n, 8); ds.writeBigUInt64LE(16000n, 16); ds.writeBigUInt64LE(8000n, 24);
  const h = wavHeader(8000, 1, ALL, ALL); h.write('RF64', 0, 'latin1');
  const rf = Buffer.concat([h.subarray(0, 12), ds, h.subarray(12), audio]);
  const q = parseWav(rf);
  assert.equal(q.kind, 'rf64'); assert.deepEqual(q.ds64, {riff: 16036, data: 16000, samples: 8000}); assert.equal(q.claimedBytes, 16000); assert.equal(q.naiveSeconds, 1);
  // wave64: 16 byte GUIDs, 64 bit sizes that count their own 24 byte header
  const guid = (a) => Buffer.concat([Buffer.from(a), Buffer.from('f3acd3118cd100c04f8edb8a', 'hex')]);
  const u64 = (v) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
  const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(1, 2); fmt.writeUInt32LE(8000, 4); fmt.writeUInt32LE(16000, 8); fmt.writeUInt16LE(2, 12); fmt.writeUInt16LE(16, 14);
  const head = Buffer.concat([Buffer.from('72696666' + '2e91cf11a5d628db04c10000', 'hex'), u64(0), Buffer.from('77617665' + 'f3acd3118cd100c04f8edb8a', 'hex'), guid('fmt '), u64(24 + 16), fmt, guid('data'), u64(24 + 16000)]);
  const w = Buffer.concat([head, audio]);
  const r = parseWav(w);
  assert.equal(r.kind, 'w64'); assert.equal(r.payload, 16000); assert.equal(r.claimedBytes, 16000); assert.equal(r.fmt.rate, 8000); assert.equal(r.naiveSeconds, 1);
  const w2 = Buffer.from(w); w2.writeBigUInt64LE(0xffffffffffffffffn, 16); w2.writeBigUInt64LE(0x7fffffffffffffffn, head.length - 8);
  const p2 = parseWav(patchW64(w2)); assert.equal(p2.riffField, w.length); assert.equal(p2.claimedBytes, 16000);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and every case holds the same one second of audio: 48000 Hz, 2 channels, 16 bit, 192000 bytes, and Node captured those bytes untranslated', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.source.audioBytes, 192000); assert.equal(BYTES, RATE * CH * 2); assert.equal(BYTE_RATE, 192000);
  assert.equal(ev.rawBytes, 192000);
  for (const k of ['file', 'pipe', 'bext_pipe', 'rf64_pipe', 'rf64_file', 'w64_pipe', 'w64_file', 'raw_hdr', 'patched']) {
    assert.equal(C(k).payload, 192000, `${k} payload`); assert.equal(C(k).payloadEqualsFileAudio, true, `${k} audio equals the file's audio`);
    assert.deepEqual(C(k).fmt, {tag: 1, channels: 2, rate: 48000, byteRate: 192000, align: 4, bits: 16}, `${k} fmt`);
  }
  assert.equal(C('pipe').magic, 'RIFF'); assert.equal(C('pipe').headerHex.slice(0, 11), '52 49 46 46');
});

t('written to a file, the header is true: the RIFF size is the file size minus 8, the data size is the 192000 audio bytes, a size trusting player computes exactly 1 s, and ffprobe agrees', () => {
  const c = C('file');
  assert.equal(c.kind, 'riff'); assert.equal(c.riffField, c.bytes - 8); assert.equal(c.dataField, 192000); assert.equal(c.claimedBytes, 192000); assert.equal(c.naiveSeconds, 1);
  near(c.probeFile.formatDuration, 1, 1e-6); near(c.probeFile.streamDuration, 1, 1e-6); assert.equal(c.probeFile.durationTs, 48000);
  assert.equal(c.decodeFileEqualsAudio, true); assert.equal(c.decodeStdinEqualsAudio, true);
});

t('through a pipe the audio is byte for byte the same as in the file; on this build only the two size fields differ, and they say 4294967295 (0xffffffff): the largest number a plain WAV size field holds', () => {
  const c = C('pipe');
  assert.equal(c.payloadEqualsFileAudio, true);
  assert.equal(ev.pipeVsFile.sameLength, true);
  if (isV6()) {
    assert.deepEqual(ev.pipeVsFile.differAt, [4, 5, 6, 7, 74, 75, 76, 77]);
    assert.equal(c.riffField, ALL); assert.equal(c.dataField, ALL); assert.equal(c.riffHex, '0xffffffff'); assert.equal(c.dataHex, '0xffffffff');
    assert.equal(c.dataOffset, 78); assert.deepEqual(c.chunks, ['fmt ', 'LIST', 'data']);
  } else {
    // relation on any build: whatever differs, it is only inside the header
    assert.ok(ev.pipeVsFile.differAt.every((o) => o < c.dataOffset), 'differences are inside the header');
  }
});

t('a player that trusts the data size field computes the duration as claimed bytes over byte rate: 1 s for the file, 22369.6 s (6.2 hours) for the pipe on this build; whenever the field is not the true size the result is wrong', () => {
  const f = C('file'), p = C('pipe');
  assert.equal(f.naiveSeconds, 1);
  if (isV6()) {
    assert.equal(p.claimedBytes, 4294967295); near(p.naiveSeconds, 4294967295 / 192000, 1e-5); near(p.naiveSeconds / 3600, 6.2138, 0.001);
  }
  if (p.dataField !== p.payload) assert.notEqual(p.naiveSeconds, 1);
  // the arithmetic itself, on any build: the largest size a plain WAV can state, at this byte rate
  near(0xffffffff / BYTE_RATE, 22369.621328, 1e-5);
  assert.equal(Math.floor(0xffffffff / BYTE_RATE / 3600), 6);
});

t('ffprobe and ffmpeg are more forgiving than the header: on the pipe capture ffprobe reads 1.0 s from the file size (one more second appended makes it 2.0, while the true header stays at 1.0), and ffmpeg decodes all 192000 bytes, from a file and from stdin', () => {
  const p = C('pipe');
  assert.equal(p.decodeFileEqualsAudio, true); assert.equal(p.decodeStdinEqualsAudio, true);
  if (isV6()) { near(p.probeFile.formatDuration, 1, 1e-6); near(p.probeFile.streamDuration, 1, 1e-6); }
  assert.equal(p.probeFile.ok, true);
  // where the 1.0 s comes from: one more second of bytes appended after the data. A true size stops at 1 s; the placeholder runs to the end of the file
  near(ev.appended.file.duration, 1, 1e-6); assert.equal(ev.appended.file.decodeBytes, 192000);
  if (isV6()) { near(ev.appended.pipe.duration, 2, 1e-6); assert.equal(ev.appended.pipe.decodeBytes, 384000); }
  assert.equal(p.probeFile.rate, 48000); assert.equal(p.probeFile.channels, 2);
});

t('ffprobe reading the capture from stdin gives no duration for a plain WAV, even the correct one: the pipe, the file, the patched capture and the raw plus header all print N/A; the stream itself is found', () => {
  for (const k of ['file', 'pipe', 'patched', 'raw_hdr']) {
    assert.equal(C(k).probeStdin.ok, true, `${k} stdin stream found`);
    if (isV6()) { assert.equal(C(k).probeStdin.formatDuration, null, `${k} stdin format duration`); assert.equal(C(k).probeStdin.streamDuration, null, `${k} stdin stream duration`); }
  }
});

t('-write_bext 1 adds a bext chunk and makes the header longer, and does not fix the sizes: the pipe still carries placeholders', () => {
  const b = C('bext_pipe'), p = C('pipe');
  assert.ok(b.chunks.includes('bext')); assert.ok(b.dataOffset > p.dataOffset, 'longer header');
  assert.equal(b.payloadEqualsFileAudio, true);
  if (isV6()) { assert.equal(b.dataOffset - p.dataOffset, 610); assert.equal(b.riffField, ALL); assert.equal(b.dataField, ALL); }
  assert.equal(b.decodeFileEqualsAudio, true);
  // relation: wherever the data size is not the true size, the bext flag did not repair it
  if (p.dataField !== p.payload) assert.notEqual(b.dataField, b.payload);
});

t('-rf64 always: written to a file the ds64 chunk holds the true sizes (riff 192106, data 192000, 48000 samples) and decodes fully; through a pipe the ds64 chunk is zero and the decoder trusts it', () => {
  const f = C('rf64_file'), p = C('rf64_pipe');
  assert.equal(f.kind, 'rf64'); assert.equal(f.magic, 'RF64'); assert.equal(f.ds64.data, 192000); assert.equal(f.ds64.samples, 48000); assert.equal(f.ds64.riff, f.bytes - 8);
  assert.equal(f.decodeFileEqualsAudio, true); assert.equal(f.decodeStdinEqualsAudio, true); near(f.probeStdin.formatDuration, 1, 1e-6);
  assert.equal(p.kind, 'rf64'); assert.ok(p.chunks.includes('ds64'));
  // relation on any build: ffmpeg decodes exactly the number of bytes the ds64 chunk states, when it is not the real size
  if (p.ds64.data !== p.payload) assert.equal(p.decodeFileBytes, p.ds64.data);
  if (isV6()) {
    assert.deepEqual(p.ds64, {riff: 0, data: 0, samples: 0}); assert.equal(p.decodeFileBytes, 0); assert.equal(p.decodeStdinBytes, 0); assert.equal(p.naiveSeconds, 0);
  }
});

t('-f w64: a file is fine (64 bit sizes, 1 s); through a pipe the data size is the placeholder 0x7fffffffffffffff and ffprobe refuses the capture; patching the two 64 bit fields makes it readable', () => {
  const f = C('w64_file'), p = C('w64_pipe'), x = C('w64_patched');
  assert.equal(f.kind, 'w64'); assert.equal(f.naiveSeconds, 1); assert.equal(f.decodeFileEqualsAudio, true); near(f.probeFile.formatDuration, 1, 1e-6);
  assert.equal(p.kind, 'w64'); assert.equal(p.payloadEqualsFileAudio, true);
  if (isV6()) {
    assert.equal(p.riffHex, '0xffffffffffffffff'); assert.equal(p.dataHex, '0x7fffffffffffffff');
    assert.equal(p.probeFile.ok, false); assert.equal(p.probeStdin.ok, false); assert.equal(p.decodeFileBytes, 0);
  }
  // relation on any build: a capture whose data size is not the true size and which the reader refuses is repaired by writing the true sizes
  if (p.dataHex !== f.dataHex) assert.equal(x.decodeFileEqualsAudio, true);
  assert.equal(x.dataHex, f.dataHex); assert.equal(x.riffHex, f.riffHex); assert.equal(x.naiveSeconds, 1); assert.equal(x.decodeStdinEqualsAudio, true);
});

t('fix one: patching the two size fields in Node after the last byte arrives gives a capture identical to what ffmpeg writes to a file, byte for byte', () => {
  const x = C('patched');
  assert.equal(ev.patchedEqualsFile, true);
  assert.equal(x.riffField, x.bytes - 8); assert.equal(x.dataField, 192000); assert.equal(x.naiveSeconds, 1);
  assert.equal(x.decodeFileEqualsAudio, true); near(x.probeFile.formatDuration, 1, 1e-6);
});

t('fix two: pipe raw s16le and write the 44 byte header yourself when the length is known in advance; the header is true, the audio is identical, a size trusting player computes 1 s', () => {
  const r = C('raw_hdr');
  assert.equal(r.dataOffset, 44); assert.deepEqual(r.chunks, ['fmt ', 'data']); assert.equal(r.riffField, 36 + 192000); assert.equal(r.dataField, 192000);
  assert.equal(r.naiveSeconds, 1); assert.equal(r.payloadEqualsFileAudio, true); assert.equal(r.decodeFileEqualsAudio, true); assert.equal(r.decodeStdinEqualsAudio, true);
  near(r.probeFile.formatDuration, 1, 1e-6);
  assert.equal(r.bytes, ev.rawBytes + 44);
});

t('a true header always decodes fully, but a full decode does not prove a true header: the pipe decodes all 192000 bytes with a placeholder header, and six of the ten captures carry true sizes', () => {
  const rows = Object.entries(ev.cases).map(([k, c]) => ({k, decodesAll: c.decodeFileEqualsAudio, sizeTrue: c.dataField !== null && c.claimedBytes === c.payload && c.naiveSeconds === 1}));
  for (const r of rows) if (r.sizeTrue) assert.equal(r.decodesAll, true, `${r.k}: a true header decodes fully`);
  // the pipe decodes fully without a true header: forgiving decoders and honest headers are different things
  const pipe = rows.find((r) => r.k === 'pipe');
  if (isV6()) { assert.equal(pipe.decodesAll, true); assert.equal(pipe.sizeTrue, false); }
  assert.ok(rows.filter((r) => r.sizeTrue).length >= 5, 'file, rf64_file, w64_file, raw_hdr, patched, w64_patched');
  assert.equal(rows.length, 10);
});
