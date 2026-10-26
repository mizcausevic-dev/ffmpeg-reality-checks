// Episode 67 fixture: "-tune zerolatency: what does it cost in bytes at the same CRF?"
// Synthetic input only (lavfi): testsrc2 at 320x240, 25 fps, 100 frames, in two versions:
//   clean   testsrc2 as is (moving bars, a sweep and a counter: motion, no noise)
//   noisy   testsrc2 plus temporal noise: noise=alls=12:allf=t+u:all_seed=1 (a fixed seed, so the clip is the same every run)
// Every encode: libx264, -preset medium, -threads 1 (one thread: with two, the same command gave two different sizes on a loaded machine), a hard -frames:v 100 and -t 10 (the lavfi source is also limited to d=4).
// Cases: the same CRF with no tune, zerolatency, film and animation; zerolatency taken apart (-bf 0, mbtree=0, rc-lookahead=0,
// zerolatency with -bf 3 put back); and a CRF sweep for no tune and zerolatency (a rate and quality curve).
// Readers:
//   bytes    reader 1  size of the mp4 file
//            reader 2  sum of the video packet sizes from ffprobe
//   B frames reader 1  ffprobe frame pict_type, counted in display order
//            reader 2  the x264 statistics line printed by ffmpeg at -v info ("frame B:74 ...")
//   settings reader    the x264 options line (bframes, mbtree, rc_lookahead) shows what each flag really switched
//   quality  reader 1  ffmpeg psnr filter (decoded output against the regenerated source), y plane
//            reader 2  Node: decoded raw yuv420p against the regenerated raw source, y plane, PSNR of the mean squared error
// Controls: -bf 0 (B-frame readers must see zero), the CRF sweep (both byte readers and both PSNR readers must move the right way),
// a repeat encode (same bytes), and a flat patch of the clean clip (constant) against the same patch of the noisy clip (changing).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 320, H = 240, FPS = 25, FRAMES = 100, PRESET = 'medium', THREADS = 1, TIMEOUT_MS = 120000;
export const FRAME_BYTES = (W * H * 3) / 2, Y_BYTES = W * H;
export const SRC = {
  clean: 'testsrc2=s=320x240:r=25:d=4,format=yuv420p',
  noisy: 'testsrc2=s=320x240:r=25:d=4,noise=alls=12:allf=t+u:all_seed=1,format=yuv420p',
};
export const PATCH = {x: 10, y: 100, w: 24, h: 18}; // a flat part of the red bar
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 28, timeout: TIMEOUT_MS, ...opts});

// id, source, the encoder arguments after the common ones
export function cases() {
  const out = [];
  const add = (id, src, args, threads) => out.push({id, src, args, ...(threads ? {threads} : {})});
  const N = 'noisy';
  add('n_def23', N, ['-crf', '23']);
  add('n_zl23', N, ['-crf', '23', '-tune', 'zerolatency']);
  add('n_film23', N, ['-crf', '23', '-tune', 'film']);
  add('n_anim23', N, ['-crf', '23', '-tune', 'animation']);
  add('n_bf0', N, ['-crf', '23', '-bf', '0']);
  add('n_mbtree0', N, ['-crf', '23', '-x264-params', 'mbtree=0']);
  add('n_rcla0', N, ['-crf', '23', '-x264-params', 'rc-lookahead=0']);
  add('n_zlbf3', N, ['-crf', '23', '-tune', 'zerolatency', '-bf', '3']);
  add('n_def23_t2', N, ['-crf', '23'], 2); // two threads: zerolatency switches on sliced threads, which cost bytes
  add('n_zl23_t2', N, ['-crf', '23', '-tune', 'zerolatency'], 2);
  for (const c of [18, 20, 22, 26, 28, 30, 32, 35]) add(`n_def${c}`, N, ['-crf', String(c)]);
  for (const c of [18, 20, 26, 28, 30, 32]) add(`n_zl${c}`, N, ['-crf', String(c), '-tune', 'zerolatency']);
  add('c_def23', 'clean', ['-crf', '23']);
  add('c_zl23', 'clean', ['-crf', '23', '-tune', 'zerolatency']);
  add('c_film23', 'clean', ['-crf', '23', '-tune', 'film']);
  add('c_anim23', 'clean', ['-crf', '23', '-tune', 'animation']);
  return out;
}
export const encodeArgs = (c, out) => ['-v', 'info', '-y', '-f', 'lavfi', '-i', SRC[c.src], '-frames:v', String(FRAMES), '-t', '10', '-c:v', 'libx264', '-preset', PRESET, '-threads', String(c.threads ?? THREADS), ...c.args, '-f', 'mp4', out];
export const commandOf = (c) => 'ffmpeg ' + encodeArgs(c, `${c.id}.mp4`).join(' ');

// ---- readers ----
export function encode(c, dir, tag = '') {
  const out = path.join(dir, `${c.id}${tag}.mp4`);
  const r = run('ffmpeg', encodeArgs(c, out), {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`encode ${c.id} failed: ${String(r.stderr).slice(-400)}`);
  const log = String(r.stderr);
  const n = (k) => { const m = log.match(new RegExp(`frame ${k}:\\s*(\\d+)`)); return m ? Number(m[1]) : 0; };
  // the options line x264 prints: the settings the encoder actually ran with (bframes, mbtree, rc_lookahead when printed)
  const opt = (k) => { const m = log.match(new RegExp(`\\b${k}=(\\d+)`)); return m ? Number(m[1]) : null; };
  return {file: out, x264: {I: n('I'), P: n('P'), B: n('B')}, opts: {bframes: opt('bframes'), mbtree: opt('mbtree'), rc_lookahead: opt('rc_lookahead')}};
}
export const fileBytes = (file) => fs.statSync(file).size;
export function packetBytes(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  return String(r.stdout).split('\n').filter(Boolean).reduce((s, v) => s + Number(v), 0);
}
export function frameTypes(file) {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pict_type', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  const seq = String(r.stdout).split('\n').map((s) => s.trim().replace(/[^IPB]/g, '')).filter(Boolean).join('');
  const n = (k) => seq.split(k).length - 1;
  return {seq, I: n('I'), P: n('P'), B: n('B')};
}
export function psnrFilter(file, src) {
  const r = run('ffmpeg', ['-v', 'info', '-i', file, '-f', 'lavfi', '-i', SRC[src], '-frames:v', String(FRAMES), '-t', '10', '-lavfi', '[0:v][1:v]psnr', '-f', 'null', '-'], {encoding: 'utf8'});
  const m = String(r.stderr).match(/PSNR y:([\d.]+) u:([\d.]+) v:([\d.]+) average:([\d.]+)/);
  return m ? {y: Number(m[1]), avg: Number(m[4])} : null;
}
export function rawFrames(input, isLavfi) {
  const a = ['-v', 'error', ...(isLavfi ? ['-f', 'lavfi', '-i', input] : ['-i', input]), '-frames:v', String(FRAMES), '-t', '10', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'];
  const r = run('ffmpeg', a);
  if (r.status !== 0) throw new Error('raw decode failed: ' + String(r.stderr).slice(-300));
  return r.stdout;
}
export function psnrNode(ref, dec) {
  if (ref.length !== dec.length || ref.length !== FRAMES * FRAME_BYTES) return NaN;
  let se = 0;
  for (let f = 0; f < FRAMES; f++) {
    const o = f * FRAME_BYTES;
    for (let i = 0; i < Y_BYTES; i++) { const d = ref[o + i] - dec[o + i]; se += d * d; }
  }
  const mse = se / (FRAMES * Y_BYTES);
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}
// the first frame-to-frame change of a luma frame: mean absolute difference over the whole frame, averaged over the clip
export function motionMad(raw) {
  let tot = 0;
  for (let f = 1; f < FRAMES; f++) {
    let s = 0;
    const a = (f - 1) * FRAME_BYTES, b = f * FRAME_BYTES;
    for (let i = 0; i < Y_BYTES; i++) s += Math.abs(raw[b + i] - raw[a + i]);
    tot += s / Y_BYTES;
  }
  return tot / (FRAMES - 1);
}
export function patchOf(raw, frame) {
  const rows = [];
  for (let y = 0; y < PATCH.h; y++) {
    const row = [];
    for (let x = 0; x < PATCH.w; x++) row.push(raw[frame * FRAME_BYTES + (PATCH.y + y) * W + PATCH.x + x]);
    rows.push(row);
  }
  return rows;
}
export const flatSpread = (rows) => { const v = rows.flat(); return {min: Math.min(...v), max: Math.max(...v), distinct: new Set(v).size}; };
// mean absolute change of the patch between two frames
export const patchMad = (a, b) => a.flat().reduce((s, v, i) => s + Math.abs(v - b.flat()[i]), 0) / a.flat().length;

export function measureCase(c, dir, raws) {
  const enc = encode(c, dir);
  const ft = frameTypes(enc.file);
  const dec = rawFrames(enc.file, false);
  const pf = psnrFilter(enc.file, c.src);
  return {
    ...c, command: commandOf(c),
    bytes: fileBytes(enc.file), packetBytes: packetBytes(enc.file),
    frames: ft.I + ft.P + ft.B, types: {I: ft.I, P: ft.P, B: ft.B}, seq: ft.seq, x264: enc.x264, opts: enc.opts,
    psnr: {filterY: pf?.y ?? NaN, filterAvg: pf?.avg ?? NaN, nodeY: Math.round(psnrNode(raws[c.src], dec) * 1e6) / 1e6},
  };
}

// bytes of the no-tune curve at a given y PSNR, by interpolating log(bytes) between the two neighbouring CRF points (null outside the curve)
export function bytesAtPsnr(runs, y) {
  const pts = [18, 20, 22, 23, 26, 28, 30, 32, 35].map((c) => ({y: runs[`n_def${c}`].psnr.nodeY, b: Math.log(runs[`n_def${c}`].bytes)})).sort((p, q) => p.y - q.y);
  for (let i = 0; i + 1 < pts.length; i++) {
    if (y >= pts[i].y && y <= pts[i + 1].y) { const t = (y - pts[i].y) / (pts[i + 1].y - pts[i].y); return Math.round(Math.exp(pts[i].b + t * (pts[i + 1].b - pts[i].b))); }
  }
  return null;
}
export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const raws = {clean: rawFrames(SRC.clean, true), noisy: rawFrames(SRC.noisy, true)};
  const sources = {};
  for (const k of Object.keys(raws)) {
    const p50 = patchOf(raws[k], 50), p51 = patchOf(raws[k], 51);
    sources[k] = {frames: raws[k].length / FRAME_BYTES, mad: Math.round(motionMad(raws[k]) * 1000) / 1000, patch50: p50, patch51: p51, patchSpread: flatSpread(p50), patchMad: Math.round(patchMad(p50, p51) * 1000) / 1000};
  }
  const ev = {ffmpeg: ffmpegVersion(), sources, runs: {}};
  for (const c of cases()) ev.runs[c.id] = measureCase(c, dir, raws);
  // repeat encodes: the same command twice must give the same file
  const rep = {};
  for (const id of ['n_def23', 'n_zl23']) { const c = cases().find((x) => x.id === id); const e = encode(c, dir, '_again'); rep[id] = {bytes: fileBytes(e.file), same: fs.readFileSync(e.file).equals(fs.readFileSync(path.join(dir, `${id}.mp4`)))}; }
  ev.repeat = rep;
  // same CRF, and the same y PSNR: the zerolatency curve against the no-tune curve
  ev.equal = [18, 20, 23, 26, 28, 30, 32].map((crf) => {
    const z = ev.runs[`n_zl${crf}`] ?? ev.runs.n_zl23, d = ev.runs[`n_def${crf}`];
    const at = bytesAtPsnr(ev.runs, z.psnr.nodeY);
    return {crf, zlBytes: z.bytes, defBytes: d.bytes, sameCrfRatio: Math.round((z.bytes / d.bytes) * 1000) / 1000, zlY: z.psnr.nodeY, defY: d.psnr.nodeY, defBytesAtZlPsnr: at, samePsnrRatio: at ? Math.round((z.bytes / at) * 1000) / 1000 : null};
  });
  return ev;
}
