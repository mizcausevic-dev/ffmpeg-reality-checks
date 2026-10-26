// Episode 51 fixture: "mov_text subtitles: why does -c copy to MKV fail or change?"
// Synthetic source only (lavfi): 5 s of a flat video (96x72, 25 fps, x264), a 440 Hz tone (pcm_s16le), and three subtitle cues written by Node as an srt file:
//   cue one alpha 0.500 to 1.734   cue two <i>bravo</i> 2.000 to 3.456   cue three charlie 3.500 to 4.000
// Two sources: srcmp4 (subtitle stored as mov_text) and srcmkv (the same cues stored as subrip). Cases:
//   mov      srcmp4 -> .mov   -c copy                     control: the same subtitle family, one to one
//   remux    srcmkv -> .mkv   -c copy                     control: subrip stays subrip
//   copy     srcmp4 -> .mkv   -c copy                     the question
//   asSrt    srcmp4 -> .mkv   -c copy -c:s srt
//   asAss    srcmp4 -> .mkv   -c copy -c:s ass
//   plain    srcmp4 -> .mkv   with no codec option at all
//   drop     srcmp4 -> .mkv   -map 0:v -map 0:a -c copy   (subtitle left out)
//   toMp4    srcmkv -> .mp4   -c copy                     the other way round
//   toMp4Txt srcmkv -> .mp4   -c copy -c:s mov_text
// Readers (each output is read two independent ways):
//   what is in it   reader 1 = ffprobe stream list and subtitle packets; reader 2 = the raw bytes in Node (container codec ids tx3g, S_TEXT/UTF8, S_TEXT/ASS, and the cue text itself)
//   when each cue   reader 1 = ffprobe subtitle packet times (non-empty packets); reader 2 = ffmpeg decoding the subtitle back to srt (-f srt), parsed in Node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const CUES = [
  {text: 'cue one alpha', start: 0.5, end: 1.734},
  {text: 'cue two <i>bravo</i>', start: 2.0, end: 3.456},
  {text: 'cue three charlie', start: 3.5, end: 4.0},
];
export const WORDS = ['cue one alpha', 'cue two ', 'bravo', 'cue three charlie'];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const fmt = (s) => { const ms = Math.round(s * 1000); const p = (n, w) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor(ms / 60000) % 60, 2)}:${p(Math.floor(ms / 1000) % 60, 2)},${p(ms % 1000, 3)}`; };
export const srtText = (cues = CUES) => cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join('\n');
export function parseSrt(text) {
  const out = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const l = block.split('\n').filter((x) => x.length);
    const i = l.findIndex((x) => x.includes('-->'));
    if (i < 0) continue;
    const m = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/.exec(l[i]);
    const t = (a, b, c, d) => Number(a) * 3600 + Number(b) * 60 + Number(c) + Number(d) / 1000;
    out.push({start: t(m[1], m[2], m[3], m[4]), end: t(m[5], m[6], m[7], m[8]), text: l.slice(i + 1).join('\n')});
  }
  return out;
}

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 26, ...opts});
const ffm = (args) => { const r = run('ffmpeg', ['-v', 'error', '-y', ...args]); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); return r; };
const ms = (v) => Math.round(v * 1000) / 1000;

export function makeSources(dir) {
  const srt = path.join(dir, 'cues.srt');
  fs.writeFileSync(srt, srtText());
  const base = ['-f', 'lavfi', '-i', 'color=c=black:s=96x72:r=25:d=5', '-f', 'lavfi', '-i', 'sine=f=440:r=44100:d=5', '-i', srt, '-map', '0', '-map', '1', '-map', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-t', '5'];
  const srcmp4 = path.join(dir, 'srcmp4.mp4'), srcmkv = path.join(dir, 'srcmkv.mkv');
  ffm([...base, '-c:s', 'mov_text', srcmp4]);
  ffm([...base, '-c:s', 'srt', srcmkv]);
  return {srcmp4, srcmkv};
}

export const CASES = {
  mov: {src: 'srcmp4', ext: 'mov', args: ['-map', '0', '-c', 'copy'], command: 'ffmpeg -i in.mp4 -map 0 -c copy out.mov'},
  remux: {src: 'srcmkv', ext: 'mkv', args: ['-map', '0', '-c', 'copy'], command: 'ffmpeg -i in.mkv -map 0 -c copy out.mkv'},
  copy: {src: 'srcmp4', ext: 'mkv', args: ['-map', '0', '-c', 'copy'], command: 'ffmpeg -i in.mp4 -map 0 -c copy out.mkv'},
  asSrt: {src: 'srcmp4', ext: 'mkv', args: ['-map', '0', '-c', 'copy', '-c:s', 'srt'], command: 'ffmpeg -i in.mp4 -map 0 -c copy -c:s srt out.mkv'},
  asAss: {src: 'srcmp4', ext: 'mkv', args: ['-map', '0', '-c', 'copy', '-c:s', 'ass'], command: 'ffmpeg -i in.mp4 -map 0 -c copy -c:s ass out.mkv'},
  plain: {src: 'srcmp4', ext: 'mkv', args: ['-map', '0'], command: 'ffmpeg -i in.mp4 -map 0 out.mkv'},
  drop: {src: 'srcmp4', ext: 'mkv', args: ['-map', '0:v', '-map', '0:a', '-c', 'copy'], command: 'ffmpeg -i in.mp4 -map 0:v -map 0:a -c copy out.mkv'},
  toMp4: {src: 'srcmkv', ext: 'mp4', args: ['-map', '0', '-c', 'copy'], command: 'ffmpeg -i in.mkv -map 0 -c copy out.mp4'},
  toMp4Txt: {src: 'srcmkv', ext: 'mp4', args: ['-map', '0', '-c', 'copy', '-c:s', 'mov_text'], command: 'ffmpeg -i in.mkv -map 0 -c copy -c:s mov_text out.mp4'},
};

// ---- reader 1: ffprobe ----
export function probeStreams(file) {
  if (!fs.existsSync(file)) return {streams: [], error: 'no file'};
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name', '-of', 'json', file]);
  if (r.status !== 0) return {streams: [], error: r.stderr.split('\n')[0]};
  let j; try { j = JSON.parse(r.stdout); } catch { return {streams: [], error: 'unreadable'}; }
  return {streams: (j.streams ?? []).map((s) => ({type: s.codec_type, codec: s.codec_name})), error: null};
}
export function subPackets(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 's:0', '-show_entries', 'packet=pts_time,duration_time,size', '-of', 'csv=p=0', file]);
  if (r.status !== 0) return [];
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => { const [p, d, s] = l.split(',').map(Number); return {start: ms(p), end: ms(p + d), size: s}; }).sort((a, b) => a.start - b.start);
}
// ---- reader 2: raw bytes, and the subtitle decoded back to srt ----
export function byteFacts(file) {
  if (!fs.existsSync(file)) return {bytes: 0, tx3g: false, srtId: false, assId: false, words: 0, italicHtml: false, italicAss: false, styl: false};
  const b = fs.readFileSync(file);
  const has = (s) => b.indexOf(s, 0, 'latin1') >= 0;
  return {bytes: b.length, tx3g: has('tx3g'), srtId: has('S_TEXT/UTF8'), assId: has('S_TEXT/ASS'),
    words: ['cue one alpha', 'cue two ', 'bravo', 'cue three charlie'].filter(has).length,
    italicHtml: has('<i>bravo</i>'), italicAss: has('{\\i1}bravo'), styl: has('styl')};
}
export function decodedCues(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:s:0', '-f', 'srt', '-']);
  if (r.status !== 0) return [];
  return parseSrt(r.stdout);
}
const sameTimes = (a, b, tol = 0.002) => a.length === b.length && a.every((c, i) => Math.abs(c.start - b[i].start) <= tol && Math.abs(c.end - b[i].end) <= tol);
export const timesMatchSource = (cues) => sameTimes(cues, CUES);

export function measure(file) {
  const ps = probeStreams(file), pk = subPackets(file), bf = byteFacts(file), dc = decodedCues(file);
  const cuePk = pk.filter((p) => p.size > 2);
  return {
    exists: fs.existsSync(file), bytes: bf.bytes,
    probe: {error: ps.error, streams: ps.streams.map((s) => `${s.type}:${s.codec}`), nStreams: ps.streams.length, subCodec: ps.streams.find((s) => s.type === 'subtitle')?.codec ?? null,
      packets: pk.length, emptyPackets: pk.length - cuePk.length, cues: cuePk.map((p) => ({start: p.start, end: p.end})), timesMatch: timesMatchSource(cuePk)},
    bytesRead: bf,
    decoded: {cues: dc.length, timesMatch: timesMatchSource(dc), italic: dc.some((c) => /<i>bravo<\/i>/.test(c.text)), texts: dc.map((c) => c.text)},
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSources(dir);
  const ev = {ffmpeg: ffmpegVersion(), cues: CUES.length, srcmp4: measure(src.srcmp4), srcmkv: measure(src.srcmkv), runs: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const out = path.join(dir, `${name}.${c.ext}`);
    const r = run('ffmpeg', ['-v', 'error', '-y', '-i', src[c.src], ...c.args, out]);
    ev.runs[name] = {command: c.command, src: c.src, ext: c.ext, status: r.status, stderrLines: r.stderr.split(/\r?\n/).filter(Boolean).length, ...measure(out)};
  }
  return ev;
}
