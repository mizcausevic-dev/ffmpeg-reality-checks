// Episode 59 fixture: "select=eq(pict_type\,I) gives me 99 frames instead of 4: where do the duplicates come from?"
// Synthetic input only (lavfi, lossless x264, mkv, 96x72, 25 fps, yuv420p, no B-frames). Frame N is a flat card of luma 16 + 2 N, so a frame names its source index.
//   clip A  100 frames, keyframes (I) at frames 0, 25, 50, 75
//   clip B  100 frames, keyframes at frames 0, 10, 40, 41 (forced, so the gaps between them differ)
// Every case runs  select=eq(pict_type\,I)  and writes PNG files (or an mp4), changing only the frame rate mode of the output.
// Readers:
//   reader 1  the files themselves: every PNG written is hashed in Node (sha256 of the bytes) and looked up in the PNGs of all 100 source frames;
//             for mp4 outputs, ffprobe counts the frames and their decoded md5 is looked up
//   reader 2  ffmpeg framemd5 of the same filter chain and the same options (the hash of each frame that leaves the filter graph), plus ffmpeg's own dup= and drop= counters from its progress line
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 96, H = 72, FPS = 25, FRAMES = 100;
export const KEYS = {A: [0, 25, 50, 75], B: [0, 10, 40, 41]};
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const SEL = 'select=eq(pict_type\\,I)';

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

// name: {clip, out, vf, pre (input options), post (output options), md5post (the same mode for framemd5), cmd (shown)}
export const CASES = {
  all:        {clip: 'A', out: 'png', vf: null, post: [], md5post: ['-fps_mode', 'cfr']},
  default:    {clip: 'A', out: 'png', vf: SEL, post: [], md5post: ['-fps_mode', 'cfr']},
  vfr:        {clip: 'A', out: 'png', vf: SEL, post: ['-fps_mode', 'vfr']},
  passthrough:{clip: 'A', out: 'png', vf: SEL, post: ['-fps_mode', 'passthrough']},
  vsync0:     {clip: 'A', out: 'png', vf: SEL, post: ['-vsync', '0']},
  vsyncvfr:   {clip: 'A', out: 'png', vf: SEL, post: ['-vsync', 'vfr']},
  cfr:        {clip: 'A', out: 'png', vf: SEL, post: ['-fps_mode', 'cfr']},
  setpts:     {clip: 'A', out: 'png', vf: `${SEL},setpts=N/25/TB`, post: [], md5post: ['-fps_mode', 'cfr']},
  skipframe:  {clip: 'A', out: 'png', vf: null, pre: ['-skip_frame', 'nokey'], post: [], md5post: ['-fps_mode', 'cfr']},
  mp4:        {clip: 'A', out: 'mp4', vf: SEL, post: [], md5post: ['-fps_mode', 'cfr']},
  mp4vfr:     {clip: 'A', out: 'mp4', vf: SEL, post: ['-fps_mode', 'vfr']},
  irregular:  {clip: 'B', out: 'png', vf: SEL, post: [], md5post: ['-fps_mode', 'cfr']},
  irregularVfr:{clip: 'B', out: 'png', vf: SEL, post: ['-fps_mode', 'vfr']},
};
export const commandOf = (name) => {
  const c = CASES[name];
  const src = c.clip === 'A' ? 'a.mkv' : 'b.mkv';
  const pre = (c.pre ?? []).join(' ');
  const vf = c.vf ? ` -vf "${c.vf}"` : '';
  const post = c.post.length ? ` ${c.post.join(' ')}` : '';
  return `ffmpeg ${pre ? pre + ' ' : ''}-i ${src}${vf}${post} ${c.out === 'png' ? 'out_%03d.png' : 'out.mp4'}`;
};

export function makeSource(dir, clip) {
  const f = path.join(dir, clip === 'A' ? 'a.mkv' : 'b.mkv');
  const gop = clip === 'A' ? ['-g', '25', '-keyint_min', '25'] : ['-g', '250', '-keyint_min', '250', '-force_key_frames', '0.4,1.6,1.64'];
  ffm(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${FRAMES / FPS},format=yuv420p,geq=lum='16+2*N':cb=128:cr=128`,
    '-c:v', 'libx264', '-qp', '0', ...gop, '-sc_threshold', '0', '-bf', '0', '-pix_fmt', 'yuv420p', f]);
  return f;
}

const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const md5Lines = (stdout) => stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
export function framemd5(file, {pre = [], vf = null, post = [], fmt = null} = {}) {
  const chain = [vf, fmt].filter(Boolean).join(',');
  const r = spawnSync('ffmpeg', ['-v', 'error', ...pre, '-i', file, '-an', ...(chain ? ['-vf', chain] : []), ...post, '-f', 'framemd5', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`framemd5 failed: ${r.stderr}`);
  return md5Lines(r.stdout);
}
// reference tables: every source frame as a PNG hash, as an rgb24 frame hash, and as a native yuv420p frame hash
export function references(src, dir) {
  const d = path.join(dir, 'ref'); fs.mkdirSync(d, {recursive: true});
  ffm(['-i', src, '-fps_mode', 'passthrough', path.join(d, 'r_%03d.png')]);
  const png = Array.from({length: FRAMES}, (_, i) => sha(path.join(d, `r_${String(i + 1).padStart(3, '0')}.png`)));
  const rgb = framemd5(src, {fmt: 'format=rgb24', post: ['-fps_mode', 'passthrough']});
  const yuv = framemd5(src, {post: ['-fps_mode', 'passthrough']});
  return {png, rgb, yuv};
}
export const lookup = (hashes, table) => { const m = new Map(table.map((h, i) => [h, i])); return hashes.map((h) => (m.has(h) ? m.get(h) : -1)); };
// runs of equal source index: [{src, count}]
export const runsOf = (idx) => { const out = []; for (const s of idx) { if (out.length && out[out.length - 1].src === s) out[out.length - 1].count++; else out.push({src: s, count: 1}); } return out; };

function statsOf(stderr) {
  const last = String(stderr).split(/[\r\n]+/).filter((l) => /frame=/.test(l)).pop() ?? '';
  const dup = /dup=(\d+)/.exec(last), drop = /drop=(\d+)/.exec(last), fr = /frame=\s*(\d+)/.exec(last);
  return {frame: fr ? Number(fr[1]) : null, dup: dup ? Number(dup[1]) : 0, drop: drop ? Number(drop[1]) : 0};
}

export function runCase(name, srcs, refs, dir) {
  const c = CASES[name];
  const src = srcs[c.clip];
  const od = path.join(dir, name); fs.rmSync(od, {recursive: true, force: true}); fs.mkdirSync(od, {recursive: true});
  const pre = c.pre ?? [];
  const vfArgs = c.vf ? ['-vf', c.vf] : [];
  const outFile = c.out === 'png' ? path.join(od, 'o_%03d.png') : path.join(od, 'out.mp4');
  const codec = c.out === 'mp4' ? ['-c:v', 'libx264', '-qp', '0'] : [];
  const r = spawnSync('ffmpeg', ['-v', 'error', '-stats', '-y', ...pre, '-i', src, ...vfArgs, ...c.post, ...codec, outFile], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${name}: ${r.stderr}`);
  const stats = statsOf(r.stderr);
  let r1, extra = {};
  if (c.out === 'png') {
    const files = fs.readdirSync(od).filter((f) => f.endsWith('.png')).sort();
    r1 = lookup(files.map((f) => sha(path.join(od, f))), refs.png);
    extra = {files: files.length, distinctFiles: new Set(files.map((f) => sha(path.join(od, f)))).size};
  } else {
    r1 = lookup(framemd5(outFile, {post: ['-fps_mode', 'passthrough']}), refs.yuv);
    const pr = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames:format=duration', '-of', 'csv=p=0', outFile], {encoding: 'utf8'});
    const [nb, dur] = pr.stdout.trim().split(/\r?\n/);
    extra = {files: Number(nb), distinctFiles: new Set(r1).size, durationS: Number(dur)};
  }
  // reader 2: framemd5 of the same filter chain and options
  const r2 = lookup(framemd5(src, {pre, vf: c.vf, fmt: c.out === 'png' ? 'format=rgb24' : null, post: c.md5post ?? c.post}), c.out === 'png' ? refs.rgb : refs.yuv);
  const keys = KEYS[c.clip];
  return {
    name, command: commandOf(name), clip: c.clip, out: c.out,
    frames: r1.length, framesMd5: r2.length, distinct: new Set(r1).size, unknown: r1.filter((x) => x < 0).length,
    bySrcFiles: r1, bySrcMd5: r2, runs: runsOf(r1), dupFrames: r1.length - new Set(r1).size,
    statsFrame: stats.frame, statsDup: stats.dup, statsDrop: stats.drop,
    keys, onlyKeyframes: r1.every((s) => keys.includes(s)), allKeysShown: keys.every((k) => r1.includes(k)),
    ...extra,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const srcs = {A: makeSource(dir, 'A'), B: makeSource(dir, 'B')};
  const probeI = (f) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pict_type', '-of', 'csv=p=0', f], {encoding: 'utf8'}).stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean).map((t, i) => [i, t]).filter(([, t]) => t === 'I').map(([i]) => i);
  const refsA = references(srcs.A, path.join(dir, 'A')), refsB = references(srcs.B, path.join(dir, 'B'));
  const ev = {
    ffmpeg: ffmpegVersion(),
    clips: {frames: FRAMES, A: {iFrames: probeI(srcs.A), distinct: new Set(refsA.png).size}, B: {iFrames: probeI(srcs.B), distinct: new Set(refsB.png).size}},
    runs: {},
  };
  const dirs = {A: path.join(dir, 'A'), B: path.join(dir, 'B')};
  for (const name of Object.keys(CASES)) ev.runs[name] = runCase(name, srcs, CASES[name].clip === 'A' ? refsA : refsB, dirs[CASES[name].clip]);
  return ev;
}
