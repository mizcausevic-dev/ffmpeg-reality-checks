// Deep dive 05 fixture: "The encode ended with no error. Why might the file still not play?"
// It re-runs the fixtures of ff02 (pixel format), ff09 (odd sizes), ff03 (index position) and ff31 (hvc1 vs hev1) live,
// then adds one composite: a fresh RGB PNG fixture, a naive command and a recipe command for H.264 and for HEVC,
// each result read by independent readers. Synthetic input only (lavfi testsrc2). The only network is the loopback server inside ff03.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';
import {runExperiment as runFf02} from '../../ff02/fixture/experiment.mjs';
import {runExperiment as runFf03, topLevelBoxes, traceBoxes} from '../../ff03/fixture/experiment.mjs';
import {runExperiment as runFf09} from '../../ff09/fixture/experiment.mjs';
import {runExperiment as runFf31, buildOf} from '../../ff31/fixture/experiment.mjs';

export {buildOf};
export const FIX = {size: '1000x562', fps: 25, frames: 25};

// Each case: how the file is made from the PNG frames. ENC265 is quiet except for errors so a refusal can be read.
const IN = ['-framerate', String(FIX.fps), '-i', 'f%03d.png'];
const X265 = ['-x265-params', 'log-level=error'];
export const CASES = {
  naive264:      {file: 'naive264.mp4',      args: [...IN, '-vf', 'scale=-1:333', '-c:v', 'libx264']},
  strict264:     {file: 'strict264.mp4',     args: [...IN, '-vf', 'scale=-1:333', '-c:v', 'libx264', '-pix_fmt', 'yuv420p']},
  fastonly264:   {file: 'fastonly264.mp4',   args: [...IN, '-vf', 'scale=-1:333', '-c:v', 'libx264', '-movflags', '+faststart']},
  nofast264:     {file: 'nofast264.mp4',     args: [...IN, '-vf', 'scale=-2:334', '-c:v', 'libx264', '-pix_fmt', 'yuv420p']},
  recipe264:     {file: 'recipe264.mp4',     args: [...IN, '-vf', 'scale=-2:334', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']},
  naive265:      {file: 'naive265.mp4',      args: [...IN, '-vf', 'scale=-1:333', '-c:v', 'libx265', ...X265]},
  strict265:     {file: 'strict265.mp4',     args: [...IN, '-vf', 'scale=-1:333', '-c:v', 'libx265', '-pix_fmt', 'yuv420p', ...X265]},
  recipe265:     {file: 'recipe265.mp4',     args: [...IN, '-vf', 'scale=-2:334', '-c:v', 'libx265', '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1', ...X265, '-movflags', '+faststart']},
};
const spoken = (c) => `ffmpeg ${c.args.join(' ').replace('-framerate 25 -i f%03d.png', '-i f%03d.png').replace(' -x265-params log-level=error', '')} ${c.file}`;

// ---- reader 2: raw MP4 bytes (top-level box order is read by ff03's parser; this one reads inside the sample entry) -------
function* boxes(buf, start, end) {
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p), hdr = 8;
    const type = buf.toString('latin1', p + 4, p + 8);
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); hdr = 16; } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) return;
    yield {type, start: p, hdr, end: p + size};
    p += size;
  }
}
const child = (buf, b, type) => { for (const c of boxes(buf, b.start + b.hdr, b.end)) if (c.type === type) return c; return null; };

// bit reader over an RBSP (emulation prevention bytes 00 00 03 removed)
function rbsp(bytes) { const out = []; for (let i = 0; i < bytes.length; i++) { if (i >= 2 && bytes[i] === 3 && bytes[i - 1] === 0 && bytes[i - 2] === 0) continue; out.push(bytes[i]); } return Buffer.from(out); }
function bits(buf) {
  let pos = 0;
  const bit = () => { const v = (buf[pos >> 3] >> (7 - (pos & 7))) & 1; pos++; return v; };
  const ue = () => { let z = 0; while (bit() === 0 && z < 32) z++; let v = 0; for (let i = 0; i < z; i++) v = (v << 1) | bit(); return (1 << z) - 1 + v; };
  return {bit, ue};
}
const HIGH_PROFILES = new Set([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135]);

export function sampleEntry(buf) {
  const moov = child(buf, {start: 0, hdr: 0, end: buf.length}, 'moov');
  const trak = [...boxes(buf, moov.start + moov.hdr, moov.end)].find((b) => b.type === 'trak');
  const stbl = child(buf, child(buf, child(buf, trak, 'mdia'), 'minf'), 'stbl');
  const stsd = child(buf, stbl, 'stsd');
  const entry = [...boxes(buf, stsd.start + stsd.hdr + 8, stsd.end)][0];
  const out = {fourcc: entry.type, width: buf.readUInt16BE(entry.start + 32), height: buf.readUInt16BE(entry.start + 34)};
  const kids = [...boxes(buf, entry.start + 8 + 8 + 70, entry.end)];
  const avcC = kids.find((k) => k.type === 'avcC'), hvcC = kids.find((k) => k.type === 'hvcC');
  if (avcC) {
    const p = avcC.start + avcC.hdr, spsLen = buf.readUInt16BE(p + 6), sps = buf.subarray(p + 8, p + 8 + spsLen);
    const profileIdc = sps[1];
    let chroma = 1; // implied 4:2:0 for profiles without the field
    if (HIGH_PROFILES.has(profileIdc)) { const r = bits(rbsp(sps.subarray(4))); r.ue(); chroma = r.ue(); }
    out.config = 'avcC'; out.profileIdc = profileIdc; out.chromaFormatIdc = chroma;
  } else if (hvcC) {
    const p = hvcC.start + hvcC.hdr;
    out.config = 'hvcC'; out.profileIdc = buf[p + 1] & 0x1f; out.chromaFormatIdc = buf[p + 16] & 3;
  }
  return out;
}

// ---- reader 3: the decoded frames (bytes per frame from framemd5, and the count) ----------------------------------------
export function decodedFrames(file) {
  const rows = run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:v:0', '-f', 'framemd5', '-']).split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((x) => x.trim()));
  return {frames: rows.length, bytesPerFrame: rows.length ? Number(rows[0][4]) : null, allSameSize: rows.every((r) => r[4] === rows[0][4])};
}
// bytes in one decoded frame, from the pixel format and size alone
export function expectedFrameBytes(pixFmt, w, h) {
  const cw = Math.ceil(w / 2), ch = Math.ceil(h / 2);
  if (pixFmt === 'yuv420p') return w * h + 2 * cw * ch;
  if (pixFmt === 'yuv444p' || pixFmt === 'gbrp') return 3 * w * h;
  return null;
}

export function readOutput(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,codec_tag_string,nb_read_frames', '-of', 'json', file])).streams[0];
  const buf = fs.readFileSync(file);
  const own = topLevelBoxes(file), trace = traceBoxes(file);
  return {
    bytes: buf.length,
    probe: {codec: j.codec_name, profile: j.profile, pixFmt: j.pix_fmt, width: j.width, height: j.height, tag: j.codec_tag_string, frames: Number(j.nb_read_frames)},
    order: own.map((b) => b.type), traceOrder: trace.map((b) => b.type),
    entry: sampleEntry(buf),
    decoded: decodedFrames(file),
  };
}

function composite(dir) {
  fs.mkdirSync(dir, {recursive: true});
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${FIX.size}:rate=${FIX.fps}:duration=${FIX.frames / FIX.fps}`, '-start_number', '1', path.join(dir, 'f%03d.png')]);
  const pngPix = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=pix_fmt,width,height', '-of', 'json', path.join(dir, 'f001.png')])).streams[0];
  const out = {fixture: {...FIX, pngPixFmt: pngPix.pix_fmt, pngSize: `${pngPix.width}x${pngPix.height}`}, cases: {}};
  for (const [name, c] of Object.entries(CASES)) {
    const file = path.join(dir, c.file);
    if (fs.existsSync(file)) fs.rmSync(file);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...c.args, c.file], {encoding: 'utf8', cwd: dir, maxBuffer: 1 << 26});
    const errLines = (r.stderr ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const wrote = fs.existsSync(file) && fs.statSync(file).size > 0;
    out.cases[name] = {command: spoken(c), exit: r.status, wrote, refusal: errLines.find((l) => /not divisible|multiple of the specified chroma/i.test(l)) ?? null, ...(wrote ? readOutput(file) : {})};
  }
  return out;
}

export async function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), build: buildOf(ffmpegVersion()), sources: {}};
  ev.sources.ff02 = runFf02(path.join(dir, 'ff02'));
  ev.sources.ff09 = runFf09(path.join(dir, 'ff09'));
  ev.sources.ff03 = await runFf03(path.join(dir, 'ff03'));
  ev.sources.ff31 = runFf31(path.join(dir, 'ff31'));
  ev.composite = composite(path.join(dir, 'composite'));
  return ev;
}
