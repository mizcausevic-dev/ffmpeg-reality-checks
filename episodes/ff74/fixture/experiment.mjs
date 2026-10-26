// Episode 74 fixture: "The loop filter: is size in frames or seconds, and is loop=2 two plays or three?"
// Synthetic input only: a lavfi counter clip, 50 frames, 64x48, yuv420p, every frame a flat card whose luma is 16 + its frame number.
// So one decoded frame names itself: id = luma - 16. Nothing is encoded between the source and the readers.
// The filter under test: loop=loop=N:size=M:start=S (and the time option), applied to the clip.
// Readers (each turns every output frame back into a source frame id):
//   reader 1  raw decoded planes in Node (rawvideo yuv420p): the Y plane must be flat, id = luma - 16
//   reader 2  ffmpeg framemd5: the hash of every output frame is looked up in the hashes of the 50 source frames
// Container reader for the duration claim: ffprobe format.duration of an FFV1 file written from the same graph.
// Known-positive control: a sequence built without the loop filter (trim and concat) whose repeats we know in advance.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, TOTAL = 50, FPS = 25;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

export const srcInput = (fps = FPS, n = TOTAL) => ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${fps}:d=${n / fps},format=yuv420p,geq=lum='16+N':cb=128:cr=128`];

// graph: {vf: 'loop=...'} or {fc: '[0:v]...[v]'}; cap: -frames:v guard
const graphArgs = (g) => (g.fc ? ['-filter_complex', g.fc, '-map', '[v]'] : ['-vf', g.vf]);
const run = (args, opts = {}) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});

// reader 1
export function readIds(g, {fps = FPS, cap = 100000, input = null} = {}) {
  const r = run([...(input ?? srcInput(fps)), ...graphArgs(g), '-frames:v', String(cap), '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-']);
  if (r.status !== 0) return {ok: false, exit: r.status, error: String(r.stderr).trim().split('\n')[0], ids: null};
  const buf = r.stdout, ysz = W * H, fsz = ysz * 3 / 2, n = buf.length / fsz;
  if (!Number.isInteger(n)) throw new Error(`unexpected raw size ${buf.length}`);
  const ids = []; let flat = true;
  for (let i = 0; i < n; i++) {
    const o = i * fsz, y = buf[o];
    for (let k = 1; k < ysz; k++) if (buf[o + k] !== y) { flat = false; break; }
    ids.push(y - 16);
  }
  return {ok: true, exit: 0, flat, ids};
}

// reader 2
export function frameMd5(g, {fps = FPS, cap = 100000, input = null} = {}) {
  const r = run([...(input ?? srcInput(fps)), ...graphArgs(g), '-frames:v', String(cap), '-an', '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return {ok: false, exit: r.status, error: String(r.stderr).trim().split('\n')[0], md5: null, pts: null};
  const md5 = [], pts = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    pts.push(Number(c[2])); md5.push(c[c.length - 1]);
  }
  return {ok: true, exit: 0, md5, pts};
}
export const sourceTable = () => {
  const m = frameMd5({vf: 'null'}).md5, t = new Map();
  m.forEach((h, n) => t.set(h, n));
  return {md5: m, table: t};
};
export const idsByHash = (md5, table) => md5.map((h) => (table.has(h) ? table.get(h) : -1));

// ---- the model of the filter, fitted on 6.1.1 ----
// start counts frames from 1: the loop begins at source frame S-1 (S=0 and S=1 are the same; S=-1 switches start off).
// time is compared with the frame's pts, so time = k/fps begins at frame k.
// size is a number of frames; the loop holds the frames from the begin up to size of them, fewer if the clip ends first.
export const beginOf = ({start = 0, timeFrame = null, total = TOTAL}) => {
  const byStart = start >= 0 ? Math.max(start - 1, 0) : null;
  const cands = [byStart, timeFrame].filter((x) => x !== null && x !== undefined);
  const b = cands.length ? Math.min(...cands) : null;
  return b !== null && b < total ? b : null;
};
// loops: extra plays (N); cap: frames to keep (for -1)
export const modelIds = ({loop = 0, size = 0, start = 0, timeFrame = null, total = TOTAL, cap = Infinity}) => {
  const b = beginOf({start, timeFrame, total});
  const out = [];
  const push = (x) => { if (out.length < cap) out.push(x); };
  if (b === null || size <= 0 || loop === 0) { for (let i = 0; i < total; i++) push(i); return out; }
  const e = Math.min(b + size, total);
  for (let i = 0; i < e; i++) push(i);
  const plays = loop < 0 ? Infinity : loop;
  for (let p = 0; p < plays && out.length < cap; p++) for (let i = b; i < e; i++) push(i);
  for (let i = e; i < total; i++) push(i);
  return out;
};

export const filterOf = ({loop, size, start, time}) => {
  const o = [`loop=${loop}`, `size=${size}`];
  if (start !== undefined) o.push(`start=${start}`);
  if (time !== undefined) o.push(`time=${time}`);
  return 'loop=' + o.join(':');
};
export const commandOf = (c) => `ffmpeg -i counter.mkv -vf "${filterOf(c)}"${c.cap ? ` -frames:v ${c.cap}` : ''} out.mkv`;

export const runsOfIds = (ids) => {
  // contiguous ascending runs: [{from, to, len}]
  const out = [];
  ids.forEach((v, i) => { if (out.length && v === ids[i - 1] + 1) out[out.length - 1].to = v; else out.push({from: v, to: v}); });
  return out.map((r) => ({...r, len: r.to - r.from + 1}));
};
// the source frames that appear more than once, and how many plays each gets
export const playsOf = (ids) => {
  const m = new Map(); ids.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  const rep = [...m].filter(([, k]) => k > 1).map(([id, k]) => ({id, plays: k}));
  return rep;
};

const r2 = (v) => Math.round(v * 1000) / 1000;

export function measure(c, src, fps = FPS, input = null) {
  const g = {vf: filterOf(c)};
  const a = readIds(g, {fps, cap: c.cap, input});
  const b = frameMd5(g, {fps, cap: c.cap, input});
  if (!a.ok || !b.ok) return {...c, command: commandOf(c), exit: a.exit || b.exit, error: a.error ?? b.error, ids: null};
  const idsB = idsByHash(b.md5, src.table);
  const ids = a.ids;
  const rep = playsOf(ids);
  const ptsStep = b.pts.every((p, i) => p === i);
  const total = fps === FPS ? TOTAL : TOTAL;
  return {
    ...c, fps, command: commandOf(c), exit: 0,
    frames: ids.length, framesMd5: idsB.length, ids, idsMd5: idsB,
    agree: a.flat && ids.length === idsB.length && ids.every((v, i) => v === idsB[i]),
    flat: a.flat,
    extra: ids.length - total,
    repeated: rep, repeatedFrom: rep.length ? rep[0].id : null, repeatedTo: rep.length ? rep[rep.length - 1].id : null,
    segLen: rep.length, maxPlays: rep.length ? Math.max(...rep.map((x) => x.plays)) : 1,
    ptsContiguous: ptsStep, seconds: r2(ids.length / fps),
  };
}

// FFV1 file from the same graph, read by ffprobe: the container's duration
export function ffprobeDuration(dir, c, fps = FPS) {
  const f = path.join(dir, `d-${c.loop}-${c.size}-${c.start}-${fps}.mkv`);
  const r = run([...srcInput(fps), '-vf', filterOf(c), '-frames:v', String(c.cap ?? 100000), '-c:v', 'ffv1', f]);
  if (r.status !== 0) return null;
  const p = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames:format=duration', '-of', 'default=nw=1', f], {encoding: 'utf8'});
  const o = Object.fromEntries(p.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.split('=')));
  return {frames: Number(o.nb_read_frames), duration: Number(o.duration)};
}

// known-positive control, built without the loop filter: frames 0..11, then 9,10,11 again, then 12..49 (a loop that starts at frame 9)
// and the same shape one frame later (starts at frame 10)
const trimCat = (parts) => {
  const sp = `[0:v]split=${parts.length}` + parts.map((_, i) => `[s${i}]`).join('') + ';';
  const tr = parts.map(([a, b], i) => `[s${i}]trim=start_frame=${a}:end_frame=${b + 1},setpts=PTS-STARTPTS[t${i}]`).join(';');
  return `${sp}${tr};` + parts.map((_, i) => `[t${i}]`).join('') + `concat=n=${parts.length}:v=1:a=0[v]`;
};
export const CONTROLS = {
  from9: {parts: [[0, 11], [9, 11], [12, 49]], expect: [...Array(12).keys(), 9, 10, 11, ...Array.from({length: 38}, (_, i) => 12 + i)]},
  from10: {parts: [[0, 12], [10, 12], [13, 49]], expect: [...Array(13).keys(), 10, 11, 12, ...Array.from({length: 37}, (_, i) => 13 + i)]},
  twice: {parts: [[0, 4], [2, 4], [2, 4], [5, 49]], expect: [0, 1, 2, 3, 4, 2, 3, 4, 2, 3, 4, ...Array.from({length: 45}, (_, i) => 5 + i)]},
  plain: {parts: [[0, 49]], expect: Array.from({length: 50}, (_, i) => i)},
};
export function control(name, src) {
  const c = CONTROLS[name], g = {fc: trimCat(c.parts)};
  const a = readIds(g), b = frameMd5(g);
  const idsB = idsByHash(b.md5, src.table);
  return {name, expect: c.expect, ids: a.ids, idsMd5: idsB, readerOk: a.ids.length === c.expect.length && a.ids.every((v, i) => v === c.expect[i]), reader2Ok: idsB.length === c.expect.length && idsB.every((v, i) => v === c.expect[i]), repeated: playsOf(a.ids)};
}

export const GRID = {loop: [0, 1, 2, 3], size: [1, 5, 25, 100], start: [0, 1, 2, 10, 48]};

// unbounded loop: guarded by -frames:v, and an unguarded run that we kill after a few seconds
export function infinite(src) {
  const c = {loop: -1, size: 5, start: 10, cap: 120};
  const m = measure(c, src);
  const un = spawnSync('ffmpeg', ['-v', 'error', '-y', ...srcInput(), '-vf', 'loop=loop=-1:size=5:start=10', '-f', 'null', '-progress', 'pipe:1', '-'], {encoding: 'utf8', timeout: 3000, killSignal: 'SIGKILL', maxBuffer: 1 << 26});
  const frames = [...String(un.stdout ?? '').matchAll(/^frame=(\d+)/gm)].map((x) => Number(x[1]));
  return {guarded: m, unguarded: {killed: un.status === null, signal: un.signal, lastFrame: frames.length ? frames[frames.length - 1] : 0, seconds: 3}};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = sourceTable();
  const srcIds = readIds({vf: 'null'});
  const ev = {
    ffmpeg: ffmpegVersion(),
    source: {frames: srcIds.ids.length, flat: srcIds.flat, rule: srcIds.ids.every((v, i) => v === i), distinct: new Set(src.md5).size, fps: FPS, width: W, height: H},
    controls: Object.fromEntries(Object.keys(CONTROLS).map((n) => [n, control(n, src)])),
    grid: [],
  };
  for (const loop of GRID.loop) for (const size of GRID.size) for (const start of GRID.start) {
    const c = {loop, size, start};
    const m = measure(c, src);
    m.model = modelIds(c);
    m.modelOk = !!m.ids && m.ids.length === m.model.length && m.ids.every((v, i) => v === m.model[i]);
    ev.grid.push(m);
  }
  // timing options
  ev.time = [
    {loop: 1, size: 3, time: 0.4, timeFrame: 10},
    {loop: 1, size: 3, time: 0.4, start: 30, timeFrame: 10},
    {loop: 1, size: 3, time: 0.4, start: -1, timeFrame: 10},
    {loop: 1, size: 3, time: 0, start: -1, timeFrame: 0},
    {loop: 1, size: 3, start: -1},
    {loop: 1, size: 3, start: 60},
    {loop: 1, size: 0, start: 10},
  ].map((c) => { const m = measure(c, src); m.model = modelIds({...c, start: c.start === undefined ? 0 : c.start}); m.modelOk = !!m.ids && m.ids.length === m.model.length && m.ids.every((v, i) => v === m.model[i]); return m; });
  // size is frames: the same filter on clips of 10, 25 and 50 frames per second
  ev.fps = [10, 25, 50].map((fps) => {
    const c = {loop: 1, size: 5, start: 10};
    const m = measure(c, src, fps);
    return {fps, frames: m.frames, ids: m.ids, agree: m.agree, seconds: m.seconds, sourceSeconds: TOTAL / fps, repeated: m.repeated, ptsContiguous: m.ptsContiguous, probe: ffprobeDuration(dir, c, fps)};
  });
  ev.probe = [{loop: 0, size: 5, start: 10}, {loop: 2, size: 5, start: 10}, {loop: 2, size: 25, start: 0}].map((c) => ({...c, ...ffprobeDuration(dir, c)}));
  // the same filter on a file instead of the live source: the start rule is not an artifact of lavfi
  const file = path.join(dir, 'counter.mkv');
  run([...srcInput(), '-c:v', 'ffv1', file]);
  ev.fromFile = [{loop: 1, size: 5, start: 10}, {loop: 1, size: 5, start: 1}, {loop: 2, size: 3, start: 30}].map((c) => { const m = measure(c, src, FPS, ['-i', file]); m.model = modelIds(c); m.modelOk = m.ids.length === m.model.length && m.ids.every((v, i) => v === m.model[i]); return m; });
  ev.infinite = infinite(src);
  return ev;
}

export const caseOf = (ev, loop, size, start) => ev.grid.find((c) => c.loop === loop && c.size === size && c.start === start);
export const summary = (ev) => {
  const g = (l, s, st) => caseOf(ev, l, s, st);
  return {
    plays: [0, 1, 2, 3].map((n) => { const c = g(n, 5, 10); return {loop: n, frames: c.frames, extra: c.extra, maxPlays: c.maxPlays}; }),
    startFirstRepeat: [0, 1, 2, 10, 48].map((s) => ({start: s, first: g(1, 1, s).repeatedFrom, seg5: g(1, 5, s).repeatedFrom})),
  };
};
