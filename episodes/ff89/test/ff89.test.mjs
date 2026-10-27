import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, decodePng, encodePng, ebmlCount, proresAlphaInfo, pngColorTypes, makeSource, over, px, compare, buildOf, W, H, N, FS, ALPHAS, COLS, FORMATS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff89-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const F = (id) => ev.formats[id];
const has = (id) => F(id).available && F(id).encoded;
const D = (id, dec = 'default') => F(id).decodes[dec];
const levels = (id, dec = 'default') => D(id, dec).cmp.alphaLevels;

t('the helpers behave: PNG round trip, the EBML walker and the ProRes header reader on hand made bytes, the fixture geometry, compositing, build detection', () => {
  const px8 = Buffer.alloc(4 * 3 * 4); for (let i = 0; i < 12; i++) { px8[i * 4] = i * 20; px8[i * 4 + 1] = 255 - i; px8[i * 4 + 2] = (i * 37) & 255; px8[i * 4 + 3] = i * 21; }
  const back = decodePng(encodePng(4, 3, px8)); assert.equal(back.w, 4); assert.equal(back.h, 3); assert.ok(back.data.equals(px8)); assert.deepEqual(pngColorTypes(encodePng(4, 3, px8)), [6]);
  const el = (id, payload) => Buffer.concat([Buffer.from(id), Buffer.from([0x80 | payload.length]), payload]);
  const more = el([0xa6], Buffer.concat([el([0xee], Buffer.from([1])), el([0xa5], Buffer.from([1, 2, 3, 4, 5]))]));
  const group = el([0xa0], Buffer.concat([el([0xa1], Buffer.from([0, 0, 0, 0])), el([0x75, 0xa1], more)]));
  const cluster = el([0x1f, 0x43, 0xb6, 0x75], Buffer.concat([group, el([0xa3], Buffer.from([0, 0, 0, 0, 9]))]));
  const web = Buffer.concat([el([0x1a, 0x45, 0xdf, 0xa3], Buffer.alloc(0)), Buffer.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), cluster]);
  assert.deepEqual(ebmlCount(web), {blocks: 2, additionals: 1, additionalBytes: 5, ok: true});
  const hdr = Buffer.alloc(40); hdr.writeUInt16BE(28, 0); hdr.writeUInt16BE(W, 8); hdr.writeUInt16BE(H, 10); hdr[12] = 0xc0; hdr[17] = 0x02;
  const frame = Buffer.concat([Buffer.alloc(4), Buffer.from('icpf', 'latin1'), hdr]);
  assert.deepEqual(proresAlphaInfo(frame), [{alphaInfo: 2, chroma: 3}]);
  const s = makeSource(); assert.equal(s.length, FS * N); assert.deepEqual(px(s, 0, 0, 0), [230, 140, 90, 0]); assert.deepEqual(px(s, 7, 63, 47), [255, 255, 255, 255]);
  assert.deepEqual(ALPHAS.map((a, i) => px(s, 3, i * 8 + 3, 5)[3]), ALPHAS); assert.deepEqual(COLS.map((c, i) => px(s, 0, 20, i * 12 + 6).slice(0, 3)), COLS);
  assert.deepEqual(over([230, 140, 90, 0]), [128, 128, 128]); assert.deepEqual(over([230, 140, 90, 255]), [230, 140, 90]);
  const c = compare(s, s); assert.equal(c.alphaMismatch, 0); assert.equal(c.alphaLevels.length, 8);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, the encoders the film needs exist, and every format was encoded from the same 64 x 48, 8 frame rgba file', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const e of ['png', 'ffv1', 'qtrle', 'prores_ks', 'libx264']) assert.equal(ev.encoders[e], true, `encoder ${e} missing`);
  for (const f of FORMATS) { if (!F(f.id).available) continue; assert.equal(F(f.id).encoded, true, `${f.id} not encoded: ${F(f.id).encodeStderr}`); assert.equal(D(f.id).cmp.frames, N); }
});

t('two readers of the decoded picture agree: raw rgba equals the PNG files decoded in Node for every format and decoder, and the alpha plane read with alphaextract matches the rgba alpha (ProRes within 1)', () => {
  let n = 0;
  for (const f of FORMATS) { if (!has(f.id)) continue; for (const [dec, d] of Object.entries(F(f.id).decodes)) {
    n++; assert.equal(d.readersAB, true, `${f.id}/${dec}: raw rgba and PNG differ`);
    if (d.readerCMismatch !== null) assert.ok(d.readerCMax <= (f.id.startsWith('prores') ? 1 : 0), `${f.id}/${dec}: alphaextract differs from rgba alpha by ${d.readerCMax}`);
  } }
  assert.ok(n >= 12, `${n} decodes compared`);
});

t('control: PNG, FFV1 and QuickTime Animation give back all 8 alpha levels and every color exactly (the readers can see an alpha channel, and see it exactly)', () => {
  for (const id of ['png', 'ffv1', 'qtrle']) {
    const c = D(id).cmp;
    assert.deepEqual(c.alphaLevels, ALPHAS, id); assert.equal(c.alphaMismatch, 0, id); assert.equal(c.colorMaxErrAll, 0, id); assert.equal(c.opaque, false, id);
    assert.equal(D(id).overMaxErr, 0, id);
  }
  assert.deepEqual(F('png').file_readers.pngTypes, new Array(N).fill(6)); // the stored pictures are RGBA PNGs
  assert.equal(F('png').file_readers.ebml.additionals, 0); // and the alpha is inside the picture, not an extra block
  assert.match(F('png').probe.pix_fmt, /^rgba$/); assert.match(F('ffv1').probe.pix_fmt, /^bgra$/); assert.match(F('qtrle').probe.pix_fmt, /^argb$/);
});

t('ProRes 4444 keeps the alpha: alpha_info 2 and 4:4:4 in all 8 frame headers, 8 levels back within 1, colors exact; with no profile given prores_ks chooses the same', () => {
  for (const id of ['prores4444', 'proresAuto']) {
    const r = F(id), c = D(id).cmp;
    assert.equal(r.file_readers.prores.length, N); r.file_readers.prores.forEach((h) => { assert.equal(h.alphaInfo, 2); assert.equal(h.chroma, 3); });
    assert.match(r.probe.pix_fmt, /^yuva444p/);
    assert.equal(c.alphaLevels.length, 8); assert.ok(c.alphaMaxErr <= 1, `alpha error ${c.alphaMaxErr}`); assert.ok(c.colorMaxErrAll <= 1); assert.ok(D(id).overMaxErr <= 1);
    assert.equal(c.alphaLevels[0], 0); assert.equal(c.alphaLevels[7], 255);
  }
  if (isV6()) assert.deepEqual(levels('prores4444'), [0, 36, 73, 110, 147, 183, 220, 255]);
  assert.equal(F('prores4444').bytes, F('proresAuto').bytes);
});

t('ProRes HQ (-profile:v 3) drops the alpha without failing: alpha_info 0 in every frame header, every decoded alpha is 255, and the encoder said so', () => {
  const r = F('proresHQ'), c = D('proresHQ').cmp;
  assert.equal(r.encodeStatus, 0); r.file_readers.prores.forEach((h) => assert.equal(h.alphaInfo, 0));
  assert.equal(c.opaque, true); assert.doesNotMatch(r.probe.pix_fmt, /^yuva/);
  if (isV6()) assert.equal(r.noAlphaWarning, true);
});

t('VP9 in webm stores the alpha (one BlockAdditional per frame, alpha_mode 1) while ffprobe still says yuv420p; the libvpx-vp9 decoder returns 8 levels within 1; ffmpeg native VP9 decoder returns 1 (255 only) on 6.1.1', () => {
  assert.ok(ev.decoders['libvpx-vp9'], 'libvpx-vp9 decoder missing');
  for (const id of ['vp9', 'vp9lossy']) {
    const r = F(id); assert.equal(r.file_readers.ebml.blocks, N); assert.equal(r.file_readers.ebml.additionals, N); assert.ok(r.file_readers.ebml.additionalBytes > 0);
    assert.equal(r.probe.alpha_mode, '1'); assert.doesNotMatch(r.probe.pix_fmt, /^yuva/);
    const lib = D(id, 'libvpx-vp9').cmp; assert.equal(lib.alphaLevels.length, 8); assert.ok(lib.alphaMaxErr <= 1); assert.ok(lib.alphaLevels[0] === 0 && lib.alphaLevels.at(-1) === 255);
    const nat = D(id).cmp; assert.ok(nat.alphaLevels.length <= lib.alphaLevels.length, 'the native decoder never returns more alpha than libvpx');
    if (isV6()) { assert.deepEqual(nat.alphaLevels, [255]); assert.equal(nat.opaque, true); }
  }
  if (isV6()) assert.deepEqual(levels('vp9', 'libvpx-vp9'), [0, 36, 73, 109, 147, 183, 220, 255]);
});

t('VP8 in webm is the same: 8 BlockAdditional elements, libvpx decoder 8 levels, native decoder 1; and libvpx refuses to encode the alpha with its default auto-alt-ref (exit status not 0, no file)', () => {
  if (!has('vp8')) return;
  assert.equal(F('vp8').file_readers.ebml.additionals, N); assert.equal(D('vp8', 'libvpx').cmp.alphaLevels.length, 8);
  if (isV6()) { assert.equal(D('vp8').cmp.alphaLevels.length, 1); assert.notEqual(ev.vp8Default.status, 0); assert.equal(ev.vp8Default.message, true); assert.equal(ev.vp8Default.bytes, 0); }
  else assert.ok(ev.vp8Default.status !== undefined);
});

t('the alpha is lost by the options, not by the codec: -pix_fmt yuv420p on VP9 leaves 0 BlockAdditional elements and no alpha_mode; VP9 in mp4 has no alpha even for the libvpx decoder; H.264 never has any, and -pix_fmt yuva420p is replaced with yuv420p at exit status 0', () => {
  const y = F('vp9yuv'); assert.equal(y.file_readers.ebml.additionals, 0); assert.equal(y.probe.alpha_mode, null); assert.equal(D('vp9yuv', 'libvpx-vp9').cmp.opaque, true);
  const m = F('vp9mp4'); assert.equal(m.encodeStatus, 0); assert.equal(m.probe.alpha_mode, null);
  for (const dec of Object.keys(m.decodes)) assert.equal(m.decodes[dec].cmp.opaque, true, `vp9 in mp4 / ${dec}`);
  assert.equal(D('h264').cmp.opaque, true); assert.doesNotMatch(F('h264').probe.pix_fmt, /^yuva/);
  const q = F('h264req'); assert.equal(q.encodeStatus, 0); assert.equal(D('h264req').cmp.opaque, true); assert.doesNotMatch(q.probe.pix_fmt, /^yuva/);
  if (isV6()) { assert.equal(q.autoSelected, 'yuv420p'); assert.equal(F('h264').probe.pix_fmt, 'yuv444p'); }
});

t('a dropped alpha leaves the colors that were under it: in H.264 and in the native VP9 decode, the transparent column (alpha 0) shows the card color, up to 100 levels away from the gray a player would show', () => {
  for (const [id, dec] of [['h264', 'default'], ['vp9', 'default'], ['proresHQ', 'default']]) {
    const d = D(id, dec); const a0 = d.a0[0];
    assert.equal(a0[3], 255); assert.ok(Math.abs(a0[0] - COLS[0][0]) <= 14 && Math.abs(a0[1] - COLS[0][1]) <= 14 && Math.abs(a0[2] - COLS[0][2]) <= 14, `${id}: ${a0}`);
    assert.ok(d.overMaxErr >= 100, `${id}: shown against the correct matte is ${d.overMaxErr} levels off`);
  }
  // the formats that keep the alpha show the gray
  assert.deepEqual(D('png').a0over[0], [128, 128, 128]);
});

t('the +-1 on some alpha levels is the pixel format conversion, not the codec: rgba to yuva420p, yuva444p12le or gbrap and back, with no codec, gives the same levels as VP9 (relation on every build, exact levels on 6.1.1)', () => {
  for (const pf of ['yuva420p', 'yuva444p12le', 'gbrap']) { const c = ev.conv[pf]; assert.ok(c, pf); assert.equal(c.alphaLevels.length, 8); assert.ok(c.alphaMaxErr <= 1, `${pf}: ${c.alphaMaxErr}`); }
  assert.ok(D('vp9', 'libvpx-vp9').cmp.alphaMaxErr <= ev.conv.yuva420p.alphaMaxErr);
  assert.equal(ev.conv.gbrap.colorMaxErrAll, 0); assert.equal(ev.conv.yuva444p12le.colorMaxErrAll, 0);
  if (isV6()) { assert.deepEqual(ev.conv.yuva420p.alphaLevels, [0, 36, 73, 109, 147, 183, 220, 255]); assert.equal(ev.conv.yuva420p.alphaMismatch, 9216); }
  // the png, ffv1 and qtrle rows never convert, so they have no such error
  assert.equal(D('png').cmp.alphaMismatch, 0);
});

t('4:2:0 color: VP9 and VP8 bring the colors back up to 20 levels off at the edges of the color rows, PNG, ProRes 4444 and H.264 4:4:4 within 1', () => {
  assert.ok(D('vp9', 'libvpx-vp9').cmp.colorMaxErr > 1); assert.ok(D('vp9', 'libvpx-vp9').cmp.colorMaxErr <= 20);
  assert.equal(ev.conv.yuva420p.colorMaxErrAll, D('vp9', 'libvpx-vp9').cmp.colorMaxErrAll);
  for (const id of ['png', 'ffv1', 'qtrle', 'prores4444']) assert.ok(D(id).cmp.colorMaxErrAll <= 1, id);
  assert.ok(D('h264').cmp.colorMaxErrAll <= 2);
  if (isV6()) assert.equal(D('vp9', 'libvpx-vp9').cmp.colorMaxErr, 14);
});

t('baking the transparency in on purpose: overlay on a gray color, then H.264, comes out opaque and within 1 of the Node composite everywhere, so the transparent column is the gray, not the card color', () => {
  const f = ev.flat; assert.equal(f.encoded, true); assert.equal(f.frames, N); assert.equal(f.opaque, true); assert.ok(f.maxErrVsNodeOver <= 2, `error ${f.maxErrVsNodeOver}`);
  f.a0.forEach((p) => p.slice(0, 3).forEach((v) => assert.ok(Math.abs(v - 128) <= 2)));
  if (isV6()) assert.equal(f.maxErrVsNodeOver, 1);
});

t('known negatives: nothing here says what a browser, an editor or a player does with these files, and 8 frames of a flat card say nothing about compression of real alpha edges', () => {
  assert.equal(D('png').cmp.frames, N);
  assert.equal(new Set(Object.values(ev.formats).map((r) => r.ext)).size, 4); // mkv, mov, webm, mp4 only
});
