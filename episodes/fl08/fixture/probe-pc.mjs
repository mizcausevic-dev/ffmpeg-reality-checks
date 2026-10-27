// probe-pc.mjs: how do I write a PURE color range label (pc, tv or none) on THIS ffmpeg build?
// Self-contained (node 18+, no repo imports, argument arrays only, os.tmpdir, CRLF safe). Works on any build; colordetect columns are filled only when the filter exists.
//
// Usage:   node episodes/fl08/fixture/probe-pc.mjs            (prints a table, takes about 20 s)
//          node episodes/fl08/fixture/probe-pc.mjs --json out.json   (also writes every row as JSON)
//
// Input: a 256 x 16, 3 frame yuv420p ramp with Y 0..255 across the columns (Cb = Cr = 128), written from Node and piped to ffmpeg as rawvideo.
// For each combination of codec/container x construction x tag the script writes a file, then reads it back three ways:
//   bytes   decoded planes written with `-f rawvideo` (no pix_fmt, so no conversion); "same" means identical to the input bytes, otherwise Y min..max of the decoded bytes
//   ffprobe stream color_range and pix_fmt
//   rgb G   the green channel of the first row after `-pix_fmt rgb24`: number of distinct levels and min..max (the full ramp shows 256 levels only when nothing was clipped)
//   cd      colordetect verdict (mode=color_range), 8.x only
// A construction is a PURE LABEL on this build when: bytes = same, and ffprobe reads back what was written.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const W = 256, H = 16, N = 3, FRAME = W * H * 3 / 2;
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-probe-pc-'));

const sh = (cmd, args, input) => {
  const r = spawnSync(cmd, args, {input, maxBuffer: 1 << 28});
  return {status: r.status, stdout: r.stdout ?? Buffer.alloc(0), stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8'), error: r.error};
};
const first = (s) => (s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-1)[0] ?? '').slice(0, 90);

if (sh('ffmpeg', ['-version']).status !== 0 || sh('ffprobe', ['-version']).status !== 0) { console.error('ffmpeg or ffprobe not found on PATH'); process.exit(2); }
const version = sh('ffmpeg', ['-hide_banner', '-version']).stdout.toString().split(/\r?\n/)[0];
const encoders = sh('ffmpeg', ['-hide_banner', '-encoders']).stdout.toString();
const haveEnc = (n) => new RegExp(`^\\s*V\\S*\\s+${n}\\b`, 'm').test(encoders);
const haveColordetect = /colordetect/.test(sh('ffmpeg', ['-hide_banner', '-filters']).stdout.toString());

// the source: Y = column value (0..255), chroma 128
const src = Buffer.alloc(FRAME * N);
for (let f = 0; f < N; f++) {
  const o = f * FRAME;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) src[o + y * W + x] = x;
  src.fill(128, o + W * H, o + FRAME);
}

const IN = (pre = [], pix = 'yuv420p') => [...pre, '-f', 'rawvideo', '-pix_fmt', pix, '-s', `${W}x${H}`, '-r', '3', '-i', '-'];
const BIT = ['-fflags', '+bitexact', '-flags:v', '+bitexact'];

// combinations of codec and container (skipped when the encoder is missing)
const combos = [
  {id: 'ffv1/mkv', enc: 'ffv1', codec: ['-c:v', 'ffv1'], ext: 'mkv'},
  {id: 'ffv1/nut', enc: 'ffv1', codec: ['-c:v', 'ffv1'], ext: 'nut'},
  {id: 'ffv1/mov', enc: 'ffv1', codec: ['-c:v', 'ffv1'], ext: 'mov'},
  {id: 'rawvideo/mkv', enc: 'rawvideo', codec: ['-c:v', 'rawvideo'], ext: 'mkv'},
  {id: 'rawvideo/nut', enc: 'rawvideo', codec: ['-c:v', 'rawvideo'], ext: 'nut'},
  {id: 'rawvideo/mov', enc: 'rawvideo', codec: ['-c:v', 'rawvideo'], ext: 'mov'},
  {id: 'utvideo/mkv', enc: 'utvideo', codec: ['-c:v', 'utvideo'], ext: 'mkv'},
  {id: 'ffvhuff/mkv', enc: 'ffvhuff', codec: ['-c:v', 'ffvhuff'], ext: 'mkv'},
  {id: 'x264-lossless/mkv', enc: 'libx264', codec: ['-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast'], ext: 'mkv', x264: true},
  {id: 'x264-lossless/mp4', enc: 'libx264', codec: ['-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast'], ext: 'mp4', x264: true},
];

// constructions: how the label is written. t is 'tv' or 'pc'; null means no label at all.
const constructions = [
  {id: 'none', tags: [null], args: () => ({pre: [], mid: []})},
  {id: 'vf setparams=range=', tags: ['tv', 'pc'], args: (t) => ({pre: [], mid: ['-vf', `setparams=range=${t}`]})},
  {id: 'out -color_range', tags: ['tv', 'pc'], args: (t) => ({pre: [], mid: ['-color_range', t]})},
  {id: 'in -color_range', tags: ['tv', 'pc'], args: (t) => ({pre: ['-color_range', t], mid: []})},
  {id: 'in+out -color_range', tags: ['pc'], args: (t) => ({pre: ['-color_range', t], mid: ['-color_range', t]})},
  {id: 'vf setparams + out opt', tags: ['pc'], args: (t) => ({pre: [], mid: ['-vf', `setparams=range=${t}`, '-color_range', t]})},
  {id: 'in pix_fmt yuvj420p', tags: ['pc'], pix: 'yuvj420p', args: () => ({pre: [], mid: []})},
  {id: 'out pix_fmt yuvj420p', tags: ['pc'], args: () => ({pre: [], mid: ['-pix_fmt', 'yuvj420p']}), converts: true},
  {id: 'vf scale=out_range=', tags: ['tv', 'pc'], args: (t) => ({pre: [], mid: ['-vf', `scale=out_range=${t === 'pc' ? 'full' : 'limited'}`]}), converts: true},
  {id: 'bsf h264_metadata full_range', tags: ['tv', 'pc'], x264Only: true, args: (t) => ({pre: [], mid: ['-bsf:v', `h264_metadata=video_full_range_flag=${t === 'pc' ? 1 : 0}`]})},
];
// rows kept small on purpose: the "none" baseline for every combo, the label constructions for ffv1/mkv on every tag, the rest for pc and tv only where they can differ.

const planeStats = (buf) => {
  let mn = 255, mx = 0, n = Math.floor(buf.length / FRAME);
  for (let f = 0; f < n; f++) for (let i = f * FRAME; i < f * FRAME + W * H; i++) { const v = buf[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
  return `${mn}..${mx}`;
};

function probeFile(file) {
  const out = {};
  const raw = sh('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-f', 'rawvideo', '-']);
  if (raw.status !== 0) out.bytes = `ERR ${first(raw.stderr)}`;
  else out.bytes = raw.stdout.length === src.length ? (raw.stdout.equals(src) ? 'same' : `CHANGED Y ${planeStats(raw.stdout)}`) : `SIZE ${raw.stdout.length}/${src.length} Y ${planeStats(raw.stdout)}`;
  const pr = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_range,pix_fmt', '-of', 'default=nw=1', file]).stdout.toString();
  out.tag = /color_range=(\S+)/.exec(pr)?.[1] ?? 'absent';
  out.pix = /pix_fmt=(\S+)/.exec(pr)?.[1] ?? '?';
  const rgb = sh('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  if (rgb.status !== 0 || rgb.stdout.length < W * 3) out.rgb = 'ERR';
  else { const g = []; for (let x = 0; x < W; x++) g.push(rgb.stdout[x * 3 + 1]); out.rgb = `${new Set(g).size} lv ${Math.min(...g)}..${Math.max(...g)}`; }
  if (haveColordetect) {
    const c = sh('ffmpeg', ['-hide_banner', '-nostats', '-v', 'info', '-i', file, '-vf', 'colordetect=mode=color_range', '-an', '-f', 'null', '-']);
    const t = /Color range:\s*(.*?)\s*$/m.exec(c.stderr.replace(/\r/g, ''))?.[1];
    out.cd = c.status !== 0 ? 'ERR' : t ? (/full|JPEG/i.test(t) ? 'full' : /undetermined/i.test(t) ? 'undetermined' : t) : 'no block';
  }
  return out;
}

const rows = [];
let k = 0;
for (const combo of combos) {
  if (!haveEnc(combo.enc)) { console.error(`skip ${combo.id}: encoder ${combo.enc} not available`); continue; }
  for (const con of constructions) {
    if (con.x264Only && !combo.x264) continue;
    // the full cross product is only for the default container; the other containers get none, setparams and the output option
    if (combo.id !== 'ffv1/mkv' && !['none', 'vf setparams=range=', 'out -color_range', 'in -color_range'].includes(con.id) && !(con.x264Only)) continue;
    for (const tag of con.tags) {
      const {pre, mid} = con.args(tag);
      const file = path.join(dir, `p${k++}.${combo.ext}`);
      const args = ['-hide_banner', '-v', 'error', '-y', ...IN(pre, con.pix ?? 'yuv420p'), ...mid, ...combo.codec, ...BIT, file];
      const w = sh('ffmpeg', args, src);
      const row = {combo: combo.id, construction: con.id, tag: tag ?? 'none', converts: !!con.converts};
      if (w.status !== 0) Object.assign(row, {bytes: `WRITE FAILED: ${first(w.stderr)}`, tag_read: '-', pix: '-', rgb: '-', cd: haveColordetect ? '-' : undefined});
      else { const p = probeFile(file); Object.assign(row, {bytes: p.bytes, tag_read: p.tag, pix: p.pix, rgb: p.rgb, cd: p.cd}); }
      row.pure = row.bytes === 'same' && (row.tag === 'none' || row.tag_read === row.tag);
      rows.push(row);
    }
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`# ${version}`);
console.log(`# input: ${W}x${H} yuv420p ramp, Y 0..255, ${N} frames. colordetect filter: ${haveColordetect ? 'present' : 'absent'}`);
console.log('# PURE = bytes same as the input AND ffprobe reads back the tag that was written');
console.log([pad('codec/container', 18), pad('construction', 30), pad('tag', 5), pad('bytes', 28), pad('ffprobe', 9), pad('pix_fmt', 10), pad('rgb24 G (levels, range)', 24), haveColordetect ? pad('colordetect', 13) : '', 'PURE'].join(' '));
for (const r of rows) console.log([pad(r.combo, 18), pad(r.construction, 30), pad(r.tag, 5), pad(r.bytes, 28), pad(r.tag_read, 9), pad(r.pix, 10), pad(r.rgb, 24), haveColordetect ? pad(r.cd, 13) : '', r.pure ? 'PURE' : (r.converts ? 'converts (expected)' : '')].join(' '));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({version, haveColordetect, rows}, null, 1));
fs.rmSync(dir, {recursive: true, force: true});
