// Episode 89 fixture: "Transparent video: which formats keep the alpha channel, and what does each reader see?"
// Synthetic input only: one 64x48 rgba card, 8 identical frames, written by Node as a raw file (no lavfi, nothing from outside).
//   8 columns of alpha 0, 36, 73, 109, 146, 182, 219, 255 (8 px wide each) x 4 rows of colour (orange, indigo, lime, white), 12 px tall each.
//   The RGB under alpha 0 is the card colour on purpose, so a format that drops the alpha shows what was underneath.
// Encoders (all from the same raw rgba file, no -pix_fmt unless the row says so): png in mkv, ffv1 in mkv, qtrle in mov, prores_ks 4444 in mov,
//   prores_ks profile 3 (HQ) in mov, libvpx-vp9 lossless in webm (decoded twice: ffmpeg's native decoder and the libvpx-vp9 decoder), libvpx-vp9 lossy,
//   libvpx-vp9 in mp4, libvpx (vp8) in webm, libx264 in mp4 (crf 0, and with -pix_fmt yuva420p asked for).
// Readers of the decoded picture: A = ffmpeg to raw rgba; B = ffmpeg to PNG files, decoded by a PNG decoder written here; C = ffmpeg alphaextract to raw gray (the alpha plane in its own pixel format).
// Readers of the stored file: ffprobe (pix_fmt, alpha_mode tag) and Node byte readers (EBML BlockAdditional elements in webm, ProRes frame header alpha_info, the PNG IHDR colour type in mkv).
// Control for the readers: png in mkv and ffv1 and qtrle give back every alpha value exactly; the card has 8 known alpha levels.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, N = 8, FPS = 8, FS = W * H * 4;
export const ALPHAS = [0, 36, 73, 109, 146, 182, 219, 255];
export const COLS = [[230, 140, 90], [40, 60, 150], [170, 190, 60], [255, 255, 255]];
export const BG = 128; // the gray a player or an editor might show behind the video
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

export function makeSource() {
  const b = Buffer.alloc(FS * N);
  for (let f = 0; f < N; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (f * H * W + y * W + x) * 4, c = COLS[Math.floor(y / 12)];
    b[o] = c[0]; b[o + 1] = c[1]; b[o + 2] = c[2]; b[o + 3] = ALPHAS[Math.floor(x / 8)];
  }
  return b;
}
// rgba of one pixel of frame f
export const px = (buf, f, x, y) => { const o = (f * H * W + y * W + x) * 4; return [buf[o], buf[o + 1], buf[o + 2], buf[o + 3]]; };
// what a player does: composite over a flat gray
export const over = (p, bg = BG) => [0, 1, 2].map((c) => Math.round((p[3] * p[c] + (255 - p[3]) * bg) / 255));

// ---- the formats ----
const LIBVPX9 = ['-c:v', 'libvpx-vp9'];
export const FORMATS = [
  {id: 'png', label: 'PNG in mkv', ext: 'mkv', enc: 'png', args: ['-c:v', 'png']},
  {id: 'ffv1', label: 'FFV1 in mkv', ext: 'mkv', enc: 'ffv1', args: ['-c:v', 'ffv1']},
  {id: 'qtrle', label: 'QuickTime Animation in mov', ext: 'mov', enc: 'qtrle', args: ['-c:v', 'qtrle']},
  {id: 'prores4444', label: 'ProRes 4444 in mov', ext: 'mov', enc: 'prores_ks', args: ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le']},
  {id: 'proresAuto', label: 'ProRes, no profile given', ext: 'mov', enc: 'prores_ks', args: ['-c:v', 'prores_ks']},
  {id: 'proresHQ', label: 'ProRes HQ in mov', ext: 'mov', enc: 'prores_ks', args: ['-c:v', 'prores_ks', '-profile:v', '3']},
  {id: 'vp9', label: 'VP9 lossless in webm', ext: 'webm', enc: 'libvpx-vp9', args: [...LIBVPX9, '-lossless', '1'], alt: LIBVPX9},
  {id: 'vp9yuv', label: 'VP9 with pix_fmt yuv420p', ext: 'webm', enc: 'libvpx-vp9', args: [...LIBVPX9, '-lossless', '1', '-pix_fmt', 'yuv420p'], alt: LIBVPX9},
  {id: 'vp9lossy', label: 'VP9 lossy in webm', ext: 'webm', enc: 'libvpx-vp9', args: [...LIBVPX9, '-crf', '30', '-b:v', '0'], alt: LIBVPX9},
  {id: 'vp9mp4', label: 'VP9 in mp4', ext: 'mp4', enc: 'libvpx-vp9', args: [...LIBVPX9, '-lossless', '1'], alt: LIBVPX9},
  {id: 'vp8', label: 'VP8 in webm', ext: 'webm', enc: 'libvpx', args: ['-c:v', 'libvpx', '-auto-alt-ref', '0', '-crf', '10', '-b:v', '5M'], alt: ['-c:v', 'libvpx']},
  {id: 'h264', label: 'H.264 in mp4', ext: 'mp4', enc: 'libx264', args: ['-c:v', 'libx264', '-crf', '0']},
  {id: 'h264req', label: 'H.264, yuva420p asked for', ext: 'mp4', enc: 'libx264', args: ['-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuva420p']},
];

// ---- a PNG decoder (8 bit, non interlaced, colour types 2, 4, 6): reader B ----
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w = 0, h = 0, depth = 0, ct = 0, il = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; il = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || il !== 0 || ![2, 4, 6].includes(ct)) throw new Error(`unsupported PNG ${depth} ${ct} ${il}`);
  const bpp = ct === 6 ? 4 : ct === 4 ? 2 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0, b = y ? out[dst - stride + x] : 0, c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[dst + x] = v & 255;
    }
  }
  if (ct === 6) return {w, h, data: out, colorType: ct};
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { if (ct === 2) { rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1]; rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255; } else { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[i * 2]; rgba[i * 4 + 3] = out[i * 2 + 1]; } }
  return {w, h, data: rgba, colorType: ct};
}
// a PNG encoder, only to test the decoder against a known image (filter 0 on every row)
export function encodePng(w, h, rgba) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const h2 = Buffer.alloc(8); h2.writeUInt32BE(d.length, 0); h2.write(t, 4, 'latin1'); const body = Buffer.concat([h2.subarray(4), d]); const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(body), 0); return Buffer.concat([h2.subarray(0, 4), body, tail]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const rows = Buffer.alloc(h * (w * 4 + 1)); for (let y = 0; y < h; y++) { rows[y * (w * 4 + 1)] = 0; rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- Node byte readers of the stored file ----
// EBML walk: counts Block/SimpleBlock and BlockAdditional (id 0xA5) elements, the place where WebM keeps the alpha plane of VP8 and VP9.
export function ebmlCount(buf) {
  const MASTER = new Set([0x18538067, 0x1f43b675, 0xa0, 0x75a1, 0xa6]);
  const r = {blocks: 0, additionals: 0, additionalBytes: 0, ok: true};
  const vint = (p, keepMarker) => {
    const b0 = buf[p]; if (b0 === undefined || b0 === 0) return null;
    let len = 1; while (!(b0 & (0x80 >> (len - 1)))) len++;
    let v = keepMarker ? b0 : b0 & (0xff >> len); for (let i = 1; i < len; i++) v = v * 256 + buf[p + i];
    const allOnes = !keepMarker && (b0 & (0xff >> len)) === (0xff >> len) && buf.subarray(p + 1, p + len).every((x) => x === 0xff);
    return {v, len, unknown: allOnes};
  };
  const walk = (p, end) => {
    while (p < end) {
      const id = vint(p, true); if (!id) { r.ok = false; return; }
      const sz = vint(p + id.len, false); if (!sz) { r.ok = false; return; }
      const start = p + id.len + sz.len, stop = sz.unknown ? end : Math.min(end, start + sz.v);
      if (MASTER.has(id.v)) walk(start, stop);
      else if (id.v === 0xa1 || id.v === 0xa3) r.blocks++;
      else if (id.v === 0xa5) { r.additionals++; r.additionalBytes += stop - start; }
      p = stop;
    }
  };
  // skip the EBML header (id 0x1A45DFA3), then walk the Segment
  const h = vint(0, true), hs = h && vint(h.len, false);
  if (!h || !hs || h.v !== 0x1a45dfa3) return {...r, ok: false};
  walk(h.len + hs.len + hs.v, buf.length);
  return r;
}
// ProRes: every frame starts with size(4) 'icpf', then a header; alpha_info is the low nibble of header byte 17, the chroma factor the top 2 bits of byte 12.
export function proresAlphaInfo(buf) {
  const out = [];
  for (let p = buf.indexOf('icpf', 0, 'latin1'); p >= 0; p = buf.indexOf('icpf', p + 4, 'latin1')) {
    const h = p + 4, hdr = buf.readUInt16BE(h);
    if (hdr < 20 || buf.readUInt16BE(h + 8) !== W || buf.readUInt16BE(h + 10) !== H) continue;
    out.push({alphaInfo: buf[h + 17] & 0xf, chroma: (buf[h + 12] >> 6) & 3});
  }
  return out;
}
// PNG in a container: colour types of the PNG pictures found by signature
export function pngColorTypes(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), out = [];
  for (let p = buf.indexOf(sig); p >= 0; p = buf.indexOf(sig, p + 8)) if (buf.toString('latin1', p + 12, p + 16) === 'IHDR') out.push(buf[p + 25]);
  return out;
}

// ---- ffmpeg plumbing, all with argument arrays ----
const ff = (args, opts = {}) => spawnSync('ffmpeg', ['-hide_banner', '-v', 'warning', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
const probeJson = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt:stream_tags=alpha_mode', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) return {ok: false, err: (r.stderr ?? '').trim()};
  const s = (JSON.parse(r.stdout).streams ?? [])[0] ?? {};
  return {ok: true, codec: s.codec_name, pix_fmt: s.pix_fmt, alpha_mode: s.tags?.alpha_mode ?? s.tags?.ALPHA_MODE ?? null};
};
const lister = (kind) => new Set((spawnSync('ffmpeg', ['-hide_banner', `-${kind}`], {encoding: 'utf8'}).stdout ?? '').split(/\r?\n/).map((l) => l.trim().split(/\s+/)[1]).filter(Boolean));

// ---- one picture comparison (decoded rgba against the source) ----
export function compare(dec, src) {
  const frames = Math.floor(dec.length / FS), n = Math.min(frames, N) * W * H;
  const levels = new Set(); let aMis = 0, aMax = 0, cMax = 0, cMaxAll = 0, aSum = 0, aCount = 0;
  for (let p = 0; p < n; p++) {
    const o = p * 4, a = dec[o + 3], sa = src[o + 3];
    levels.add(a); const da = Math.abs(a - sa); aSum += da; aCount++;
    if (da) aMis++; if (da > aMax) aMax = da;
    for (let c = 0; c < 3; c++) { const d = Math.abs(dec[o + c] - src[o + c]); if (d > cMaxAll) cMaxAll = d; if (sa > 0 && d > cMax) cMax = d; }
  }
  return {frames, alphaLevels: [...levels].sort((a, b) => a - b), alphaMismatch: aMis, alphaMaxErr: aMax, alphaMeanErr: aCount ? aSum / aCount : 0, colorMaxErr: cMax, colorMaxErrAll: cMaxAll, opaque: levels.size === 1 && levels.has(255)};
}

// ---- the experiment ----
export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ffmpeg = ffmpegVersion();
  const encoders = lister('encoders'), decoders = lister('decoders');
  const src = makeSource(), srcPath = path.join(dir, 'src.rgba'); fs.writeFileSync(srcPath, src);
  const inArgs = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', srcPath];
  const ev = {ffmpeg, encoders: Object.fromEntries(FORMATS.map((f) => [f.enc, encoders.has(f.enc)])), decoders: {'libvpx-vp9': decoders.has('libvpx-vp9'), libvpx: decoders.has('libvpx')}, formats: {}, src: {frames: N, w: W, h: H}};
  for (const f of FORMATS) {
    const rec = {id: f.id, label: f.label, ext: f.ext, enc: f.enc, available: encoders.has(f.enc), decodes: {}};
    ev.formats[f.id] = rec; if (!rec.available) continue;
    const file = path.join(dir, `${f.id}.${f.ext}`); rec.file = file;
    let enc = ff([...inArgs, ...f.args, file], {encoding: 'utf8'});
    // 8.1.2: libvpx-vp9 asked to encode rgba picks gbrap and refuses it ("not widely supported"); 6.1.1 converts to yuva420p by itself.
    // Keep the refusal on record, then name the format 6.1.1 chose so the rest of the matrix can be read on both builds.
    rec.refusedRgba = false;
    if (enc.status !== 0 && f.enc === 'libvpx-vp9' && /not widely supported/.test((enc.stderr ?? '').toString())) {
      rec.refusedRgba = true; rec.refusedStderr = (enc.stderr ?? '').toString();
      enc = ff([...inArgs, ...f.args, '-pix_fmt', 'yuva420p', file], {encoding: 'utf8'});
    }
    rec.encodeStatus = enc.status; rec.encodeStderr = (enc.stderr ?? '').toString();
    rec.autoSelected = /auto-selecting format '([^']+)'/.exec(rec.encodeStderr)?.[1] ?? null;
    rec.noAlphaWarning = /will not encode alpha/.test(rec.encodeStderr);
    if (enc.status !== 0 || !fs.existsSync(file) || fs.statSync(file).size === 0) { rec.encoded = false; continue; }
    rec.encoded = true; rec.bytes = fs.statSync(file).size; rec.probe = probeJson(file);
    const bytes = fs.readFileSync(file);
    rec.file_readers = {};
    if (f.ext === 'webm' || f.ext === 'mkv') rec.file_readers.ebml = ebmlCount(bytes);
    if (f.ext === 'mkv' && f.id === 'png') rec.file_readers.pngTypes = pngColorTypes(bytes);
    if (f.id.startsWith('prores')) rec.file_readers.prores = proresAlphaInfo(bytes);
    const variants = [{id: 'default', pre: []}]; if (f.alt && decoders.has(f.alt[1])) variants.push({id: f.alt[1], pre: f.alt});
    for (const v of variants) {
      const d = {};
      const a = ff([...v.pre, '-i', file, '-pix_fmt', 'rgba', '-f', 'rawvideo', '-'], {}); d.statusA = a.status;
      const A = a.stdout ?? Buffer.alloc(0); d.cmp = compare(A, src);
      // reader B: PNG files
      const pd = path.join(dir, `png_${f.id}_${v.id}`); fs.mkdirSync(pd, {recursive: true});
      const b = ff([...v.pre, '-i', file, '-pix_fmt', 'rgba', path.join(pd, 'o_%d.png')], {}); d.statusB = b.status;
      const B = Buffer.concat(fs.readdirSync(pd).filter((n) => n.endsWith('.png')).sort((x, y) => parseInt(x.slice(2)) - parseInt(y.slice(2))).map((n) => decodePng(fs.readFileSync(path.join(pd, n))).data));
      d.readersAB = A.length === B.length && A.equals(B);
      // reader C: alphaextract
      const c = ff([...v.pre, '-i', file, '-vf', 'alphaextract', '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], {}); d.statusC = c.status;
      const C = c.stdout ?? Buffer.alloc(0); d.alphaCounts = C.length;
      let cMis = 0, cMax = 0; const nn = Math.min(C.length, A.length / 4); for (let i = 0; i < nn; i++) if (C[i] !== A[i * 4 + 3]) { cMis++; cMax = Math.max(cMax, Math.abs(C[i] - A[i * 4 + 3])); }
      d.readerCMismatch = nn === 0 ? null : cMis; d.readerCMax = cMax; d.readerCLevels = [...new Set(C)].sort((x, y) => x - y);
      // the pixel at alpha 0 (frame 0, x 0) in each colour row, and what a player shows over gray
      d.a0 = [0, 12, 24, 36].map((y) => px(A, 0, 0, y)); d.a0over = d.a0.map((p) => over(p));
      d.a255 = px(A, 0, 56, 0);
      d.overMaxErr = (() => { let m = 0; const n2 = Math.min(A.length / 4, src.length / 4); for (let i = 0; i < n2; i++) { const e = over([A[i * 4], A[i * 4 + 1], A[i * 4 + 2], A[i * 4 + 3]]), s = over([src[i * 4], src[i * 4 + 1], src[i * 4 + 2], src[i * 4 + 3]]); for (let ch = 0; ch < 3; ch++) m = Math.max(m, Math.abs(e[ch] - s[ch])); } return m; })();
      rec.decodes[v.id] = d;
    }
  }
  // the right way to bake transparency into an opaque format: overlay on a colour, then encode
  const flat = {encoded: false};
  if (encoders.has('libx264')) {
    const file = path.join(dir, 'flat.mp4');
    const r = ff([...inArgs, '-f', 'lavfi', '-i', `color=c=0x808080:s=${W}x${H}:r=${FPS}`, '-filter_complex', '[1:v][0:v]overlay=format=auto:shortest=1,format=yuv444p', '-c:v', 'libx264', '-crf', '0', file], {encoding: 'utf8'});
    if (r.status === 0) {
      const dec = ff(['-i', file, '-pix_fmt', 'rgba', '-f', 'rawvideo', '-'], {}).stdout ?? Buffer.alloc(0);
      const frames = Math.floor(dec.length / FS); let mx = 0, opq = true;
      for (let p = 0; p < Math.min(frames, N) * W * H; p++) { const e = over([src[p * 4], src[p * 4 + 1], src[p * 4 + 2], src[p * 4 + 3]]); if (dec[p * 4 + 3] !== 255) opq = false; for (let c = 0; c < 3; c++) mx = Math.max(mx, Math.abs(dec[p * 4 + c] - e[c])); }
      Object.assign(flat, {encoded: true, frames, maxErrVsNodeOver: mx, opaque: opq, a0: [0, 12, 24, 36].map((y) => px(dec, 0, 0, y))});
    }
  }
  ev.flat = flat;
  // control: the pixel format conversions alone, no codec. rgba -> yuva420p -> rgba and rgba -> yuva444p12le -> rgba, read as raw rgba
  ev.conv = {};
  for (const pf of ['yuva420p', 'yuva444p12le', 'gbrap']) {
    const mid = path.join(dir, `conv_${pf}.raw`), r1 = ff([...inArgs, '-pix_fmt', pf, '-f', 'rawvideo', mid], {});
    const r2 = ff(['-f', 'rawvideo', '-pix_fmt', pf, '-s', `${W}x${H}`, '-r', String(FPS), '-i', mid, '-pix_fmt', 'rgba', '-f', 'rawvideo', '-'], {});
    ev.conv[pf] = r1.status === 0 && r2.status === 0 ? compare(r2.stdout, src) : null;
  }
  // vp8 without -auto-alt-ref 0: libvpx refuses to encode the alpha
  if (encoders.has('libvpx')) {
    const file = path.join(dir, 'vp8_default.webm');
    const r = ff([...inArgs, '-c:v', 'libvpx', file], {encoding: 'utf8'});
    ev.vp8Default = {status: r.status, message: /Transparency encoding with auto_alt_ref does not work/.test(r.stderr ?? ''), bytes: fs.existsSync(file) ? fs.statSync(file).size : 0};
  }
  return ev;
}
