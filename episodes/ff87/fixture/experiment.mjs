// Episode 87 fixture: "vstack and hstack with inputs of different sizes: what is the error, how do you fix it, and what does shortest=1 do?"
// Synthetic input only (lavfi nullsrc + geq): flat luma pictures with one white 40 x 40 marker, so the position and the shape of the marker in the output can be measured.
//   A 320 x 240 (marker at 140,100), B 160 x 90 (marker at 60,25), C 320 x 90 (same width as A), D 160 x 240 (same height as A)
// Readers:
//   reader 1  ffmpeg/ffprobe: exit status and the stderr line, ffprobe width, height and decoded frame count (count_frames), duration, framemd5 per frame, and cropdetect on a thresholded copy of the part of the output that holds B
//   reader 2  Node: the decoded raw frames: size = frames x width x height x 1.5, md5 of every frame, the boxes of the bright (Y >= 200) connected pixels, the black pad pixels, the luma of two probe pixels per frame
// Control: stacking inputs that already match (A and C by vstack, A and D by hstack, A and A) works. Known positive for the readers: the stretch case, where the marker is known to change shape.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const mark = (w, h, mx, my, bg, d) => `nullsrc=s=${w}x${h}:r=25:d=${d},geq=lum='if(between(X,${mx},${mx + 39})*between(Y,${my},${my + 39}),235,${bg})':cb=128:cr=128`;
export const SRC = {
  A: {w: 320, h: 240, lav: mark(320, 240, 140, 100, 60, 0.2)},
  B: {w: 160, h: 90, lav: mark(160, 90, 60, 25, 100, 0.2)},
  C: {w: 320, h: 90, lav: mark(320, 90, 140, 25, 100, 0.2)},
  D: {w: 160, h: 240, lav: mark(160, 240, 60, 100, 100, 0.2)},
};
// frames whose flat luma tells which frame it is: A 2 s (16 + 2 N), B 3 s (235 - 2 N), both 160 x 120 at 25 fps
export const LEN = {
  A: `nullsrc=s=160x120:r=25:d=2,geq=lum='16+2*N':cb=128:cr=128`,
  B: `nullsrc=s=160x120:r=25:d=3,geq=lum='235-2*N':cb=128:cr=128`,
};

// geometry cases: inputs by name, graph, how the output is built, and the position of B in the output (offset from which the B part starts)
export const GEO = {
  v_ok:      {say: 'vstack, same width (A over C)',        ins: ['A', 'C'], graph: '[0:v][1:v]vstack=inputs=2[o]', dir: 'v', hasB: false},
  h_ok:      {say: 'hstack, same height (A beside D)',     ins: ['A', 'D'], graph: '[0:v][1:v]hstack=inputs=2[o]', dir: 'h', hasB: false},
  v_scale:   {say: 'scale=320:-2 on B',                    ins: ['A', 'B'], graph: '[1:v]scale=320:-2[b];[0:v][b]vstack=inputs=2[o]', dir: 'v'},
  v_scale2ref: {say: 'scale2ref, width of A',                ins: ['A', 'B'], graph: '[1:v][0:v]scale2ref=w=iw:h=ow/mdar[b][a];[a][b]vstack=inputs=2[o]', dir: 'v', v6only: true},
  v_stretch: {say: 'scale=320:240 on B (stretch)',          ins: ['A', 'B'], graph: '[1:v]scale=320:240[b];[0:v][b]vstack=inputs=2[o]', dir: 'v'},
  v_pad:     {say: 'pad=320:90:80:0 on B',                  ins: ['A', 'B'], graph: '[1:v]pad=320:90:80:0[b];[0:v][b]vstack=inputs=2[o]', dir: 'v'},
  v_box:     {say: 'scale decrease then pad to 320x240',    ins: ['A', 'B'], graph: '[1:v]scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2[b];[0:v][b]vstack=inputs=2[o]', dir: 'v'},
  h_scale:   {say: 'hstack, scale=-2:240 on B',             ins: ['A', 'B'], graph: '[1:v]scale=-2:240[b];[0:v][b]hstack=inputs=2[o]', dir: 'h'},
};
// error cases (no output expected)
export const ERR = {
  v_w: {say: 'vstack, widths 320 and 160', ins: ['A', 'B'], graph: '[0:v][1:v]vstack=inputs=2[o]', want: /Input 1 width 160 does not match input 0 width 320/},
  h_h: {say: 'hstack, heights 240 and 90',  ins: ['A', 'B'], graph: '[0:v][1:v]hstack=inputs=2[o]', want: /Input 1 height 90 does not match input 0 height 240/},
  v_h: {say: 'vstack, B first then A (widths 160, 320)', ins: ['B', 'A'], graph: '[0:v][1:v]vstack=inputs=2[o]', want: /Input 1 width 320 does not match input 0 width 160/},
};
export const ERR2 = {
  v_s2r_main: {say: 'scale2ref with w=main_w (the input being scaled)', ins: ['A', 'B'], graph: '[1:v][0:v]scale2ref=w=main_w:h=ow/dar[b][a];[a][b]vstack=inputs=2[o]'},
};
// length cases
export const LENS = {
  v_default:  {say: 'vstack default',                graph: '[0:v][1:v]vstack=inputs=2[o]', extra: []},
  v_shortest: {say: 'vstack shortest=1',              graph: '[0:v][1:v]vstack=inputs=2:shortest=1[o]', extra: []},
  v_swapped:  {say: 'vstack shortest=1, B first',    graph: '[1:v][0:v]vstack=inputs=2:shortest=1[o]', extra: []},
  v_cli:      {say: 'vstack default plus -shortest',  graph: '[0:v][1:v]vstack=inputs=2[o]', extra: ['-shortest']},
  h_default:  {say: 'hstack default',                graph: '[0:v][1:v]hstack=inputs=2[o]', extra: []},
  h_shortest: {say: 'hstack shortest=1',              graph: '[0:v][1:v]hstack=inputs=2:shortest=1[o]', extra: []},
};

const ffargs = (lavs, graph, extra, out) => ['-hide_banner', '-v', 'error', '-y', ...lavs.flatMap((l) => ['-f', 'lavfi', '-i', l]), '-filter_complex', graph, '-map', '[o]', ...extra, ...out];
const run = (cmd, args, enc = 'utf8') => spawnSync(cmd, args, {encoding: enc, maxBuffer: 1 << 28});
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
// the part of an ffmpeg error line after the "[Parsed_x @ 0x...]" prefix
export const bare = (line) => line.replace(/^\[[^\]]*\]\s*/, '').trim();

export function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames,duration:format=duration', '-of', 'json', file]);
  if (r.status !== 0) return null;
  const j = JSON.parse(r.stdout);
  const s = j.streams[0];
  return {w: s.width, h: s.height, frames: Number(s.nb_read_frames), duration: Number(j.format.duration)};
}
export function decode(file) {
  const r = run('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], 'buffer');
  if (r.status !== 0) throw new Error('decode failed: ' + r.stderr);
  return r.stdout;
}
export function framemd5(file) {
  const r = run('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-f', 'framemd5', '-an', '-']);
  return r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

// boxes of connected pixels with Y >= thr in the first frame of a raw yuv420p buffer, sorted by top then left
export function boxes(buf, w, h, thr = 200) {
  const seen = new Uint8Array(w * h), out = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || buf[i] < thr) continue;
    let x0 = w, x1 = -1, y0 = h, y1 = -1, n = 0; const st = [i]; seen[i] = 1;
    while (st.length) {
      const p = st.pop(), x = p % w, y = (p / w) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && !seen[q] && buf[q] >= thr) { seen[q] = 1; st.push(q); }
    }
    out.push({x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n});
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}
export const countBlack = (buf, w, h) => { let n = 0; for (let i = 0; i < w * h; i++) if (buf[i] <= 17) n++; return n; };

// reader 1b: cropdetect on a thresholded copy of the region that holds B (everything from `off` along the stacking direction)
export function cropBox(file, w, h, dir, off) {
  const crop = dir === 'v' ? `crop=${w}:${h - off}:0:${off}` : `crop=${w - off}:${h}:${off}:0`;
  const r = run('ffmpeg', ['-hide_banner', '-v', 'info', '-i', file, '-vf', `${crop},format=gray,lutyuv=y=if(gte(val\\,200)\\,235\\,16),cropdetect=limit=24:round=1:reset=1`, '-f', 'null', '-']);
  const all = [...r.stderr.matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)];
  if (!all.length) return null;
  const m = all[all.length - 1];
  const [x1, x2, y1, y2] = m.slice(1).map(Number);
  return dir === 'v' ? {x: x1, y: y1 + off, w: x2 - x1 + 1, h: y2 - y1 + 1} : {x: x1 + off, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), err: {}, geo: {}, len: {}};
  // ---- errors
  for (const [k, c] of Object.entries(ERR)) {
    const out = path.join(dir, `${k}.mkv`);
    fs.rmSync(out, {force: true});
    const r1 = run('ffmpeg', ffargs(c.ins.map((n) => SRC[n].lav), c.graph, [], ['-c:v', 'ffv1', out]));
    const r2 = run('ffmpeg', ffargs(c.ins.map((n) => SRC[n].lav), c.graph, [], ['-f', 'null', '-']));
    const lines = r1.stderr.split(/\r?\n/).filter(Boolean);
    const line = lines.map(bare).find((l) => /does not match/.test(l)) ?? null;
    ev.err[k] = {say: c.say, status: r1.status, status2: r2.status, line, line2: r2.stderr.split(/\r?\n/).filter(Boolean).map(bare).find((l) => /does not match/.test(l)) ?? null,
      lines: lines.map(bare), outputExists: fs.existsSync(out) && fs.statSync(out).size > 0, probe: fs.existsSync(out) ? probe(out) : null};
  }
  for (const [k, c] of Object.entries(ERR2)) {
    const out = path.join(dir, `${k}.mkv`);
    fs.rmSync(out, {force: true});
    const r = run('ffmpeg', ffargs(c.ins.map((n) => SRC[n].lav), c.graph, [], ['-c:v', 'ffv1', out]));
    const lines = r.stderr.split(/\r?\n/).filter(Boolean).map(bare);
    ev.err[k] = {say: c.say, status: r.status, status2: r.status, line: lines.find((l) => /does not match/.test(l)) ?? null, line2: null, lines, outputExists: fs.existsSync(out) && fs.statSync(out).size > 0, probe: null};
  }
  // ---- geometry
  for (const [k, c] of Object.entries(GEO)) {
    if (c.v6only && buildOf(ev.ffmpeg) !== 'v6') { /* still try it: the test decides what to assert */ }
    const out = path.join(dir, `${k}.mkv`);
    fs.rmSync(out, {force: true});
    const r = run('ffmpeg', ffargs(c.ins.map((n) => SRC[n].lav), c.graph, [], ['-c:v', 'ffv1', out]));
    const res = {say: c.say, status: r.status, stderr: r.stderr.split(/\r?\n/).filter(Boolean).map(bare)};
    if (r.status === 0 && fs.existsSync(out)) {
      const p = probe(out), raw = decode(out), fm = framemd5(out);
      const fsz = p.w * p.h * 1.5;
      const frames = Array.from({length: Math.floor(raw.length / fsz)}, (_, i) => raw.subarray(i * fsz, (i + 1) * fsz));
      const bx = boxes(frames[0], p.w, p.h);
      const off = c.dir === 'v' ? SRC[c.ins[0]].h : SRC[c.ins[0]].w;
      const second = bx.find((b) => (c.dir === 'v' ? b.y >= off : b.x >= off)) ?? null;
      res.probe = p; res.bytes = raw.length; res.frameBytes = fsz; res.nodeFrames = frames.length; res.md5Node = frames.map(md5); res.md5Ffmpeg = fm;
      res.boxes = bx; res.black = countBlack(frames[0], p.w, p.h); res.dir = c.dir; res.off = off;
      res.crop = cropBox(out, p.w, p.h, c.dir, off);
      res.lumaA = frames[0][0]; res.second = second;
    }
    ev.geo[k] = res;
  }
  // ---- lengths
  for (const [k, c] of Object.entries(LENS)) {
    const out = path.join(dir, `${k}.mkv`);
    fs.rmSync(out, {force: true});
    const r = run('ffmpeg', ffargs([LEN.A, LEN.B], c.graph, [], [...c.extra, '-c:v', 'ffv1', out]));
    const res = {say: c.say, status: r.status, stderr: r.stderr.split(/\r?\n/).filter(Boolean).map(bare)};
    if (r.status === 0) {
      const p = probe(out), raw = decode(out), fm = framemd5(out);
      const hz = k.startsWith('h_'), w = p.w, h = p.h, fsz = w * h * 1.5;
      const n = Math.floor(raw.length / fsz);
      const at = (i, x, y) => raw[i * fsz + y * w + x];
      // probe pixels: the middle of the A cell and the middle of the B cell (A first in the graph, except v_swapped where B comes first)
      const swapped = k === 'v_swapped';
      const pA = hz ? [20, 60] : (swapped ? [80, 180] : [80, 60]);
      const pB = hz ? [180, 60] : (swapped ? [80, 60] : [80, 180]);
      res.probe = p; res.bytes = raw.length; res.nodeFrames = n; res.md5Node = Array.from({length: n}, (_, i) => md5(raw.subarray(i * fsz, (i + 1) * fsz))); res.md5Ffmpeg = fm;
      res.lumaA = Array.from({length: n}, (_, i) => at(i, pA[0], pA[1])); res.lumaB = Array.from({length: n}, (_, i) => at(i, pB[0], pB[1]));
    }
    ev.len[k] = res;
  }
  return ev;
}
