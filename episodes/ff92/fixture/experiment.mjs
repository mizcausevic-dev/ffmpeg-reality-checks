// Episode 92 fixture: "libx264 -g 250 and hard cuts: where do the keyframes really go?"
// Synthetic input only: one 160x120, 25 fps, 300 frame clip written by Node as raw yuv420p. Inside a scene the picture is a field of per pixel noise that slides one pixel
// to the left every frame (so a P frame predicts it almost for free); at frames 60, 130 and 210 a hard cut puts a different noise field in its place. A control clip has no cut.
// libx264 is run with -g 250 (keyint 250) and: the defaults, -sc_threshold 0, -x264-params scenecut=0, -keyint_min 250, -x264-params keyint=250:min-keyint=250, and a sweep of -keyint_min.
// Readers of the result (the same file, four ways): reader 1 = ffprobe packets (the K flag), reader 2 = ffprobe frames (pict_type I and key_frame),
// reader 3 = Node reading the raw H.264 bytes (NAL type 5 = IDR slice, and the slice_type of every slice: I, P or B), reader 4 = x264's own summary line (frame I:N) on stderr.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 160, H = 120, N = 300, FPS = 25, FSZ = W * H * 3 / 2;
export const CUTS = [60, 130, 210];
export const KEYINT = 250;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const SWEEP = [25, 60, 61, 126, 250];     // -keyint_min values

const run = (cmd, args, cwd) => spawnSync(cmd, args, {cwd, maxBuffer: 1 << 28});
const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const sceneOf = (f, cuts) => cuts.filter((c) => f >= c).length;
export const lumaAt = (x, y, f, cuts) => { const s = sceneOf(f, cuts), t = f - [0, ...cuts][s]; return 16 + (hash(x + t, y, s + 1) % 200); };

export function makeSource(cuts) {
  const b = Buffer.alloc(FSZ * N);
  for (let f = 0; f < N; f++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b[f * FSZ + y * W + x] = lumaAt(x, y, f, cuts);
    b.fill(128, f * FSZ + W * H, (f + 1) * FSZ);
  }
  return b;
}
// reader of the source: frames where the picture is NOT the previous frame slid by one pixel (the cuts), found from the raw bytes
export function cutsIn(raw) {
  const out = [];
  for (let f = 1; f < raw.length / FSZ; f++) {
    let bad = 0;
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W - 1; x += 4) if (raw[f * FSZ + y * W + x] !== raw[(f - 1) * FSZ + y * W + x + 1]) bad++;
    if (bad > 20) out.push(f);
  }
  return out;
}

// reader 3: raw H.264 (Annex B). Returns, per access unit in decode order, {idr, sliceType}
const ueReader = (buf, off) => { let bit = off * 8; const rd = () => (buf[bit >> 3] >> (7 - (bit & 7))) & 1; return () => { let z = 0; while (rd() === 0 && z < 32) { bit++; z++; } bit++; let v = 1; for (let i = 0; i < z; i++) { v = (v << 1) | rd(); bit++; } return v - 1; }; };
export function readH264(buf) {
  const aus = []; const n = buf.length;
  for (let i = 0; i + 4 < n; i++) {
    if (buf[i] === 0 && buf[i + 1] === 0 && buf[i + 2] === 1) {
      const type = buf[i + 3] & 0x1f;
      if (type === 1 || type === 5) {
        // unescape the first bytes (00 00 03 -> 00 00)
        const head = []; for (let j = i + 4; j < Math.min(n, i + 24); j++) { if (head.length >= 2 && head[head.length - 1] === 0 && head[head.length - 2] === 0 && buf[j] === 3) continue; head.push(buf[j]); }
        const hb = Buffer.from(head); const ue = ueReader(hb, 0);
        const firstMb = ue(), st = ue() % 5; // 0 P, 1 B, 2 I, 3 SP, 4 SI
        if (firstMb === 0) aus.push({idr: type === 5, sliceType: 'PBI'[st] ?? '?'});
      }
    }
  }
  return aus;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ffmpeg = ffmpegVersion();
  const ev = {ffmpeg, src: {}, cells: {}, sweep: {}};
  const clips = {cuts: CUTS, still: []};
  for (const [name, cuts] of Object.entries(clips)) {
    const raw = makeSource(cuts);
    fs.writeFileSync(path.join(dir, `src_${name}.yuv`), raw);
    ev.src[name] = {frames: raw.length / FSZ, cuts: cutsIn(raw)};
  }
  const encode = (clip, extra, tag) => {
    const mp4 = `o_${tag}.mp4`, h264 = `o_${tag}.h264`;
    const r = run('ffmpeg', ['-hide_banner', '-v', 'info', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', `src_${clip}.yuv`, '-c:v', 'libx264', '-g', String(KEYINT), ...extra, mp4], dir);
    if (r.status !== 0) return {status: r.status, err: r.stderr.toString().trim().split(/\r?\n/).pop()};
    const log = r.stderr.toString();
    const x264I = Number((log.match(/frame I:\s*(\d+)/) ?? [])[1]);
    const gop = (log.match(/(?:^|\s)(?:keyint=|-g )?(\d+)/) ?? [])[0];
    // reader 1: packets in decode order
    const pj = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,size,flags', '-of', 'json', mp4], dir).stdout.toString()).packets;
    const pts = pj.map((p) => Number(p.pts_time)), p0 = Math.min(...pts), idx = (p) => Math.round((Number(p) - p0) * FPS);
    const kFlags = pj.map((p, i) => (String(p.flags).startsWith('K') ? idx(p.pts_time) : -1)).filter((v) => v >= 0).sort((a, b) => a - b);
    // reader 2: decoded frames
    const fj = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time,pict_type,key_frame', '-of', 'json', mp4], dir).stdout.toString()).frames;
    const fp = fj.map((f) => ({i: idx(f.pts_time), t: f.pict_type, k: f.key_frame === 1 || f.key_frame === '1'}));
    const iFrames = fp.filter((f) => f.t === 'I').map((f) => f.i).sort((a, b) => a - b);
    const keyFrameFlag = fp.filter((f) => f.k).map((f) => f.i).sort((a, b) => a - b);
    // reader 3: the bytes
    const c = run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', mp4, '-c', 'copy', '-f', 'h264', h264], dir);
    const aus = c.status === 0 ? readH264(fs.readFileSync(path.join(dir, h264))) : [];
    const order = pj.map((p) => idx(p.pts_time));  // decode order index -> display position
    const idr = aus.map((a, i) => (a.idr ? order[i] : -1)).filter((v) => v >= 0).sort((a, b) => a - b);
    const sliceI = aus.map((a, i) => (a.sliceType === 'I' ? order[i] : -1)).filter((v) => v >= 0).sort((a, b) => a - b);
    const sizes = pj.map((p) => Number(p.size));
    const bySize = {}; pj.forEach((p) => { bySize[idx(p.pts_time)] = Number(p.size); });
    const rec = {status: 0, packets: pj.length, frames: fj.length, aus: aus.length, kFlags, iFrames, keyFrameFlag, idr, sliceI, x264I, total: sizes.reduce((a, b) => a + b, 0), atCuts: CUTS.map((f) => bySize[f]), sizesHash: crypto.createHash('sha1').update(sizes.join(',')).digest('hex').slice(0, 12), types: fp.reduce((a, f) => { a[f.t] = (a[f.t] ?? 0) + 1; return a; }, {})};
    for (const f of [mp4, h264]) fs.rmSync(path.join(dir, f), {force: true});
    return rec;
  };
  const CFG = {
    default: [],
    sc0: ['-sc_threshold', '0'],
    x264sc0: ['-x264-params', 'scenecut=0'],
    keyintmin: ['-keyint_min', String(KEYINT)],
    x264min: ['-x264-params', `keyint=${KEYINT}:min-keyint=${KEYINT}`],
  };
  let k = 0;
  for (const clip of ['cuts', 'still']) for (const [name, extra] of Object.entries(CFG)) ev.cells[`${clip}|${name}`] = encode(clip, extra, `c${k++}`);
  for (const m of SWEEP) ev.sweep[String(m)] = encode('cuts', ['-keyint_min', String(m)], `s${m}`);
  return ev;
}
