// A small PNG toolkit in plain Node (no dependencies): chunk parser with CRC check, scanline reader, unfilter, and a
// builder that writes a PNG with filter bytes we choose. It is reader 2 in this fixture: it never asks ffmpeg anything.
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const FILTER_NAMES = ['none', 'sub', 'up', 'avg', 'paeth'];
export const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};

// bytes per pixel (at least 1) and bytes per row, for the filters
export function geometry(width, bitDepth, colorType) {
  const bitsPerPixel = CHANNELS[colorType] * bitDepth;
  return {bpp: Math.max(1, bitsPerPixel >> 3), rowBytes: Math.ceil((width * bitsPerPixel) / 8)};
}

export function readChunks(png) {
  if (!png.subarray(0, 8).equals(SIG)) throw new Error('not a PNG: bad signature');
  const chunks = [];
  let p = 8;
  while (p < png.length) {
    const len = png.readUInt32BE(p), type = png.toString('latin1', p + 4, p + 8);
    const data = png.subarray(p + 8, p + 8 + len), crc = png.readUInt32BE(p + 8 + len);
    chunks.push({type, length: len, data, crcOk: crc32(png.subarray(p + 4, p + 8 + len)) === crc});
    p += 12 + len;
  }
  return chunks;
}

export function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// undo the five PNG filters; returns the pixel bytes (no filter bytes)
export function unfilter(raw, height, rowBytes, bpp) {
  const out = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (rowBytes + 1)], src = y * (rowBytes + 1) + 1, dst = y * rowBytes, up = dst - rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const x = raw[src + i], a = i >= bpp ? out[dst + i - bpp] : 0, b = y > 0 ? out[up + i] : 0, c = y > 0 && i >= bpp ? out[up + i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1); else if (f === 4) v = x + paeth(a, b, c);
      else throw new Error(`row ${y}: filter byte ${f} is not a PNG filter`);
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

// apply one filter type to row y of a pixel buffer (used only to build the control PNG)
export function filterRow(pixels, y, rowBytes, bpp, f) {
  const row = Buffer.alloc(rowBytes + 1);
  row[0] = f;
  for (let i = 0; i < rowBytes; i++) {
    const x = pixels[y * rowBytes + i], a = i >= bpp ? pixels[y * rowBytes + i - bpp] : 0, b = y > 0 ? pixels[(y - 1) * rowBytes + i] : 0, c = y > 0 && i >= bpp ? pixels[(y - 1) * rowBytes + i - bpp] : 0;
    let pred = 0;
    if (f === 1) pred = a; else if (f === 2) pred = b; else if (f === 3) pred = (a + b) >> 1; else if (f === 4) pred = paeth(a, b, c);
    row[i + 1] = (x - pred) & 0xff;
  }
  return row;
}

export function parsePng(png) {
  const chunks = readChunks(png);
  const ihdr = chunks.find((c) => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0), height = ihdr.readUInt32BE(4), bitDepth = ihdr[8], colorType = ihdr[9], interlace = ihdr[12];
  if (interlace !== 0) throw new Error('interlaced PNG: not handled');
  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = zlib.inflateSync(idat);
  const idatLengths = chunks.filter((c) => c.type === 'IDAT').map((c) => c.length);
  const {bpp, rowBytes} = geometry(width, bitDepth, colorType);
  if (raw.length !== height * (rowBytes + 1)) throw new Error(`inflated ${raw.length} bytes, expected ${height * (rowBytes + 1)}`);
  const rows = Array.from({length: height}, (_, y) => raw[y * (rowBytes + 1)]);
  const histogram = [0, 0, 0, 0, 0];
  for (const f of rows) histogram[f]++;
  const pixels = unfilter(raw, height, rowBytes, bpp);
  return {
    width, height, bitDepth, colorType, interlace, bpp, rowBytes,
    chunkTypes: chunks.map((c) => c.type), allCrcOk: chunks.every((c) => c.crcOk),
    idatBytes: idat.length, inflatedBytes: raw.length, rows, histogram, pixels, pixelMd5: md5(pixels),
    idatLengths, zlibHeader: idat.subarray(0, 2).toString('hex'), inflatedMd5: md5(raw),
    firstRows: rows.slice(0, 12), idatCount: chunks.filter((c) => c.type === 'IDAT').length,
  };
}

const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };

// Build a PNG whose scanlines use the filter types we say: filterOf(y) -> 0..4. The result is a valid PNG of the same pixels.
export function buildPng({width, height, bitDepth = 8, colorType = 2, pixels, filterOf, level = 6}) {
  const {bpp, rowBytes} = geometry(width, bitDepth, colorType);
  const raw = Buffer.concat(Array.from({length: height}, (_, y) => filterRow(pixels, y, rowBytes, bpp, filterOf(y))));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = bitDepth; ihdr[9] = colorType;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level})), chunk('IEND', Buffer.alloc(0))]);
}
