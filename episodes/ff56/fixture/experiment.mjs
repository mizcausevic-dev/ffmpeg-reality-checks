// Episode 56 fixture: "-map 0 into MP4: which streams make it fail?"
// Synthetic input only. A 2 s, 96x72, 25 fps h264 video, and one extra stream of each type, all muxed into mkv:
//   audio: aac, opus, flac, pcm_s16le, vorbis (a 440 Hz sine, 2 s)      still picture: a one frame mjpeg cover (attached_pic)
//   text subtitles: subrip, ass, webvtt (two cues, "hello one" and "hello two")      attachment: 32 synthetic bytes labelled as a ttf font (not a real font)
// Each single-type source holds the video plus that one stream (2 streams). Then `-map 0 -c copy` into mp4.
// Cases:
//   one.<type>   video + that stream, ffmpeg -i src -map 0 -c copy out.mp4   (10 types)
//   good         control: video + all five audio codecs + cover, -map 0 -c copy
//   mix          one source with video, five audio, subrip and the font attachment (8 streams), then
//                  all           -map 0 -c copy
//                  movtext       -map 0 -c copy -c:s mov_text
//                  nosub         -map 0 -sn -c copy
//                  notach        -map 0 -map -0:t -c copy
//                  fixed         -map 0 -map -0:t -c copy -c:s mov_text
//                  explicit      -map 0:v -map 0:a -c copy
//   fix.<type>   the fix for each failing type: -c:s mov_text for subtitles, -map -0:t for the attachment
//   nocopy.<type> the same source with -map 0 and no -c copy (subrip and ttf only)
// Readers:
//   reader 1  ffprobe: the stream list of the source and of the output (codec_type, codec_name), and whether the output opens at all
//   reader 2  the mp4 file read in Node: is there a moov box, then each trak's handler type (vide, soun, sbtl...) and sample entry fourcc (avc1, mp4a, Opus...),
//             plus, for subtitles, a byte search of the file for the cue text
//   video     framemd5 of the first video stream of every successful output equals the source's (the copy kept the frames)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, SECONDS = 2;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const CUES = ['hello one', 'hello two'];

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, ...opts});
const ffm = (args) => {
  const r = run('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const SRT = '1\n00:00:00,000 --> 00:00:01,000\nhello one\n\n2\n00:00:01,000 --> 00:00:02,000\nhello two\n\n';

// kind: what ffprobe calls it. codec: the name ffprobe prints for the stream in the mkv source.
export const TYPES = [
  {id: 'aac', kind: 'audio', enc: 'aac', codec: 'aac'},
  {id: 'opus', kind: 'audio', enc: 'libopus', codec: 'opus'},
  {id: 'flac', kind: 'audio', enc: 'flac', codec: 'flac'},
  {id: 'pcm', kind: 'audio', enc: 'pcm_s16le', codec: 'pcm_s16le'},
  {id: 'vorbis', kind: 'audio', enc: 'libvorbis', codec: 'vorbis'},
  {id: 'cover', kind: 'video', codec: 'mjpeg'},
  {id: 'subrip', kind: 'subtitle', enc: 'srt', codec: 'subrip'},
  {id: 'ass', kind: 'subtitle', enc: 'ass', codec: 'ass'},
  {id: 'webvtt', kind: 'subtitle', enc: 'webvtt', codec: 'webvtt'},
  {id: 'ttf', kind: 'attachment', codec: 'ttf'},
];
export const AUDIO = TYPES.filter((x) => x.kind === 'audio');
export const SUBS = TYPES.filter((x) => x.kind === 'subtitle');

export function makeSources(dir) {
  const p = (n) => path.join(dir, n);
  fs.writeFileSync(p('cues.srt'), SRT);
  fs.writeFileSync(p('blob.ttf'), 'synthetic bytes, not a real font');
  ffm(['-f', 'lavfi', '-i', `color=c=gray:s=${W}x${H}:r=${FPS}:d=${SECONDS}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', p('base.mkv')]);
  ffm(['-f', 'lavfi', '-i', `color=c=red:s=${W}x${H}:r=1:d=1`, '-frames:v', '1', p('cover.jpg')]);
  const sine = (i) => ['-f', 'lavfi', '-i', `sine=f=${440 + 110 * i}:r=48000:d=${SECONDS}`];
  const attach = ['-attach', p('blob.ttf'), '-metadata:s:t', 'mimetype=application/x-truetype-font', '-metadata:s:t', 'filename=blob.ttf'];
  TYPES.forEach((ty, k) => {
    const out = p(`src_${ty.id}.mkv`);
    if (ty.kind === 'audio') ffm(['-i', p('base.mkv'), ...sine(k), '-map', '0', '-map', '1', '-c:v', 'copy', '-c:a', ty.enc, out]);
    else if (ty.id === 'cover') ffm(['-i', p('base.mkv'), '-i', p('cover.jpg'), '-map', '0', '-map', '1', '-c', 'copy', '-disposition:v:1', 'attached_pic', out]);
    else if (ty.kind === 'subtitle') ffm(['-i', p('base.mkv'), '-i', p('cues.srt'), '-map', '0', '-map', '1', '-c:v', 'copy', '-c:s', ty.enc, out]);
    else ffm(['-i', p('base.mkv'), '-map', '0', '-c', 'copy', ...attach, out]);
  });
  // good: video + five audio + cover
  const ins = [];
  AUDIO.forEach((ty, i) => ins.push(...sine(i)));
  ffm(['-i', p('base.mkv'), ...ins, '-i', p('cover.jpg'), '-map', '0', ...AUDIO.flatMap((ty, i) => ['-map', String(i + 1)]), '-map', String(AUDIO.length + 1),
    '-c:v', 'copy', ...AUDIO.flatMap((ty, i) => [`-c:a:${i}`, ty.enc]), '-disposition:v:1', 'attached_pic', p('good.mkv')]);
  // mix: video + five audio + subrip + attachment
  ffm(['-i', p('base.mkv'), ...ins, '-i', p('cues.srt'), '-map', '0', ...AUDIO.flatMap((ty, i) => ['-map', String(i + 1)]), '-map', String(AUDIO.length + 1),
    '-c:v', 'copy', ...AUDIO.flatMap((ty, i) => [`-c:a:${i}`, ty.enc]), '-c:s', 'srt', ...attach, p('mix.mkv')]);
  return p;
}

// ---- reader 1: ffprobe ----
export function streamList(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout).streams.map((s) => ({type: s.codec_type, codec: s.codec_name})); } catch { return null; }
}
// ---- reader 2: the mp4 bytes ----
export function boxes(buf, start = 0, end = buf.length) {
  const out = []; let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p); const type = buf.toString('latin1', p + 4, p + 8); let hdr = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) break;
    out.push({type, start: p + hdr, end: p + size}); p += size;
  }
  return out;
}
const kid = (buf, b, type) => boxes(buf, b.start, b.end).find((x) => x.type === type);
export function mp4Tracks(file) {
  if (!fs.existsSync(file)) return {exists: false, size: 0, moov: false, tracks: []};
  const buf = fs.readFileSync(file);
  const moov = boxes(buf).find((b) => b.type === 'moov');
  if (!moov) return {exists: true, size: buf.length, moov: false, tracks: []};
  const tracks = boxes(buf, moov.start, moov.end).filter((b) => b.type === 'trak').map((trak) => {
    const mdia = kid(buf, trak, 'mdia');
    const hdlr = kid(buf, mdia, 'hdlr');
    const stsd = kid(buf, kid(buf, kid(buf, mdia, 'minf'), 'stbl'), 'stsd');
    return {handler: buf.toString('latin1', hdlr.start + 8, hdlr.start + 12), fourcc: buf.toString('latin1', stsd.start + 12, stsd.start + 16)};
  });
  return {exists: true, size: buf.length, moov: true, tracks, buf};
}
export const kindOfHandler = (h) => (h === 'vide' ? 'video' : h === 'soun' ? 'audio' : ['sbtl', 'text', 'subt'].includes(h) ? 'subtitle' : h);
export const hasText = (buf, text) => !!buf && buf.indexOf(Buffer.from(text, 'utf8')) >= 0;

export function videoMd5(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return null;
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}
export function srtText(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:s:0', '-f', 'srt', '-'], {encoding: 'utf8'});
  return r.status === 0 ? r.stdout : null;
}

const countBy = (xs, f) => xs.reduce((a, x) => { const k = f(x); a[k] = (a[k] ?? 0) + 1; return a; }, {});
// run one attempt: ffmpeg -i src <args> out.mp4
export function attempt(dir, name, src, args, srcMd5) {
  const out = path.join(dir, `${name}.mp4`);
  if (fs.existsSync(out)) fs.rmSync(out);
  const r = run('ffmpeg', ['-v', 'error', '-y', '-i', src, ...args, out], {encoding: 'utf8'});
  const probe = streamList(out), box = mp4Tracks(out);
  const errLines = String(r.stderr ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const first = errLines.find((l) => /Could not find tag|not supported|Encoder not found|Automatic encoder selection|Unsupported|Invalid/i.test(l)) ?? errLines[0] ?? '';
  const ok = r.status === 0;
  const res = {
    name, command: `ffmpeg -i ${path.basename(src).replace(/^src_/, 'src.')} ${args.join(' ')} out.mp4`.replace(/ +/g, ' '),
    status: r.status, ok, firstError: first.replace(/\[[^\]]*\] /, '').replace(/#0\/\w+ @ 0x[0-9a-f]+\]? ?/, ''),
    exists: box.exists, size: box.size, moov: box.moov,
    probeStreams: probe, probeOpens: probe !== null, probeCount: probe ? probe.length : 0,
    boxTracks: box.tracks.map((t) => ({kind: kindOfHandler(t.handler), handler: t.handler, fourcc: t.fourcc})), boxCount: box.tracks.length,
  };
  res.boxKinds = countBy(res.boxTracks, (t) => t.kind); res.probeKinds = countBy(probe ?? [], (s) => s.type);
  if (ok && srcMd5) { const m = videoMd5(out); res.videoSame = !!m && m.length === srcMd5.length && m.every((h, i) => h === srcMd5[i]); }
  if (ok && box.moov) { res.cueBytes = CUES.map((c) => hasText(box.buf, c)); }
  return res;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const p = makeSources(dir);
  const srcMd5 = videoMd5(p('base.mkv'));
  const ev = {ffmpeg: ffmpegVersion(), sources: {}, runs: {}};
  const srcFile = (id) => p(`src_${id}.mkv`);
  for (const ty of TYPES) ev.sources[ty.id] = streamList(srcFile(ty.id));
  ev.sources.good = streamList(p('good.mkv')); ev.sources.mix = streamList(p('mix.mkv'));
  ev.baseFrames = srcMd5.length;
  const go = (name, src, args) => { ev.runs[name] = attempt(dir, name.replace(/\./g, '_'), src, args, srcMd5); };
  for (const ty of TYPES) go(`one.${ty.id}`, srcFile(ty.id), ['-map', '0', '-c', 'copy']);
  go('good', p('good.mkv'), ['-map', '0', '-c', 'copy']);
  go('mix.all', p('mix.mkv'), ['-map', '0', '-c', 'copy']);
  go('mix.movtext', p('mix.mkv'), ['-map', '0', '-c', 'copy', '-c:s', 'mov_text']);
  go('mix.nosub', p('mix.mkv'), ['-map', '0', '-sn', '-c', 'copy']);
  go('mix.notach', p('mix.mkv'), ['-map', '0', '-map', '-0:t', '-c', 'copy']);
  go('mix.fixed', p('mix.mkv'), ['-map', '0', '-map', '-0:t', '-c', 'copy', '-c:s', 'mov_text']);
  go('mix.explicit', p('mix.mkv'), ['-map', '0:v', '-map', '0:a', '-c', 'copy']);
  for (const ty of SUBS) go(`fix.${ty.id}`, srcFile(ty.id), ['-map', '0', '-c', 'copy', '-c:s', 'mov_text']);
  go('fix.ttf', srcFile('ttf'), ['-map', '0', '-map', '-0:t', '-c', 'copy']);
  for (const id of ['aac', 'subrip', 'ttf']) go(`nocopy.${id}`, srcFile(id), ['-map', '0']);
  // text of the fixed subtitle, read by decoding with ffmpeg
  ev.fixedSrt = srtText(path.join(dir, 'mix_fixed.mp4'));
  return ev;
}
