// Episode 41 fixture: "Is -q:v 2 better than -q:v 5 for JPEG frames, and why is 2 not 'quality 2'?"
// Synthetic source only: one 640x360 frame, testsrc2 (a detailed test card) plus deterministic uniform noise, stored as a lossless PNG (rgb24).
// Every JPEG is written by ffmpeg's own native mjpeg encoder (not libjpeg), single frame, -pix_fmt yuvj444p so no chroma subsampling hides the effect.
// Every output is read two independent ways:
//   size     reader 1  the file size on the filesystem (fs.statSync)         reader 2  ffprobe format=size
//   quality  reader 1  the ffmpeg psnr filter (JPEG decoded vs the PNG, both as rgb24)   reader 2  PSNR computed in Node from raw decoded rgb24 bytes
//   step     the quantizer table (DQT marker) parsed in Node from the bytes of the JPEG: what q:v actually sets
//   pixels   reader 1  md5 of the raw rgb24 decode, computed in Node       reader 2  ffmpeg framemd5 of the native decode
// Temp files live only in the directory the caller passes in (the tests create it under os.tmpdir() and remove it).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, frameMd5} from '../../../tools/ff.mjs';

export const W = 640, H = 360;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const SRC_GRAPH = `testsrc2=s=${W}x${H}:r=1:d=1,format=rgb24,noise=alls=40:allf=t+u:all_seed=7`;
const ENC = ['-c:v', 'mjpeg', '-pix_fmt', 'yuvj444p'];

// name -> extra output options. q1 .. q31 are -q:v n; the rest are the option variants under test.
export const Q_RANGE = Array.from({length: 31}, (_, i) => i + 1);
export const CASES = {};
for (const q of Q_RANGE) CASES[`q${q}`] = {args: ['-q:v', String(q)], command: `ffmpeg -i src.png -c:v mjpeg -q:v ${q} out.jpg`};
Object.assign(CASES, {
  q5again:   {args: ['-q:v', '5'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 5 out.jpg (second run)'},
  qscale5:   {args: ['-qscale:v', '5'], command: 'ffmpeg -i src.png -c:v mjpeg -qscale:v 5 out.jpg'},
  dflt:      {args: [], command: 'ffmpeg -i src.png -c:v mjpeg out.jpg (no quality option)'},
  qmin1:     {args: ['-qmin', '1', '-q:v', '1'], command: 'ffmpeg -i src.png -c:v mjpeg -qmin 1 -q:v 1 out.jpg'},
  q5qmin10:  {args: ['-q:v', '5', '-qmin', '10'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 5 -qmin 10 out.jpg'},
  q5qmax3:   {args: ['-q:v', '5', '-qmax', '3'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 5 -qmax 3 out.jpg'},
  h5def:     {args: ['-q:v', '5', '-huffman', 'default'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 5 -huffman default out.jpg'},
  h5opt:     {args: ['-q:v', '5', '-huffman', 'optimal'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 5 -huffman optimal out.jpg'},
  h2def:     {args: ['-q:v', '2', '-huffman', 'default'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 2 -huffman default out.jpg'},
  h2opt:     {args: ['-q:v', '2', '-huffman', 'optimal'], command: 'ffmpeg -i src.png -c:v mjpeg -q:v 2 -huffman optimal out.jpg'},
});

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${r.stderr}`); };
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

// raw rgb24 bytes of the first frame of any image file
export function rawRgb(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-an', '-'], {maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffmpeg decode failed: ${r.stderr}`);
  if (r.stdout.length !== W * H * 3) throw new Error(`unexpected raw size ${r.stdout.length}`);
  return r.stdout;
}

// quality reader 2: PSNR over all rgb24 bytes, computed here
export function psnrNode(a, b) {
  let se = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; }
  return se === 0 ? Infinity : 10 * Math.log10((255 * 255) / (se / a.length));
}

// quality reader 1: the ffmpeg psnr filter (stats go to the log, so read stderr at -v info); tolerant of CRLF and progress lines
export function psnrFfmpeg(jpg, ref) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', jpg, '-i', ref, '-lavfi', '[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`psnr failed: ${r.stderr}`);
  const m = String(r.stderr).match(/PSNR[^\r\n]*average:\s*(inf|[0-9.]+)/);
  if (!m) throw new Error(`no psnr line in: ${r.stderr}`);
  return m[1] === 'inf' ? Infinity : Number(m[1]);
}

// size reader 2: ffprobe, read defensively
export function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height:format=size', '-of', 'json', file]));
  const s = (j.streams ?? [])[0] ?? {}, f = j.format ?? {};
  return {codec: s.codec_name ?? null, pixFmt: s.pix_fmt ?? null, width: Number(s.width), height: Number(s.height), size: Number(f.size)};
}

// DQT reader: walk the JPEG markers and return every quantization table (id, 64 values in zigzag order). Defensive: stops at the scan.
export function parseDqt(file) {
  const b = fs.readFileSync(file), tables = [];
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m === 0xda) break;
    if (m === 0xdb) {
      let p = i + 4;
      while (p < i + 2 + len) {
        const wide = b[p] >> 4, id = b[p] & 15; p++;
        const v = [];
        for (let k = 0; k < 64; k++) { v.push(wide ? b.readUInt16BE(p) : b[p]); p += wide ? 2 : 1; }
        tables.push({id, v});
      }
    }
    i += 2 + len;
  }
  return tables;
}

export function measure(file, srcFile, srcRaw) {
  const raw = rawRgb(file);
  const p = probe(file);
  return {
    sizeFs: fs.statSync(file).size, sizeProbe: p.size, codec: p.codec, pixFmt: p.pixFmt, width: p.width, height: p.height,
    fileMd5: md5(fs.readFileSync(file)), pixMd5: md5(raw), frameMd5: frameMd5(file)[0] ?? null,
    psnrFfmpeg: psnrFfmpeg(file, srcFile), psnrNode: psnrNode(raw, srcRaw),
    dqt: (() => { const t = parseDqt(file)[0]; return t ? {dc: t.v[0], ac1: t.v[1], ac2: t.v[2], sum: t.v.reduce((a, c) => a + c, 0)} : null; })(),
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = path.join(dir, 'src.png');
  ff(['-f', 'lavfi', '-i', SRC_GRAPH, '-frames:v', '1', '-update', '1', 'src.png'], dir);
  const srcRaw = rawRgb(src);
  const out = {ffmpeg: ffmpegVersion(), build: buildOf(ffmpegVersion()), source: {file: 'src.png', size: `${W}x${H}`, graph: SRC_GRAPH, pngBytes: fs.statSync(src).size, rawMd5: md5(srcRaw)}, runs: {}};
  out.source.selfPsnrFfmpeg = psnrFfmpeg(src, src); out.source.selfPsnrNode = psnrNode(srcRaw, srcRaw);
  for (const [name, c] of Object.entries(CASES)) {
    ff(['-i', 'src.png', ...ENC, ...c.args, '-frames:v', '1', '-update', '1', `${name}.jpg`], dir);
    out.runs[name] = {command: c.command, ...measure(path.join(dir, `${name}.jpg`), src, srcRaw)};
  }
  return out;
}
