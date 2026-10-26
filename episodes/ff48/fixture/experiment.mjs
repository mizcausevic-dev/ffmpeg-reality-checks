// Episode 48 fixture: "The thumbnail filter: which frame does it pick, and is it the best one?"
// Synthetic input only (lavfi): 100 frames, 160x120, 25 fps, stored lossless (ffv1, gbrp) in mkv, so every frame is exactly reproducible.
//   shot A  frames 0..54   a dark title card with a white loading bar that grows 3 pixels a frame (every frame is different)
//   shot B  frames 55..99  testsrc2 (colour bars, a frame counter, moving gradient): the shot a viewer would want as a picture
// Cases:
//   n100 (and the default with no n), n50, n25, n10, n30 (batches of 30, 30, 30 and a partial 10), short (the first 60 frames, default n)
//   fix  trim=start_frame=55 before thumbnail=n=45, so the batch is shot B only
// Controls (known answers):
//   ramp  99 frames, a white bar N pixels wide at frame N: the average histogram is frame 49's, so thumbnail=n=99 must pick frame 49
//   odd   100 identical dark frames except frame 37 (white): thumbnail must not pick frame 37; the tie is broken in favour of the first frame
// Every filter chain starts with format=rgb24, because the filter builds its histograms on RGB.
// Readers of "which frame":
//   reader 1  ffmpeg framemd5 of the output: the pts (frame index = pts x 25) and the md5, looked up in the source's framemd5 list
//   reader 2  Node: the raw rgb24 bytes of the output frame, matched byte for byte against every source frame
//   reader 3  Node: the filter's algorithm reimplemented (RGB histogram per frame, average of the batch, smallest sum of squared differences wins, first wins a tie)
// Readers of "is it the best":
//   luma entropy of every frame: Node on the decoded gray plane, and ffmpeg's entropy filter; mean luma: Node, and ffmpeg's signalstats YAVG
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 160, H = 120, FPS = 25, FRAMES = 100, SHOT_A = 55;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const FSZ = W * H * 3, GSZ = W * H;

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

// ---------- the clips ----------
const TITLE = `color=c=0x101418:s=${W}x${H}:r=${FPS}:d=${SHOT_A / FPS},format=rgb24,geq=r='if(gt(Y,100)*lt(Y,112)*lt(X,N*3),240,16)':g='if(gt(Y,100)*lt(Y,112)*lt(X,N*3),240,20)':b='if(gt(Y,100)*lt(Y,112)*lt(X,N*3),240,24)'`;
const SCENE = `testsrc2=s=${W}x${H}:r=${FPS}:d=${(FRAMES - SHOT_A) / FPS},format=rgb24`;
const RAW = ['-c:v', 'ffv1', '-pix_fmt', 'gbrp'];

export function makeClips(dir) {
  const f = {main: path.join(dir, 'main.mkv'), ramp: path.join(dir, 'ramp.mkv'), odd: path.join(dir, 'odd.mkv'), a: path.join(dir, 'a.mkv'), b: path.join(dir, 'b.mkv')};
  ffm(['-f', 'lavfi', '-i', TITLE, ...RAW, f.a]);
  ffm(['-f', 'lavfi', '-i', SCENE, ...RAW, f.b]);
  ffm(['-i', f.a, '-i', f.b, '-filter_complex', '[0][1]concat=n=2:v=1:a=0,format=rgb24', ...RAW, f.main]);
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${99 / FPS},format=rgb24,geq=r='if(lt(X,N),255,0)':g='if(lt(X,N),255,0)':b='if(lt(X,N),255,0)'`, ...RAW, f.ramp]);
  ffm(['-f', 'lavfi', '-i', `color=c=0x101418:s=${W}x${H}:r=${FPS}:d=4,format=rgb24,geq=r='if(eq(N,37),255,16)':g='if(eq(N,37),255,20)':b='if(eq(N,37),255,24)'`, ...RAW, f.odd]);
  return f;
}

// ---------- decoding ----------
export function rawFrames(file, vf = 'format=rgb24', size = FSZ) {
  const r = ffm(['-i', file, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', size === FSZ ? 'rgb24' : 'gray', '-'], {});
  const b = r.stdout, n = Math.floor(b.length / size);
  if (n * size !== b.length) throw new Error(`unexpected raw size ${b.length}`);
  return Array.from({length: n}, (_, i) => b.subarray(i * size, (i + 1) * size));
}
// reader 1: framemd5 of a filtered output: md5 and frame index (pts x 25) per output frame
export function framemd5(file, vf) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  let tb = 1; const out = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    const m = /^#tb\s+0:\s*(\d+)\/(\d+)/.exec(l);
    if (m) { tb = Number(m[1]) / Number(m[2]); continue; }
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    out.push({md5: c[c.length - 1], index: Math.round(Number(c[2]) * tb * FPS)});
  }
  return out;
}

// ---------- reader 3: the algorithm ----------
export function histogram(rgb) {
  const h = new Float64Array(768);
  for (let i = 0; i < rgb.length; i += 3) { h[rgb[i]]++; h[256 + rgb[i + 1]]++; h[512 + rgb[i + 2]]++; }
  return h;
}
// batches of n consecutive frames; the last one may be shorter. In each batch the frame whose histogram is closest to the batch average (sum of squared differences) wins, the first wins a tie.
export function modelPicks(hists, n) {
  const picks = [];
  for (let s = 0; s < hists.length; s += n) {
    const batch = hists.slice(s, s + n), avg = new Float64Array(768);
    for (const h of batch) for (let k = 0; k < 768; k++) avg[k] += h[k];
    for (let k = 0; k < 768; k++) avg[k] /= batch.length;
    let best = 0, bestErr = -1;
    batch.forEach((h, i) => { let e = 0; for (let k = 0; k < 768; k++) { const d = h[k] - avg[k]; e += d * d; } if (i === 0 || e < bestErr) { best = i; bestErr = e; } });
    picks.push(s + best);
  }
  return picks;
}

// ---------- readers of "is it the best" ----------
export function entropyOf(gray) {
  const h = new Float64Array(256); for (let i = 0; i < gray.length; i++) h[gray[i]]++;
  let e = 0; for (const c of h) if (c) { const p = c / gray.length; e -= p * Math.log2(p); }
  return e;
}
export const meanOf = (gray) => { let s = 0; for (let i = 0; i < gray.length; i++) s += gray[i]; return s / gray.length; };
// ffmpeg's own numbers, one line per frame
export function ffmpegStats(file) {
  const grab = (vf, key) => {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-vf', `${vf},metadata=print:file=-`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
    if (r.status !== 0) throw new Error(`stats failed: ${r.stderr}`);
    return [...r.stdout.matchAll(new RegExp(`${key}=([-\\d.]+)`, 'g'))].map((m) => Number(m[1]));
  };
  return {entropy: grab('format=gray,entropy', 'lavfi\\.entropy\\.entropy\\.normal\\.Y'), mean: grab('format=gray,signalstats', 'lavfi\\.signalstats\\.YAVG')};
}

const round = (v, k = 3) => Math.round(v * 10 ** k) / 10 ** k;

// what ffmpeg picked, read three ways, for one filter chain on one clip
export function pick(file, chain, src) {
  const vf = `format=rgb24,${chain}`;
  const fm = framemd5(file, vf);
  const raws = rawFrames(file, vf);
  const byPts = fm.map((f) => f.index);
  const byMd5 = fm.map((f) => src.md5.indexOf(f.md5));
  const byRaw = raws.map((b) => src.rawMd5.indexOf(md5(b)));
  return {byPts, byMd5, byRaw};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const f = makeClips(dir);
  const frames = rawFrames(f.main), gray = rawFrames(f.main, 'format=gray', GSZ);
  const src = {md5: framemd5(f.main, 'format=rgb24').map((x) => x.md5), rawMd5: frames.map((b) => md5(b))};
  const hists = frames.map(histogram);
  const st = ffmpegStats(f.main);
  const entropy = gray.map(entropyOf), mean = gray.map(meanOf);
  const rank = (i) => 1 + entropy.filter((e) => e > entropy[i] + 1e-9).length;
  const best = entropy.indexOf(Math.max(...entropy));
  const ev = {
    ffmpeg: ffmpegVersion(), frames: frames.length, distinctFrames: new Set(src.rawMd5).size,
    shotA: SHOT_A, best, bestEntropy: round(entropy[best]),
    frameStats: {entropyNode: entropy.map((v) => round(v, 4)), entropyFfmpeg: st.entropy.map((v) => round(v, 4)), meanNode: mean.map((v) => round(v, 3)), meanFfmpeg: st.mean.map((v) => round(v, 3))},
    shotMean: {a: round(mean.slice(0, SHOT_A).reduce((x, y) => x + y, 0) / SHOT_A, 1), b: round(mean.slice(SHOT_A).reduce((x, y) => x + y, 0) / (FRAMES - SHOT_A), 1)},
    shotEntropy: {aMax: round(Math.max(...entropy.slice(0, SHOT_A))), bMin: round(Math.min(...entropy.slice(SHOT_A))), bMax: round(Math.max(...entropy.slice(SHOT_A)))},
    cases: {},
  };
  const record = (name, chain, expectModel) => {
    const p = pick(f.main, chain, src);
    ev.cases[name] = {chain, ...p, model: expectModel, entropy: p.byMd5.map((x) => round(entropy[x])), mean: p.byMd5.map((x) => round(mean[x], 1)), rank: p.byMd5.map(rank)};
    return ev.cases[name];
  };
  record('default', 'thumbnail', modelPicks(hists, 100));
  record('n100', 'thumbnail=n=100', modelPicks(hists, 100));
  record('n50', 'thumbnail=n=50', modelPicks(hists, 50));
  record('n25', 'thumbnail=n=25', modelPicks(hists, 25));
  record('n10', 'thumbnail=n=10', modelPicks(hists, 10));
  record('n30', 'thumbnail=n=30', modelPicks(hists, 30));
  record('short', 'trim=end_frame=60,thumbnail', modelPicks(hists.slice(0, 60), 100));
  record('fix', `trim=start_frame=${SHOT_A},thumbnail=n=${FRAMES - SHOT_A}`, modelPicks(hists.slice(SHOT_A), FRAMES - SHOT_A).map((x) => x + SHOT_A));
  // controls
  for (const [name, file, n] of [['ramp', f.ramp, 99], ['odd', f.odd, 100]]) {
    const fr = rawFrames(file), cs = {md5: framemd5(file, 'format=rgb24').map((x) => x.md5), rawMd5: fr.map((b) => md5(b))};
    const p = pick(file, `thumbnail=n=${n}`, cs);
    ev.cases[name] = {chain: `thumbnail=n=${n}`, ...p, model: modelPicks(fr.map(histogram), n), frames: fr.length, distinct: new Set(cs.rawMd5).size};
  }
  return ev;
}
