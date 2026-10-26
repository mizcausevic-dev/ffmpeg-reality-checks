// Episode 63 fixture: "I overlaid a short clip on a longer one: why does the overlay freeze on its last frame?"
// Synthetic input only (lavfi, lossless x264 in mkv, yuv420p, 25 fps).
//   base     5 s, 125 frames, 96x72, every frame flat: frame n has luma 16+n and cb 96
//   overlay  2 s,  50 frames, 32x24, every frame flat: frame m has luma 186+m (a counter, 186 to 235) and cb 200
//   the overlay sits at x=56, y=4 (even offsets, so a lossless yuv420p paste is exact)
// Cases (overlay=x=56:y=4 plus the option shown):
//   default     no eof_action at all                               repeat    eof_action=repeat (the default, spelled out)       endall    eof_action=endall        pass     eof_action=pass
//   norepeat    repeatlast=0 (documented as "stop repeating the last overlay frame")
//   shortest    shortest=1                                         enable   enable='lt(t,2)' (the timeline fix)
//   delayrep    overlay delayed 1 s with setpts=PTS+1/TB, default eof_action      delaypass   same delay with eof_action=pass
//   same        control: base cut to 2 s, the same length as the overlay, default options (nothing to freeze)
// Readers (each names, for every output frame, what the overlay rectangle shows: overlay frame m, base frame n, or something else):
//   reader 1  ffmpeg framemd5 of a crop of the output (the overlay rectangle, and a base-only rectangle), looked up in the framemd5 of the same crops of the source clips
//   reader 2  raw decoded planes in Node (rawvideo yuv420p): mean luma and cb of the overlay rectangle and of the rest of the frame
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, BASE_S = 5, BASE_FRAMES = BASE_S * FPS, OW = 32, OH = 24, OV_S = 2, OV_FRAMES = OV_S * FPS, OX = 56, OY = 4;
export const GUARD_S = 9; // hard output limit in seconds on every ffmpeg command that writes a file
export const CB_BASE = 96, CB_OV = 200;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// the overlay filter options for each case (null: no overlay filter, control)
export const CASES = {
  default: {opt: '', delay: 0},
  repeat: {opt: 'eof_action=repeat', delay: 0},
  endall: {opt: 'eof_action=endall', delay: 0},
  pass: {opt: 'eof_action=pass', delay: 0},
  norepeat: {opt: 'repeatlast=0', delay: 0},
  shortest: {opt: 'shortest=1', delay: 0},
  enable: {opt: "enable='lt(t,2)'", delay: 0},
  delayrep: {opt: 'eof_action=repeat', delay: 1},
  delaypass: {opt: 'eof_action=pass', delay: 1},
  same: {opt: 'eof_action=repeat', delay: 0, shortBase: true},
};
export const commandOf = (name) => {
  const c = CASES[name];
  const ov = c.delay ? `[1:v]setpts=PTS+${c.delay}/TB[o];[0:v][o]` : '[0:v][1:v]';
  const b = c.shortBase ? 'base2s.mkv' : 'base.mkv';
  return `ffmpeg -i ${b} -i overlay.mkv -filter_complex "${ov}overlay=x=${OX}:y=${OY}${c.opt ? ':' + c.opt : ''}" -t ${GUARD_S} out.mkv`;
};

export function makeClips(dir) {
  const base = path.join(dir, 'base.mkv'), base2 = path.join(dir, 'base2s.mkv'), ov = path.join(dir, 'overlay.mkv');
  const mk = (size, d, lum, cb, file) => ffm(['-f', 'lavfi', '-i', `color=c=black:s=${size}:r=${FPS}:d=${d},format=yuv420p,geq=lum='${lum}':cb=${cb}:cr=128`,
    '-t', String(d + 1), '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', file]);
  mk(`${W}x${H}`, BASE_S, '16+N', CB_BASE, base);
  mk(`${W}x${H}`, OV_S, '16+N', CB_BASE, base2);
  mk(`${OW}x${OH}`, OV_S, '186+N', CB_OV, ov);
  return {base, base2, ov};
}

export function makeCase(clips, dir, name) {
  const c = CASES[name];
  const out = path.join(dir, `${name}.mkv`);
  const ovIn = c.delay ? `[1:v]setpts=PTS+${c.delay}/TB[o];[0:v][o]` : '[0:v][1:v]';
  const graph = `${ovIn}overlay=x=${OX}:y=${OY}${c.opt ? ':' + c.opt : ''}[v]`;
  ffm(['-i', c.shortBase ? clips.base2 : clips.base, '-i', clips.ov, '-filter_complex', graph, '-map', '[v]', '-t', String(GUARD_S), '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', out]);
  return out;
}

// ---- readers ----
// reader 1: framemd5 of a crop (one hash per decoded frame). Frame count is bounded by -frames:v.
export function cropMd5(file, w, h, x, y) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', `crop=${w}:${h}:${x}:${y}`, '-fps_mode', 'passthrough', '-frames:v', '400', '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  const md5 = [];
  for (const l of r.stdout.split(/\r?\n/)) {
    if (!l || l.startsWith('#')) continue;
    const c = l.split(',').map((s) => s.trim());
    md5.push(c[c.length - 1]);
  }
  return md5;
}
// classify output hashes against source hashes: 'O:m' overlay frame m, 'B:n' base frame n, '?' neither
export function classifyByHash(outMd5, ovMd5, baseMd5) {
  const table = new Map();
  baseMd5.forEach((h, n) => table.set(h, `B:${n}`));
  ovMd5.forEach((h, m) => table.set(h, `O:${m}`));
  return outMd5.map((h) => table.get(h) ?? '?');
}
// reader 2: raw decoded planes, per frame: mean luma and cb inside the overlay rectangle, and flatness of the part outside it
export function rawRegions(file) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-frames:v', '400', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const buf = r.stdout, ysz = W * H, csz = ysz / 4, fsz = ysz + 2 * csz, n = Math.floor(buf.length / fsz);
  if (n * fsz !== buf.length) throw new Error(`unexpected raw size ${buf.length}`);
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * fsz;
    let ys = 0, ylo = 255, yhi = 0, ocb = 0, outLo = 255, outHi = 0;
    for (let y = OY; y < OY + OH; y++) for (let x = OX; x < OX + OW; x++) { const v = buf[o + y * W + x]; ys += v; if (v < ylo) ylo = v; if (v > yhi) yhi = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x >= OX && x < OX + OW && y >= OY && y < OY + OH) continue;
      const v = buf[o + y * W + x]; if (v < outLo) outLo = v; if (v > outHi) outHi = v;
    }
    for (let y = OY / 2; y < (OY + OH) / 2; y++) for (let x = OX / 2; x < (OX + OW) / 2; x++) ocb += buf[o + ysz + y * (W / 2) + x];
    out.push({ovY: ys / (OW * OH), ovFlat: ylo === yhi, ovCb: ocb / ((OW / 2) * (OH / 2)), outY: outLo, outFlat: outLo === outHi, cbOut: buf[o + ysz + 30 * (W / 2) + 4], crOut: buf[o + ysz + csz + 30 * (W / 2) + 4]});
  }
  return out;
}
// the label of what the overlay rectangle shows, from raw pixels
export function classifyByPlanes(frames) {
  return frames.map((f) => {
    if (f.ovFlat && Math.abs(f.ovCb - CB_OV) < 0.01) return `O:${Math.round(f.ovY - 186)}`;
    if (f.ovFlat && Math.abs(f.ovCb - CB_BASE) < 0.01) return `B:${Math.round(f.ovY - 16)}`;
    return '?';
  });
}
// the base frame number the rest of the picture shows (luma 16+n outside the rectangle)
export const baseNumbers = (frames) => frames.map((f) => (f.outFlat ? Math.round(f.outY - 16) : -1));

// runs of equal labels: [{label, from, to}]
export function runsOf(labels) {
  const out = [];
  labels.forEach((l, i) => { if (out.length && out[out.length - 1].label === l) out[out.length - 1].to = i; else out.push({label: l, from: i, to: i}); });
  return out;
}
// collapse a label stream into: overlay counter runs {first, last} and the base-only stretch
export function summarize(labels) {
  const ov = labels.map((l, i) => (l.startsWith('O:') ? i : -1)).filter((i) => i >= 0);
  const base = labels.map((l, i) => (l.startsWith('B:') ? i : -1)).filter((i) => i >= 0);
  const ovIds = ov.map((i) => Number(labels[i].slice(2)));
  const lastId = ovIds.length ? ovIds[ovIds.length - 1] : null;
  const lastIdCount = ovIds.filter((m) => m === lastId).length;
  return {
    firstOv: ov.length ? ov[0] : null, lastOv: ov.length ? ov[ov.length - 1] : null, nOv: ov.length, nBaseOnly: base.length,
    firstBaseOnly: base.length ? base[0] : null, lastId, lastIdCount, firstId: ovIds.length ? ovIds[0] : null,
    ovIdsDistinct: new Set(ovIds).size, ovCounterRises: ovIds.every((m, i) => !i || m >= ovIds[i - 1]),
    unknown: labels.filter((l) => l === '?').length,
  };
}

export function measure(file, md5s) {
  const ovCrop = classifyByHash(cropMd5(file, OW, OH, OX, OY), md5s.ovSrc, md5s.baseAtOv);
  const raw = rawRegions(file);
  const byPlanes = classifyByPlanes(raw);
  const base = baseNumbers(raw);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames:format=duration', '-of', 'default=nw=1', file], {encoding: 'utf8'});
  const pf = Number((/nb_read_frames=(\d+)/.exec(probe.stdout) ?? [])[1]);
  const pd = Number((/duration=([\d.]+)/.exec(probe.stdout) ?? [])[1]);
  return {
    framesMd5: ovCrop.length, framesRaw: raw.length, framesProbe: pf, probeDuration: pd, seconds: raw.length / FPS,
    byHash: ovCrop, byPlanes, base,
    s: summarize(byPlanes), runs: runsOf(byPlanes).map((r) => ({label: r.label.startsWith('B:') ? 'B' : r.label.startsWith('O:') ? `O:${r.label.slice(2)}` : '?', from: r.from, to: r.to})),
    baseKeepsPlaying: base.every((b, i) => b === i), baseLast: base[base.length - 1],
    // picture outside the rectangle is always exactly the base frame i (flat, luma 16+i, cb 96, cr 128)
    outsideOk: raw.every((f, i) => f.outFlat && f.outY === 16 + i && f.cbOut === CB_BASE && f.crOut === 128),
    agree: JSON.stringify(ovCrop) === JSON.stringify(byPlanes),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const clips = makeClips(dir);
  const md5s = {ovSrc: cropMd5(clips.ov, OW, OH, 0, 0), baseAtOv: cropMd5(clips.base, OW, OH, OX, OY)};
  const baseRaw = rawFlat(clips.base), ovRaw = rawFlat(clips.ov, OW, OH);
  const ev = {
    ffmpeg: ffmpegVersion(),
    clips: {
      baseFrames: baseRaw.length, baseSeconds: baseRaw.length / FPS, overlayFrames: ovRaw.length, overlaySeconds: ovRaw.length / FPS,
      baseRule: baseRaw.every((f, i) => f.flat && f.y === 16 + i && f.cb === CB_BASE), overlayRule: ovRaw.every((f, i) => f.flat && f.y === 186 + i && f.cb === CB_OV),
      distinctOverlay: new Set(md5s.ovSrc).size, distinctBase: new Set(md5s.baseAtOv).size, shared: md5s.ovSrc.filter((h) => md5s.baseAtOv.includes(h)).length,
    },
    runs: {},
  };
  for (const name of Object.keys(CASES)) {
    const f = makeCase(clips, dir, name);
    ev.runs[name] = {name, command: commandOf(name), opt: CASES[name].opt, delay: CASES[name].delay, ...measure(f, md5s)};
  }
  return ev;
}
// helper: per frame flatness, luma and cb of a whole clip (used to check the source clips)
export function rawFlat(file, w = W, h = H) {
  const r = ffm(['-i', file, '-an', '-fps_mode', 'passthrough', '-frames:v', '400', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], {});
  const buf = r.stdout, ysz = w * h, csz = ysz / 4, fsz = ysz + 2 * csz, n = buf.length / fsz;
  const out = [];
  for (let i = 0; i < n; i++) {
    const o = i * fsz; let lo = 255, hi = 0;
    for (let k = 0; k < ysz; k++) { const v = buf[o + k]; if (v < lo) lo = v; if (v > hi) hi = v; }
    out.push({flat: lo === hi, y: lo, cb: buf[o + ysz]});
  }
  return out;
}
