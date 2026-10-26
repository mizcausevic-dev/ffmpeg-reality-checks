// Episode 26 fixture: "Why does my video look washed out? Limited range vs full range."
// Synthetic source only: a 256x80 RGB gray test card (lavfi geq), stored losslessly (FFV1, bgr0), 2 frames:
//   band 0 rows 0-15   ramp 0..255 (value = x)
//   band 1 rows 16-31  pure black   (R=G=B=0)
//   band 2 rows 32-47  pure white   (R=G=B=255)
//   band 3 rows 48-63  shadow patch (R=G=B=8)
//   band 4 rows 64-79  highlight    (R=G=B=247)
// Each encode is read back three independent ways:
//   reader 1  ffprobe (pix_fmt, color_range tag) + ffmpeg signalstats YMIN/YMAX on a crop of each patch
//   reader 2  raw native plane dump (no pix_fmt conversion), Y byte read in Node, plus md5 of the whole raw frame
//   display   what a tag-trusting player shows: ffmpeg converting to gray (swscale honors the tag) and the same rule in Node arithmetic
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 256, H = 80;
export const PATCHES = {black: {band: 1, rgb: 0}, white: {band: 2, rgb: 255}, shadow: {band: 3, rgb: 8}, highlight: {band: 4, rgb: 247}};
const px = (name) => ({x: 128, y: PATCHES[name].band * 16 + 8});

export const CASES = {
  default:      {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuv420p out.mp4',                               args: ['-pix_fmt', 'yuv420p']},
  tv:           {command: 'ffmpeg -i src.mkv -c:v libx264 -color_range tv -pix_fmt yuv420p out.mp4',               args: ['-color_range', 'tv', '-pix_fmt', 'yuv420p']},
  pc_tag:       {command: 'ffmpeg -i src.mkv -c:v libx264 -color_range pc -pix_fmt yuv420p out.mp4',               args: ['-color_range', 'pc', '-pix_fmt', 'yuv420p']},
  yuvj:         {command: 'ffmpeg -i src.mkv -c:v libx264 -pix_fmt yuvj420p out.mp4',                              args: ['-pix_fmt', 'yuvj420p']},
  scale_full:   {command: 'ffmpeg -i src.mkv -vf scale=out_range=full -c:v libx264 -pix_fmt yuv420p out.mp4',      args: ['-vf', 'scale=out_range=full', '-pix_fmt', 'yuv420p']},
  scale_limited:{command: 'ffmpeg -i src.mkv -vf scale=out_range=limited -c:v libx264 -pix_fmt yuv420p out.mp4',   args: ['-vf', 'scale=out_range=limited', '-pix_fmt', 'yuv420p']},
  wrong_tv:     {command: 'ffmpeg -i src.mkv -vf scale=out_range=full -c:v libx264 -color_range tv -pix_fmt yuv420p out.mp4', args: ['-vf', 'scale=out_range=full', '-color_range', 'tv', '-pix_fmt', 'yuv420p']},
  // Build-independent relabels: stream copy, only the VUI full_range flag is rewritten, the coded pixels are not touched.
  relabel_pc:   {command: 'ffmpeg -i default.mp4 -c copy -bsf:v h264_metadata=video_full_range_flag=1 out.mp4', from: 'default', bsf: 'h264_metadata=video_full_range_flag=1'},
  relabel_tv:   {command: 'ffmpeg -i yuvj.mp4 -c copy -bsf:v h264_metadata=video_full_range_flag=0 out.mp4',    from: 'yuvj',    bsf: 'h264_metadata=video_full_range_flag=0'},
};

// 'v6' (6.x), 'v8' (8.x) or 'other': the encodes of -color_range differ between these builds (episode 26)
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

export const levelsRange = (tag) => (tag === 'pc' || tag === 'jpeg' ? 'full' : 'limited'); // what a tag-trusting player assumes; no tag means limited
export const asFull = (y) => y;                                                           // player treats the byte as already full range
export const asLimited = (y) => Math.min(255, Math.max(0, Math.round((y - 16) * 255 / 219))); // player stretches 16..235 to 0..255
export const shown = (y, tag) => (levelsRange(tag) === 'full' ? asFull(y) : asLimited(y));

export function probeTag(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt,color_range', '-of', 'default=nw=1', file], {encoding: 'utf8'});
  const o = {}; for (const l of r.stdout.split(/\r?\n/)) { const [k, v] = l.split('='); if (k && v !== undefined) o[k] = v; }
  return {pix_fmt: o.pix_fmt, color_range: o.color_range ?? 'unknown'};
}

// reader 1: signalstats on a flat crop of one patch, first frame only
export function statsOf(file, name) {
  const p = px(name);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', `crop=32:8:${p.x - 16}:${p.y - 4},signalstats,metadata=print:file=-`, '-f', 'null', '-'], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`signalstats failed: ${r.stderr}`);
  const g = (k) => Number(new RegExp(`lavfi.signalstats.${k}=(\\d+)`).exec(r.stdout)[1]);
  return {min: g('YMIN'), max: g('YMAX')};
}

// reader 2: raw frame in the file's NATIVE pixel format (no -pix_fmt, so no range conversion), first frame
export function rawFrame(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return r.stdout;
}
export const yAt = (raw, name) => { const p = px(name); return raw[p.y * W + p.x]; };
export const md5Of = (buf) => crypto.createHash('md5').update(buf).digest('hex');

// display, independent of the arithmetic above: ffmpeg converts to gray (swscale uses the stream tag), first frame
export function ffmpegGray(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', 'format=gray', '-f', 'rawvideo', '-'], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return r.stdout;
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=1:d=2,format=gbrp,geq=r='if(lt(Y,16),X,if(lt(Y,32),0,if(lt(Y,48),255,if(lt(Y,64),8,247))))':g='if(lt(Y,16),X,if(lt(Y,32),0,if(lt(Y,48),255,if(lt(Y,64),8,247))))':b='if(lt(Y,16),X,if(lt(Y,32),0,if(lt(Y,48),255,if(lt(Y,64),8,247))))'`, '-pix_fmt', 'bgr0', '-c:v', 'ffv1', 'src.mkv'], dir);
  const src = path.join(dir, 'src.mkv');
  const out = {ffmpeg: ffmpegVersion(), build: buildOf(ffmpegVersion()), source: {file: 'src.mkv', ...probeTag(src), size: `${W}x${H}`, patches: PATCHES}, cases: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, `${name}.mp4`);
    if (c.bsf) ff(['-i', `${c.from}.mp4`, '-c', 'copy', '-bsf:v', c.bsf, `${name}.mp4`], dir);
    const vf = c.bsf ? [] : c.args.includes('-vf') ? ['-vf', c.args[c.args.indexOf('-vf') + 1]] : [];
    const rest = c.bsf ? [] : c.args.filter((a, i) => a !== '-vf' && c.args[i - 1] !== '-vf');
    if (!c.bsf) ff(['-i', 'src.mkv', ...vf, '-c:v', 'libx264', ...rest, `${name}.mp4`], dir);
    const tag = probeTag(file), raw = rawFrame(file), gray = ffmpegGray(file);
    const res = {command: c.command, ...tag, patches: {}, rawMd5: md5Of(raw)};
    for (const p of Object.keys(PATCHES)) {
      const s = statsOf(file, p), y = yAt(raw, p);
      res.patches[p] = {rgb: PATCHES[p].rgb, signalstatsMin: s.min, signalstatsMax: s.max, rawY: y, shownByTag: shown(y, tag.color_range), shownByFfmpegGray: yAt(gray, p), ifPlayerAssumesFull: asFull(y), ifPlayerAssumesLimited: asLimited(y)};
    }
    out.cases[name] = res;
  }
  return out;
}
