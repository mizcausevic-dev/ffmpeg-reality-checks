// Episode 52 fixture: "GIF -loop: what do 0, -1 and 3 really mean?"
// Synthetic source only (lavfi): 10 frames at 10 fps, 32x24, frame N is a flat card of red level 25 * N, written as a gif by the ffmpeg gif muxer.
// Cases (all output options on the same source):
//   default   no -loop at all
//   m1, p0, p1, p3, p255, p65535    -loop -1, 0, 1, 3, 255, 65535
//   p65536    -loop 65536: out of range
//   in1, in3  -loop 1 and -loop 3 placed BEFORE -i of a still png (an input option of the image demuxer, not the gif muxer)
// Known positive (a case where the answer is known): a gif built byte by byte in Node, 2 frames of 1x1, whose NETSCAPE loop count is 7.
// Readers:
//   reader 1  the bytes: a GIF block parser in Node (the NETSCAPE2.0 application extension and its 16 bit loop count, frame count, frame delays)
//   reader 2  behaviour: ffmpeg's gif demuxer asked to honour the loop count (-ignore_loop 0), counting the frames it hands out in 20 s (framemd5);
//             passes = frames / frames per pass; a file that is still playing at the 20 s limit is reported as capped. ffprobe gives frame count and duration as a cross-check of the frame data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const FRAMES = 10, FPS = 10, REPLAY_SECONDS = 20;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, {maxBuffer: 1 << 26, ...opts});
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');

// ---- reader 1: GIF bytes ----
const skipSub = (b, p) => { while (p < b.length && b[p] !== 0) p += b[p] + 1; return p + 1; };
export function parseGif(b) {
  const out = {valid: false, width: 0, height: 0, frames: 0, delays: [], loop: null, loopOffset: null, netscapeBlocks: 0, bytes: b.length};
  if (b.length < 14 || !/^GIF8[79]a$/.test(b.toString('latin1', 0, 6))) return out;
  out.width = b.readUInt16LE(6); out.height = b.readUInt16LE(8);
  let p = 13; const packed = b[10];
  if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1));
  while (p < b.length) {
    const t = b[p];
    if (t === 0x3b) { out.valid = true; return out; }
    if (t === 0x21) {
      const label = b[p + 1];
      if (label === 0xff) {
        const size = b[p + 2], id = b.toString('latin1', p + 3, p + 3 + size);
        if (id === 'NETSCAPE2.0' && b[p + 3 + size] === 3 && b[p + 4 + size] === 1) { out.netscapeBlocks++; out.loop = b.readUInt16LE(p + 5 + size); out.loopOffset = p + 5 + size; }
        p = skipSub(b, p + 3 + size);
      } else {
        if (label === 0xf9) out.delays.push(b.readUInt16LE(p + 4));
        p = skipSub(b, p + 2);
      }
    } else if (t === 0x2c) {
      out.frames++;
      const lp = b[p + 9];
      p += 10; if (lp & 0x80) p += 3 * (1 << ((lp & 7) + 1));
      p = skipSub(b, p + 1);
    } else return out;
  }
  return out;
}
// the block that holds the loop count: 21 ff 0b "NETSCAPE2.0" 03 01 lo hi 00 = 19 bytes
export const NETSCAPE_BYTES = 19;
// a gif built in Node, byte by byte: 2 frames of 1x1 (pixel 0, then pixel 1), 0.1 s each, loop count `loop` (null: no loop block)
export function handGif(loop) {
  const parts = [Buffer.from('GIF89a', 'latin1'), Buffer.from([1, 0, 1, 0, 0x80, 0, 0]), Buffer.from([0, 0, 0, 255, 255, 255])];
  if (loop !== null) parts.push(Buffer.from([0x21, 0xff, 0x0b]), Buffer.from('NETSCAPE2.0', 'latin1'), Buffer.from([3, 1, loop & 255, loop >> 8, 0]));
  for (const code of [0x44, 0x4c]) parts.push(Buffer.from([0x21, 0xf9, 4, 0, 10, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, code, 1, 0]));
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

// ---- reader 2: ffmpeg's gif demuxer honouring the loop count ----
export function replay(file, perPass = FRAMES) {
  const r = run('ffmpeg', ['-v', 'error', '-ignore_loop', '0', '-i', file, '-t', String(REPLAY_SECONDS), '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return {frames: 0, passes: 0, capped: false, error: r.stderr.split('\n')[0]};
  const frames = r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).length;
  const capped = frames >= REPLAY_SECONDS * FPS;
  return {frames, passes: capped ? Infinity : frames / perPass, capped, error: null};
}
export function frameHashes(file) {
  const r = run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'framemd5', '-'], {encoding: 'utf8'});
  if (r.status !== 0) return [];
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}
export function probeFacts(file) {
  const r = run('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=nb_read_frames,width,height:format=duration', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) return null;
  const j = JSON.parse(r.stdout);
  return {frames: Number(j.streams[0].nb_read_frames), width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration)};
}

export const SRC = `color=c=black:s=32x24:r=${FPS}:d=1,format=rgb24,geq=r=25*N:g=0:b=0`;
export const CASES = {
  default: {args: [], command: 'ffmpeg -i src out.gif'},
  m1: {args: ['-loop', '-1'], command: 'ffmpeg -i src -loop -1 out.gif'},
  p0: {args: ['-loop', '0'], command: 'ffmpeg -i src -loop 0 out.gif'},
  p1: {args: ['-loop', '1'], command: 'ffmpeg -i src -loop 1 out.gif'},
  p3: {args: ['-loop', '3'], command: 'ffmpeg -i src -loop 3 out.gif'},
  p255: {args: ['-loop', '255'], command: 'ffmpeg -i src -loop 255 out.gif'},
  p65535: {args: ['-loop', '65535'], command: 'ffmpeg -i src -loop 65535 out.gif'},
  p65536: {args: ['-loop', '65536'], command: 'ffmpeg -i src -loop 65536 out.gif'},
};

function readFile(file) {
  const exists = fs.existsSync(file), buf = exists ? fs.readFileSync(file) : Buffer.alloc(0);
  const g = parseGif(buf);
  const rp = exists && g.valid ? replay(file) : {frames: 0, passes: 0, capped: false, error: 'no gif'};
  return {exists, bytes: buf.length, md5: md5(buf), gif: {valid: g.valid, frames: g.frames, delays: g.delays, loop: g.loop, loopOffset: g.loopOffset, netscapeBlocks: g.netscapeBlocks, width: g.width, height: g.height},
    replay: {frames: rp.frames, passes: rp.passes === Infinity ? 'capped' : rp.passes, capped: rp.capped}, hashes: exists && g.valid ? frameHashes(file) : [], probe: exists && g.valid ? probeFacts(file) : null};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), frames: FRAMES, runs: {}, input: {}, hand: {}};
  const raw = {};
  for (const [name, c] of Object.entries(CASES)) {
    const out = path.join(dir, `${name}.gif`);
    const r = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', SRC, ...c.args, '-f', 'gif', out], {encoding: 'utf8'});
    ev.runs[name] = {command: c.command, status: r.status, ...readFile(out)};
    raw[name] = fs.existsSync(out) ? fs.readFileSync(out) : Buffer.alloc(0);
  }
  // which bytes differ between the loop values (all share the same pixels)
  const diff = (a, b) => { if (a.length !== b.length) return null; const d = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i); return d; };
  ev.diffs = {p0_vs_p3: diff(raw.p0, raw.p3), p0_vs_p65535: diff(raw.p0, raw.p65535), default_vs_p0: diff(raw.default, raw.p0), sizeGap: raw.p0.length - raw.m1.length};
  // the png card for the input-side -loop
  const card = path.join(dir, 'card.png');
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=32x24:d=0.04,format=rgb24', '-frames:v', '1', card]);
  for (const [name, v] of [['in1', '1'], ['in3', '3']]) {
    const out = path.join(dir, `${name}.gif`);
    const r = run('ffmpeg', ['-v', 'error', '-y', '-loop', v, '-i', card, '-t', '1', '-r', String(FPS), '-f', 'gif', out], {encoding: 'utf8'});
    ev.input[name] = {command: `ffmpeg -loop ${v} -i card.png -t 1 -r 10 out.gif`, status: r.status, ...readFile(out)};
  }
  // known positive: a gif written byte by byte with loop count 7
  for (const loop of [7, 0, null]) {
    const f = path.join(dir, `hand${loop}.gif`);
    fs.writeFileSync(f, handGif(loop));
    ev.hand[String(loop)] = {...readFile(f), replayPerPass: replay(f, 2)};
    ev.hand[String(loop)].replayPerPass = {frames: ev.hand[String(loop)].replayPerPass.frames, passes: ev.hand[String(loop)].replayPerPass.passes === Infinity ? 'capped' : ev.hand[String(loop)].replayPerPass.passes};
  }
  return ev;
}
