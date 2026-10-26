// Episode 33 fixture: "I looped a clip with -stream_loop. Is the loop seamless, and is the length what I expect?"
// Synthetic sources only (lavfi): a 4 s clip at 30 fps (120 frames, 64x64 gray) where frame N is identified by its pixels,
// plus a mono audio ramp at 44100 Hz where sample n has the value n / 200000 (so every sample says where it came from).
// The audio is stored as 32 bit float PCM, the video as FFV1, in Matroska, so nothing is lossy.
//   frame code N = Y + 256 * ((Cb - 128) / 20)
// Four sources differ only in audio length: audio 4.0 s (equal to the picture), 3.97 s (30 ms shorter), 3.9 s (100 ms shorter), 4.1 s (100 ms longer). The picture is always 4.0 s.
// Every output is read back two independent ways:
//   picture   reader 1 frame md5 matched to the source   reader 2 decoded Y and Cb bytes
//   audio     reader 1 decoded ramp: where the ramp restarts, and the sample count   reader 2 ffprobe audio packets: pts of the first packet after each jump
//   time      reader 1 ffprobe video packets (pts, duration)   reader 2 framemd5 pts of the decoded frames
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const SIZE = 64, RATE = 44100, FPS = 30, SEC = 4, FRAMES = FPS * SEC;
export const SOURCES = {eq: 4.0, near: 3.97, short: 3.9, long: 4.1};     // audio seconds; the picture is 4.0 s in all four
const round3 = (x) => Math.round(x * 1000) / 1000;
const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

const loop = (src, mode, extra = []) => [src, ['-stream_loop', '2'], mode === 'copy' ? ['-c', 'copy'] : [], `ffmpeg -stream_loop 2 -i ${src}.mkv${mode === 'copy' ? ' -c copy' : ''} out.mkv`];
export const CASES = {
  // name: [source, input options, output options, command text]
  'eq-enc': loop('eq', 'enc'), 'eq-copy': loop('eq', 'copy'),
  'near-enc': loop('near', 'enc'), 'near-copy': loop('near', 'copy'),
  'short-enc': loop('short', 'enc'), 'short-copy': loop('short', 'copy'),
  'long-enc': loop('long', 'enc'), 'long-copy': loop('long', 'copy'),
  'eq-t25':    ['eq',    ['-stream_loop', '-1'], ['-t', '25'], 'ffmpeg -stream_loop -1 -i eq.mkv -t 25 out.mkv'],
  'short-t25': ['short', ['-stream_loop', '-1'], ['-t', '25'], 'ffmpeg -stream_loop -1 -i short.mkv -t 25 out.mkv'],
};
const ENC = ['-c:v', 'ffv1', '-c:a', 'pcm_f32le'];

// ---------- readers ----------
export function frameCodes(file) {                         // picture, reader 2: decoded Y byte and Cb byte of every frame
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-an', '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const size = SIZE * SIZE * 3 / 2, n = r.stdout.length / size, out = [];
  for (let i = 0; i < n; i++) out.push(r.stdout[i * size + 100] + 256 * Math.round((r.stdout[i * size + SIZE * SIZE + 10] - 128) / 20));
  return out;
}
function framemd5Rows(file) {                              // picture, reader 1 (md5) and time, reader 2 (pts)
  const out = run('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'framemd5', '-an', '-']);
  const tb = out.split(/\r?\n/).find((l) => l.startsWith('#tb 0:')).match(/(\d+)\/(\d+)/);
  const rows = out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return {rows, tb: Number(tb[1]) / Number(tb[2])};
}
export const frameMd5 = (file) => framemd5Rows(file).rows.map((r) => r[5]);
const framePts = (file) => { const {rows, tb} = framemd5Rows(file); return rows.map((r) => round3(Number(r[1]) * tb)); };

// time, reader 1: ffprobe packets of one stream, [{pts, dur}]
export function packets(file, stream) {
  return run('ffprobe', ['-v', 'error', '-select_streams', stream, '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => { const [p, d] = l.split(',').map(Number); return {pts: p, dur: Number.isFinite(d) ? d : 0}; });
}
// decoded mono float samples of the first audio stream
export function audioSamples(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-'], {maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  const n = r.stdout.length / 4, x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = r.stdout.readFloatLE(i * 4);
  return x;
}
// the ramp says which source sample each output sample is: s = round(value * 200000). Returns runs of consecutive source samples.
export function rampRuns(x) {
  const runs = []; let cur = null;
  for (let i = 0; i < x.length; i++) {
    const s = Math.round(x[i] * 200000);
    if (cur && s === cur.src + cur.len) cur.len++;
    else { cur = {out: i, src: s, len: 1}; runs.push(cur); }
  }
  return runs;
}
// decoded audio frames with their pts: [{pts, n}] (ffprobe -show_frames), used to turn a sample index into a time
function audioFrames(file) {
  return run('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=pts_time,nb_samples', '-of', 'csv=p=0', file])
    .split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((l) => { const [p, n] = l.split(',').map(Number); return {pts: p, n}; });
}
const timeOfSample = (frames, k) => { let c = 0; for (const f of frames) { if (k < c + f.n) return f.pts + (k - c) / RATE; c += f.n; } return NaN; };
const first = (a) => a[0], last = (a) => a[a.length - 1];

export function readOutput(file, srcMd5) {
  const vp = packets(file, 'v:0'), ap = packets(file, 'a:0');
  const md = framemd5Rows(file), pts = vp.map((p) => round3(p.pts)), ptsDecoded = framePts(file);
  const byMd5 = md.rows.map((r) => srcMd5.indexOf(r[5]));
  const byCode = frameCodes(file);
  const hasAudio = ap.length > 0;
  const x = hasAudio ? audioSamples(file) : new Float64Array(0), runs = rampRuns(x);
  // picture: the output frame index where each play starts (code goes back to a smaller value) and the source frames missing at the start of each play
  const aframes = hasAudio ? audioFrames(file) : [];
  const plays = [];
  byMd5.forEach((c, i) => { if (i === 0 || c <= byMd5[i - 1]) plays.push({at: i, firstCode: c, pts: pts[i]}); });
  const gaps = []; for (let i = 1; i < pts.length; i++) { const d = round3(pts[i] - pts[i - 1]); if (d > 0.05) gaps.push({after: pts[i - 1], gap: d}); }
  const res = {
    video: {packets: vp.length, framesDecoded: md.rows.length, endPackets: round3(last(vp).pts + last(vp).dur), endDecoded: round3((Number(last(md.rows)[1]) + Number(last(md.rows)[3])) * md.tb),
            firstPts: round3(first(vp).pts), ptsMonotonic: vp.every((p, i) => !i || p.pts > vp[i - 1].pts), ptsDecodedAgree: pts.length === ptsDecoded.length && pts.every((p, i) => Math.abs(p - ptsDecoded[i]) <= 0.02),
            plays, gaps, missingAtStart: plays.map((p) => p.firstCode)},
    audio: !hasAudio ? null : {gaps: ap.slice(1).map((p, i) => ({after: round3(ap[i].pts + ap[i].dur), gap: round3(p.pts - ap[i].pts - ap[i].dur)})).filter((g) => Math.abs(g.gap) > 0.01),
            starts: runs.slice(0, 12).map((r) => round3(timeOfSample(aframes, r.out))), packets: ap.length, endPackets: round3(last(ap).pts + last(ap).dur), samples: x.length, endDecoded: round3(x.length / RATE),
            runsCount: runs.length, runs: runs.slice(0, 12).map((r) => ({outSample: r.out, srcSample: r.src, len: r.len})), ptsMonotonic: ap.every((p, i) => !i || p.pts > ap[i - 1].pts)},
    byMd5, byCode,
    container: round3(Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim())),
  };
  // where does each play of the picture and of the sound start, as the time at which source second 0 would be shown or heard
  if (!hasAudio) return res;
  const pic = plays.map((p) => round3(p.pts - p.firstCode / FPS)), snd = runs.slice(0, 12).map((r, i) => round3(res.audio.starts[i] - r.src / RATE));
  res.sync = {picture: pic, sound: snd, offsetMs: snd.map((a, i) => Math.round((a - pic[i]) * 1000))};
  return res;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), source: {fps: FPS, seconds: SEC, frames: FRAMES, audioSeconds: SOURCES}, reads: {}, runs: {}};
  let srcMd5;
  for (const [name, aSec] of Object.entries(SOURCES)) {
    ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=${FPS}:d=${SEC},format=yuv420p,geq=lum='mod(N,256)':cb='128+floor(N/256)*20':cr=128`,
        '-f', 'lavfi', '-i', `aevalsrc=n/200000:s=${RATE}:d=${aSec}:c=mono`, ...ENC, `${name}.mkv`], dir);
    const md5 = frameMd5(path.join(dir, `${name}.mkv`));
    if (!srcMd5) srcMd5 = md5;
    out.reads[name] = readOutput(path.join(dir, `${name}.mkv`), srcMd5);
  }
  out.source.unique = new Set(srcMd5).size;
  out.srcMd5 = srcMd5;
  for (const [name, [src, inOpts, outOpts, command]] of Object.entries(CASES)) {
    ff([...inOpts, '-i', `${src}.mkv`, ...outOpts.length && outOpts[0] === '-c' ? [] : ENC, ...outOpts, `${name}.mkv`], dir);
    out.runs[name] = {command, src, ...readOutput(path.join(dir, `${name}.mkv`), srcMd5)};
  }
  // controls: the same looped sequence built by concatenation, and a hand-made sequence with known missing frames
  const lst = [1, 2, 3].map(() => "file 'eq.mkv'").join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'list.txt'), lst);
  ff(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'concat-demux.mkv'], dir);
  ff(['-i', 'short.mkv', '-i', 'short.mkv', '-i', 'short.mkv', '-filter_complex', '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]', ...ENC, 'concat-filter-short.mkv'], dir);
  ff(['-i', 'eq.mkv', '-i', 'eq.mkv', '-i', 'eq.mkv', '-filter_complex',
      '[0:v]trim=start_frame=0,setpts=PTS-STARTPTS[a];[1:v]trim=start_frame=2,setpts=PTS-STARTPTS[b];[2:v]trim=start_frame=3,setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]',
      '-map', '[v]', '-c:v', 'ffv1', 'handmade-gaps.mkv'], dir);
  const rd = (n) => readOutput(path.join(dir, n + '.mkv'), srcMd5);
  out.controls = {
    concatDemux: {command: 'ffmpeg -f concat -safe 0 -i list.txt -c copy out.mkv   (list.txt: eq.mkv three times)', ...rd('concat-demux')},
    concatFilterShort: {command: 'ffmpeg -i short.mkv -i short.mkv -i short.mkv -filter_complex concat=n=3:v=1:a=1 out.mkv', ...rd('concat-filter-short')},
    handmadeGaps: {command: 'three trim filters then concat: frames 0 to 119, 2 to 119, 3 to 119', ...rd('handmade-gaps')},
  };
  return out;
}
