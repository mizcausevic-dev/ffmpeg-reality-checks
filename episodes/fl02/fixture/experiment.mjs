// fl02 "Gapless audio": one question, four source films re-run live, one new composite check.
// Question: where does my audio really start and end after an encode, a join or a cut, and who tells the decoder?
// Sources (imported, re-run here, no number is copied): ff08 (AAC join), ff46 (mp4 edit list, -itsoffset), ff78 (MP3 delay), ff79 (Opus pre-skip).
// New in this film:
//   bridge  the AAC priming of ff08 is an mp4 edit list (the thing ff46 moves audio with): read it in the bytes, then decode with the edit list ignored
//   recipe  two AAC files with clicks 100 samples from the start and 100 samples before the end (file A amplitude 24000, file B 12000).
//           The seam between the last click of A and the first click of B must be 200 samples.
//           Cases: wav join through pcm (control, exact), -c copy join (known positive), decode-and-re-encode join, trimmed re-encode join (the recipe).
//   Readers  1: the decoder (Node finds the clicks in the decoded samples)   2: Node on the mp4 bytes (edit list, sample table)   3: ffprobe (packets, duration)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';
import {runExperiment as run08} from '../../ff08/fixture/experiment.mjs';
import {runExperiment as run46, mp4Tracks} from '../../ff46/fixture/experiment.mjs';
import {runExperiment as run78, writeWav, peaksOf, buildOf as buildOf78} from '../../ff78/fixture/experiment.mjs';
import {runExperiment as run79, PACKET as OPUS_PACKET, SR as OPUS_RATE} from '../../ff79/fixture/experiment.mjs';

export const buildOf = buildOf78;
export const AAC = {rate: 44100, valid: 88200, clickEarly: 100, clickLate: 88100, ampA: 24000, ampB: 12000, bitrate: '128k', seamWanted: 200, thr: 6000};
export {mp4Tracks, peaksOf};

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
export function decodeS16(file, extra = []) {
  const b = ffm([...extra, '-i', file, '-f', 's16le', '-ac', '1', '-'], {}).stdout;
  return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const probeNum = (args, file) => Number(run('ffprobe', ['-v', 'error', ...args, file]).trim().split(/\r?\n/)[0]);
export const probeDuration = (f) => probeNum(['-show_entries', 'format=duration', '-of', 'csv=p=0'], f);
export const probePackets = (f) => probeNum(['-select_streams', 'a:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0'], f);

// reader 2 helper: number of samples in the mp4 sample table (stts), straight from the bytes
export function mp4SampleCount(buf) {
  let total = 0;
  const walk = (s, e) => {
    let p = s;
    while (p + 8 <= e) {
      let sz = buf.readUInt32BE(p); const t = buf.toString('latin1', p + 4, p + 8);
      if (sz === 0) sz = e - p;
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(t)) walk(p + 8, p + sz);
      else if (t === 'stts') { const n = buf.readUInt32BE(p + 12); for (let i = 0; i < n; i++) total += buf.readUInt32BE(p + 16 + 8 * i); }
      p += sz;
    }
  };
  walk(0, buf.length);
  return total;
}

// ---------- the clicks and the seam ----------
export function clickWavs(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const mk = (name, amp) => {
    const s = new Int16Array(AAC.valid); s[AAC.clickEarly] = amp; s[AAC.clickLate] = amp;
    const f = path.join(dir, `${name}.wav`); writeWav(f, s); return f;
  };
  return {a: mk('a', AAC.ampA), b: mk('b', AAC.ampB)};
}
// reader 1: where are the clicks in the decoded file, and how far apart are the last click of A and the first click of B
export function seamOf(file, extra = []) {
  const x = decodeS16(file, extra), pk = peaksOf(x, AAC.thr);
  const clicks = pk.map((p) => p.index), amps = pk.map((p) => p.value);
  return {samples: x.length, clicks, amps, count: clicks.length, firstClick: clicks[0], seamGap: clicks.length === 4 ? clicks[2] - clicks[1] : null, orderOk: clicks.length === 4 && amps[0] > amps[2] && amps[1] > amps[3]};
}
// reader 2 and 3: the bytes of an mp4 / m4a and ffprobe
export function containerOf(file) {
  const buf = fs.readFileSync(file), t = mp4Tracks(buf)[0], n = mp4SampleCount(buf);
  const e = t.edits[0];
  return {editCount: t.edits.length, editMs: e.dur, mediaTime: e.media, skip: t.skipUnits, sampleCount: n, predictedDecode: n * 1024 - t.skipUnits, editSamples: Math.round((e.dur * AAC.rate) / 1000),
    ffprobePackets: probePackets(file), ffprobeDuration: probeDuration(file)};
}
const encodeAac = (src, out) => { ffm(['-i', src, '-c:a', 'aac', '-b:a', AAC.bitrate, out]); return out; };
const concatList = (dir, names) => { const f = path.join(dir, 'list.txt'); fs.writeFileSync(f, names.map((n) => `file '${n}'\n`).join('')); return f; };

export const RECIPE_ARGS = (durA, durB) => ['-i', 'a.m4a', '-i', 'b.m4a', '-filter_complex', `[0:a]atrim=duration=${durA}[x];[1:a]atrim=duration=${durB}[y];[x][y]concat=n=2:v=0:a=1`, '-c:a', 'aac', '-b:a', AAC.bitrate, 'join.m4a'];
export const NOTRIM_ARGS = ['-i', 'a.m4a', '-i', 'b.m4a', '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1', '-c:a', 'aac', '-b:a', AAC.bitrate, 'join.m4a'];
export const COPY_ARGS = ['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'join.m4a'];

export function runRecipe(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const w = clickWavs(dir);
  const a = encodeAac(w.a, path.join(dir, 'a.m4a')), b = encodeAac(w.b, path.join(dir, 'b.m4a'));
  concatList(dir, ['a.m4a', 'b.m4a']);
  const out = {source: {...AAC}};
  // single files: the clicks are where they were put, the file has the padding after the last click
  out.single = {a: {...seamOf(a), ...containerOf(a)}};
  out.single.a.padding = out.single.a.samples - AAC.valid;
  out.durations = {a: probeDuration(a), b: probeDuration(b)};
  const cmd = (args) => `ffmpeg ${args.join(' ')}`;
  const sh = (args, cwd = dir) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {cwd, maxBuffer: 1 << 28}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${r.stderr}`); };
  const measure = (name, args, extra = {}) => {
    sh(args); const f = path.join(dir, 'join.m4a'), keep = path.join(dir, `${name}.m4a`);
    fs.renameSync(f, keep);
    return {name, command: cmd(args), ...seamOf(keep), ...containerOf(keep), ...extra};
  };
  // control: the same graph on the two wavs, written as pcm: no codec, every sample is where it was put
  sh(['-i', 'a.wav', '-i', 'b.wav', '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1', '-c:a', 'pcm_s16le', 'ctl.wav']);
  out.control = {command: 'ffmpeg -i a.wav -i b.wav -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -c:a pcm_s16le ctl.wav', ...seamOf(path.join(dir, 'ctl.wav'))};
  out.copy = measure('copy', COPY_ARGS);
  out.notrim = measure('notrim', NOTRIM_ARGS);
  out.recipe = measure('recipe', RECIPE_ARGS(out.durations.a, out.durations.b));
  out.recipe.command = `ffmpeg -i a.m4a -i b.m4a -filter_complex "[0:a]atrim=duration=${out.durations.a}[x];[1:a]atrim=duration=${out.durations.b}[y];[x][y]concat=n=2:v=0:a=1" -c:a aac -b:a ${AAC.bitrate} join.m4a`;
  out.notrim.command = 'ffmpeg -i a.m4a -i b.m4a -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" -c:a aac -b:a 128k join.m4a';
  out.copy.command = 'ffmpeg -f concat -safe 0 -i list.txt -c copy join.m4a';
  // what the bytes alone predict for the seam of the copy join: the first file contributes packets x 1024 samples, of which the clicks span (valid - 2 x 100)
  const pa = out.single.a;
  out.copy.predictedSeamGap = AAC.seamWanted + (pa.sampleCount * 1024 - AAC.valid);
  out.copy.extraVsAsked = out.copy.samples - 2 * AAC.valid;
  out.recipe.extraVsAsked = out.recipe.samples - 2 * AAC.valid;
  out.notrim.extraVsAsked = out.notrim.samples - 2 * AAC.valid;
  return out;
}

// ---------- the bridge: ff08's priming is an mp4 edit list ----------
export function runBridge(dir08) {
  const a = path.join(dir08, 'a.m4a'), join = path.join(dir08, 'join.m4a');
  const buf = (f) => fs.readFileSync(f);
  const ta = mp4Tracks(buf(a))[0], tj = mp4Tracks(buf(join))[0];
  const ignored = decodeS16(a, ['-ignore_editlist', '1']).length, honoured = decodeS16(a).length;
  return {
    single: {editCount: ta.edits.length, editMs: ta.edits[0].dur, mediaTime: ta.edits[0].media, timescale: ta.mdts, sampleCount: mp4SampleCount(buf(a)), decodedHonoured: honoured, decodedIgnored: ignored, ignoredMinusHonoured: ignored - honoured},
    join: {editCount: tj.edits.length, editMs: tj.edits[0].dur, mediaTime: tj.edits[0].media, sampleCount: mp4SampleCount(buf(join))},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion()};
  ev.ff08 = run08(path.join(dir, 'ff08'));
  ev.ff46 = run46(path.join(dir, 'ff46'));
  ev.ff78 = run78(path.join(dir, 'ff78'));
  ev.ff79 = run79(path.join(dir, 'ff79'));
  ev.bridge = runBridge(path.join(dir, 'ff08'));
  ev.recipe = runRecipe(path.join(dir, 'recipe'));
  ev.facts = facts(ev);
  return ev;
}

// derived numbers that the film speaks (all computed here from measured values)
export function facts(ev) {
  const e08 = ev.ff08, e78 = ev.ff78, e79 = ev.ff79, e46 = ev.ff46, rc = ev.recipe;
  const raw = e78.encodes.imp_cbr_raw, tag = e78.encodes.imp_cbr_tag;
  const ms = (n, rate) => Math.round((n / rate) * 1000 * 10) / 10;
  return {
    aacExtraMs: ms(e08.accounting.joinMinusValid, 44100),
    aacSeamExtra: rc.copy.seamGap - AAC.seamWanted,
    aacSeamPrimingPlusPadding: e08.accounting.primingPerFile + e08.accounting.paddingPerFile,
    seamCopyMs: ms(rc.copy.seamGap, 44100), seamWantedMs: ms(AAC.seamWanted, 44100), seamNotrimMs: ms(rc.notrim.seamGap, 44100),
    // what the decoder removes beyond the header delay: the late impulse minus the tagged one, minus the delay (measured, not assumed)
    mp3DecoderExtra: raw.shift - tag.shift - tag.mp3.delay,
    mp3Skip: tag.mp3.delay + (raw.shift - tag.shift - tag.mp3.delay), mp3Trim: tag.mp3.padding - 529, mp3Frames: tag.mp3.audioFrames,
    mp3RawExtra: raw.samples - 44100,
    mp3CutDrop: e78.cuts.copyBefore5.mp3.delay + (raw.shift - tag.shift - tag.mp3.delay),
    seamCopyMsRound: Math.round((rc.copy.seamGap / 44100) * 1000),
    opusPacketSamples: OPUS_PACKET, opusPacketMs: Math.round((OPUS_PACKET / OPUS_RATE) * 1000),
    opusPreSkipMs: Math.round((e79.encodes.ogg.head.preSkip / 48) * 10) / 10,
    opusLate0: e79.patched.ogg_0.click - 4800, opusEarly1000: 4800 - e79.patched.ogg_1000.click,
    mp4SkipEdit: e46.runs['mp4.aMinus'].bytes.audioSkipUnits,
    mp4DecodedMinus: e46.runs['mp4.aMinus'].audio.samples,
  };
}
export {run08, run46, run78, run79};
