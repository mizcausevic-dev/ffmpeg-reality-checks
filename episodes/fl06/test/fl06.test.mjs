import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, compareEvidence, PREDS, REPEATS, CONTENT, W, H} from '../fixture/experiment.mjs';
import {parsePng, buildPng, unfilter, readChunks, md5} from '../fixture/png.mjs';

// Relations hold on any build. Exact numbers (bytes, the default predictor) are asserted only on ffmpeg 6.1.1, the build
// they were measured on; on any other build those lines are skipped, so a difference there is a finding, not a failure.
// Claims about the EXPLICIT -pred modes are asserted as relations on every build; whether the two builds agree on
// those bytes is checked across two evidence files with compare.mjs, because one test run only sees one build.
const ok = !!process.env.FL06_EVIDENCE || (have('ffmpeg') && have('ffprobe'));
let ev, dir;
// FL06_EVIDENCE=<file> runs the same tests against a saved evidence file instead of running ffmpeg (used to check the
// suite against the evidence measured on the other build).
const HERE = path.join(import.meta.dirname, '..');
const loadEv = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
before(() => {
  if (process.env.FL06_EVIDENCE) { ev = JSON.parse(fs.readFileSync(path.resolve(process.env.FL06_EVIDENCE), 'utf8')); return; }
  if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl06-')); ev = runExperiment(dir); }
});
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const v8 = (name, fn) => test(name, {skip: !ok ? 'ffmpeg/ffprobe not on PATH' : undefined}, (ctx) => { if (ev.build !== 'v8') return ctx.skip('exact numbers were measured on ffmpeg 8.1.2'); return fn(ctx); });
const v6 = (name, fn) => test(name, {skip: !ok ? 'ffmpeg/ffprobe not on PATH' : undefined}, (ctx) => { if (ev.build !== 'v6') return ctx.skip('exact numbers were measured on ffmpeg 6.1.1'); return fn(ctx); });
const R = (c, k) => ev.contents[c].runs[k];
const bytes = (c, k) => R(c, k).bytes;
const RGB24 = () => Object.keys(CONTENT).filter((n) => CONTENT[n].pix === 'rgb24');
const FILTERS = ['none', 'sub', 'up', 'avg', 'paeth'];

t('build label: the version line is recorded, the build is one of v6, v8, other, and every run used the same 3 repeats', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.ok(['v6', 'v8', 'other'].includes(ev.build));
  assert.equal(ev.repeats, REPEATS); assert.equal(REPEATS, 3);
  assert.ok(ev.libs.some((l) => /^libavcodec/.test(l)));
});

// ---- the control and the readers --------------------------------------------------------------------------------
t('control: a PNG built here with known filter bytes (rows cycle 0,1,2,3,4; all paeth; all none) is read back by our parser as exactly those bytes, CRCs are good, and our unfilter and ffmpeg both return the source pixels', () => {
  for (const [k, c] of Object.entries(ev.control)) {
    assert.ok(c.rowsMatchExactly, `${k} rows`);
    assert.ok(c.allCrcOk, `${k} crc`);
    assert.equal(c.nodePixelMd5, c.srcMd5, `${k} node pixels`);
    assert.equal(c.ffmpegDecodedMd5, c.srcMd5, `${k} ffmpeg pixels`);
  }
  assert.deepEqual(ev.control.cycle.histogram, [H / 5, H / 5, H / 5, H / 5, H / 5]);
  assert.deepEqual(ev.control.all_paeth.histogram, [0, 0, 0, 0, H]);
  assert.deepEqual(ev.control.all_none.histogram, [H, 0, 0, 0, 0]);
});

t('control, parser sensitivity: changing one filter byte in a built PNG changes the histogram by exactly that row and the unfiltered pixels (so a histogram of all zeros is not a parser that cannot see)', () => {
  const px = Buffer.alloc(16 * 8 * 3); for (let i = 0; i < px.length; i++) px[i] = (i * 37 + (i >> 3)) & 255;
  const a = parsePng(buildPng({width: 16, height: 8, pixels: px, filterOf: () => 0}));
  const b = parsePng(buildPng({width: 16, height: 8, pixels: px, filterOf: (y) => (y === 3 ? 4 : 0)}));
  assert.deepEqual(a.histogram, [8, 0, 0, 0, 0]); assert.deepEqual(b.histogram, [7, 0, 0, 0, 1]);
  assert.equal(b.rows[3], 4);
  assert.equal(a.pixelMd5, md5(px)); assert.equal(b.pixelMd5, md5(px));
  assert.notEqual(buildPng({width: 16, height: 8, pixels: px, filterOf: () => 0}).toString('hex'), buildPng({width: 16, height: 8, pixels: px, filterOf: () => 4}).toString('hex'));
});

t('reader agreement: for every file written (16 images, every -pred, every compression level), ffmpeg\'s own decode and our Node unfilter give the same pixel md5, and it equals the md5 of the source pixels (the PNG is lossless)', () => {
  let n = 0;
  const all = [...Object.values(ev.contents).flatMap((c) => Object.values(c.runs)), ...Object.values(ev.levels).flatMap((l) => Object.values(l))];
  for (const r of all) { n++; assert.ok(r.readersAgree, r.command); assert.ok(r.pixelsMatchSource, r.command); assert.ok(r.reader2.allCrcOk); assert.equal(r.reader2.chunkTypes[0], 'IHDR'); assert.equal(r.reader2.chunkTypes.at(-1), 'IEND'); }
  assert.ok(n >= 16 * 7 + 3 * 12, `${n} files read`);
  for (const [name, c] of Object.entries(ev.contents)) assert.ok(!String(c.srcMd5).startsWith('NONDET'), `${name} source is deterministic`);
});

t('determinism: every encode gave the same bytes on all 3 repeats, and the batched ffmpeg run (several outputs in one process) gave the same bytes as the single command shown on screen', () => {
  const all = [...Object.values(ev.contents).flatMap((c) => Object.values(c.runs)), ...Object.values(ev.levels).flatMap((l) => Object.values(l))];
  for (const r of all) { assert.ok(r.repeatsIdentical, r.command); if (r.singleCommandSame !== null) assert.ok(r.singleCommandSame, r.command); }
});

t('help text: the build documents -pred with the six values none, sub, up, avg, paeth, mixed', () => {
  assert.ok(ev.help.hasPred);
  assert.match(ev.help.predLine, /Prediction method \(from 0 to 5\)/);
  assert.ok(ev.help.predDefault, 'the help text names a default');
});

// ---- claim 1: the default predictor of the build --------------------------------------------------------------
v6('ffmpeg 6.1.1: the help text says -pred defaults to none, and in every default file every scanline carries filter byte 0 (the histogram is all rows in the none bin), for all 16 images', () => {
  assert.equal(ev.help.predDefault, 'none');
  for (const [name, c] of Object.entries(ev.contents)) {
    const h = c.runs.default.reader2.histogram, rows = c.height;
    assert.deepEqual(h, [rows, 0, 0, 0, 0], name);
  }
});

v6('ffmpeg 6.1.1: the default file is byte for byte the file written by -pred none (same sha-256), for all 16 images, and differs from -pred paeth in every one', () => {
  for (const [name, c] of Object.entries(ev.contents)) {
    assert.equal(c.runs.default.sha256, c.runs.none.sha256, `${name} default == none`);
    assert.notEqual(c.runs.default.sha256, c.runs.paeth.sha256, `${name} default != paeth`);
  }
});

t('reader agreement for the default (any build): the default named by the help text is the filter that the default file really uses, per our parser (rows after the first), when the help names one single filter', () => {
  const name = ev.help.predDefault;
  if (!FILTERS.includes(name)) return; // 'mixed' picks per row; nothing single to compare
  const want = FILTERS.indexOf(name);
  for (const n of RGB24()) {
    const h = ev.contents[n].runs.default.reader2.histogram, rows = ev.contents[n].height;
    assert.ok(h[want] >= rows - 1, `${n}: help says ${name}, file histogram ${JSON.stringify(h)}`);
  }
});

// ---- claim 2: what the filter choice does to the size, by content ------------------------------------------------
v6('ffmpeg 6.1.1: default-versus-paeth sizes, in bytes (default = none): testsrc2 30324 to 26458, mandelbrot 161639 to 152164, noisy field 166220 to 107734, smooth gradient 135338 to 2175, flat colour runs 4346 to 6868, four-colour noise 24081 to 46106', () => {
  const want = {testsrc2: [30324, 26458], mandelbrot: [161639, 152164], noisy_field: [166220, 107734], smooth_gradient: [135338, 2175], flat: [4346, 6868], four_colour_noise: [24081, 46106]};
  for (const [n, [d, p]] of Object.entries(want)) { assert.equal(bytes(n, 'default'), d, `${n} default`); assert.equal(bytes(n, 'paeth'), p, `${n} paeth`); }
});

v6('ffmpeg 6.1.1: the six explicit -pred sizes on testsrc2 640x360 rgb24 are none 30324, sub 30363, up 26424, avg 35015, paeth 26458, mixed 25950', () => {
  const got = Object.fromEntries(PREDS.map((p) => [p, bytes('testsrc2', p)]));
  assert.deepEqual(got, {none: 30324, sub: 30363, up: 26424, avg: 35015, paeth: 26458, mixed: 25950});
});

t('the effect depends on the content (explicit modes, any build): on a smooth gradient -pred paeth is more than 50 times smaller than -pred none; on a noisy photo-like field it is at least 30 percent smaller; on testsrc2 and mandelbrot it is smaller; on flat colour runs and on 4-colour noise it is BIGGER (by more than 30 percent)', () => {
  assert.ok(bytes('smooth_gradient', 'none') > 50 * bytes('smooth_gradient', 'paeth'));
  assert.ok(bytes('noisy_field', 'paeth') < 0.7 * bytes('noisy_field', 'none'));
  assert.ok(bytes('testsrc2', 'paeth') < bytes('testsrc2', 'none'));
  assert.ok(bytes('mandelbrot', 'paeth') < bytes('mandelbrot', 'none'));
  assert.ok(bytes('flat', 'paeth') > 1.3 * bytes('flat', 'none'));
  assert.ok(bytes('four_colour_noise', 'paeth') > 1.5 * bytes('four_colour_noise', 'none'));
});

t('white noise cannot be helped: every -pred gives the same size, to the byte, because the data does not deflate', () => {
  const s = new Set(PREDS.map((p) => bytes('white_noise', p)));
  assert.equal(s.size, 1);
  assert.ok(bytes('white_noise', 'none') > W * H * 3);
});

t('no single filter wins everywhere: across the 10 rgb24 images the smallest explicit mode is not the same for all of them, and none is the smallest on at least two (flat, 4-colour noise), paeth or mixed on at least two', () => {
  const best = (n) => FILTERS.concat('mixed').reduce((a, p) => (bytes(n, p) < bytes(n, a) ? p : a));
  const bests = RGB24().filter((n) => n !== 'white_noise' && n !== 'solid').map((n) => [n, best(n)]);
  assert.ok(new Set(bests.map((b) => b[1])).size >= 3, JSON.stringify(bests));
  assert.ok(bests.filter((b) => b[1] === 'none').length >= 2, 'none wins on at least two');
  assert.ok(bests.filter((b) => b[1] === 'paeth' || b[1] === 'mixed').length >= 2);
});

t('-pred mixed is a safe choice for 8-bit rgb24 images: on the 10 rgb24 images it is never more than 8 percent bigger than the smallest of the six explicit modes', () => {
  for (const n of RGB24()) {
    const min = Math.min(...PREDS.map((p) => bytes(n, p)));
    assert.ok(bytes(n, 'mixed') <= 1.08 * min, `${n}: mixed ${bytes(n, 'mixed')} vs best ${min}`);
  }
});

v6('ffmpeg 6.1.1: -pred mixed is not safe everywhere: on the 16-bit smooth gradient it is 4789 bytes against 2727 for -pred up (76 percent bigger)', () => {
  assert.equal(bytes('smooth_gradient_rgb48', 'mixed'), 4789);
  assert.equal(bytes('smooth_gradient_rgb48', 'up'), 2727);
});

// ---- claim 3: pixels never change ------------------------------------------------------------------------------
t('the pixels do not change: for each of the 16 images the decoded pixel md5 of the default file equals that of every explicit -pred file, by both readers, while the file sha-256 differs between modes', () => {
  for (const [name, c] of Object.entries(ev.contents)) {
    const ref = c.runs.default.reader1.decodedMd5;
    for (const [k, r] of Object.entries(c.runs)) { assert.equal(r.reader1.decodedMd5, ref, `${name}/${k} ffmpeg`); assert.equal(r.reader2.pixelMd5, ref, `${name}/${k} node`); }
    assert.ok(new Set(Object.values(c.runs).map((r) => r.sha256)).size > 1, `${name} files differ`);
  }
});

// ---- the filter bytes of explicit modes ------------------------------------------------------------------------
t('both builds: an explicit -pred sub/up/avg/paeth/none writes that filter on every row, except that up, avg and paeth use sub (1) on the first row, which has no row above it', () => {
  for (const [name, c] of Object.entries(ev.contents)) {
    const rows = c.height;
    assert.deepEqual(c.runs.none.reader2.histogram, [rows, 0, 0, 0, 0], name);
    assert.deepEqual(c.runs.sub.reader2.histogram, [0, rows, 0, 0, 0], name);
    assert.deepEqual(c.runs.up.reader2.histogram, [0, 1, rows - 1, 0, 0], name);
    assert.deepEqual(c.runs.avg.reader2.histogram, [0, 1, 0, rows - 1, 0], name);
    assert.deepEqual(c.runs.paeth.reader2.histogram, [0, 1, 0, 0, rows - 1], name);
    assert.equal(c.runs.paeth.reader2.firstRows[0], 1); assert.equal(c.runs.paeth.reader2.firstRows[1], 4);
  }
});

t('-pred mixed chooses a filter per row: on testsrc2 the histogram uses at least 3 different filter bytes, and it adds up to the number of rows (any build)', () => {
  const h = R('testsrc2', 'mixed').reader2.histogram;
  assert.ok(h.filter((x) => x > 0).length >= 3, JSON.stringify(h));
  assert.equal(h.reduce((a, b) => a + b, 0), 360);
});

t('both builds: the mixed histograms are testsrc2 [0,24,207,1,128], mandelbrot [0,1,9,7,343], text stripes [0,13,167,0,0]', () => {
  assert.deepEqual(R('testsrc2', 'mixed').reader2.histogram, [0, 24, 207, 1, 128]);
  assert.deepEqual(R('mandelbrot', 'mixed').reader2.histogram, [0, 1, 9, 7, 343]);
  assert.deepEqual(R('text_stripes', 'mixed').reader2.histogram.slice(0, 3), [0, 13, 167]);
});

// ---- pixel formats ----------------------------------------------------------------------------------------------
t('pixel formats: the same pattern holds for rgba, 16-bit rgb and 8-bit grey (explicit modes, any build): on the noisy field every non-none mode is smaller than none, on the smooth gradient paeth is smaller than none by more than 25 times (rgba, rgb48) and more than 3 times (grey)', () => {
  for (const f of ['rgba', 'rgb48', 'gray']) {
    for (const p of ['sub', 'up', 'avg', 'paeth', 'mixed']) assert.ok(bytes(`noisy_field_${f}`, p) < bytes(`noisy_field_${f}`, 'none'), `${f}/${p}`);
    assert.ok(bytes(`smooth_gradient_${f}`, 'none') > (f === 'gray' ? 3 : 25) * bytes(`smooth_gradient_${f}`, 'paeth'), f);
  }
  assert.equal(ev.contents.noisy_field_rgba.runs.paeth.reader2.colorType, 6);
  assert.equal(ev.contents.noisy_field_rgb48.runs.paeth.reader2.bitDepth, 16);
  assert.equal(ev.contents.noisy_field_gray.runs.paeth.reader2.colorType, 0);
});

v6('ffmpeg 6.1.1: the default is filter none for rgba, 16-bit rgb and grey as well (all rows, all 6 files), and the sizes are noisy-field rgba 225431 to 127094, rgb48 260074 to 124408, grey 43879 to 30994', () => {
  for (const n of Object.keys(CONTENT).filter((k) => CONTENT[k].pix !== 'rgb24')) assert.deepEqual(R(n, 'default').reader2.histogram, [H, 0, 0, 0, 0], n);
  assert.deepEqual([bytes('noisy_field_rgba', 'default'), bytes('noisy_field_rgba', 'paeth')], [225431, 127094]);
  assert.deepEqual([bytes('noisy_field_rgb48', 'default'), bytes('noisy_field_rgb48', 'paeth')], [260074, 124408]);
  assert.deepEqual([bytes('noisy_field_gray', 'default'), bytes('noisy_field_gray', 'paeth')], [43879, 30994]);
});

// ---- compression level ------------------------------------------------------------------------------------------
t('-compression_level 0 stores the data: with level 0 the default file and the paeth file have the same size on all three images (any build), and it is larger than the inflated scanline data', () => {
  for (const [n, l] of Object.entries(ev.levels)) {
    assert.equal(l.default_l0.bytes, l.paeth_l0.bytes, n);
    assert.ok(l.default_l0.bytes > l.default_l0.reader2.inflatedBytes, n);
  }
});

t('a higher compression level does not rescue a bad predictor (any build, explicit modes): on the smooth gradient and the noisy field, paeth at level 1 is smaller than none at level 9', () => {
  for (const n of ['smooth_gradient', 'noisy_field']) {
    const l = ev.levels[n];
    assert.ok(l.paeth_l1.bytes < l.none_l9.bytes, `${n}: paeth l1 ${l.paeth_l1.bytes} vs none l9 ${l.none_l9.bytes}`);
  }
});

v6('ffmpeg 6.1.1: compression_level 1, 6 and 9 for paeth on the smooth gradient are 3449, 2175 and 1604 bytes; for the default they are 135332, 135338 and 135338; on flat runs the default is 6137, 4346, 3812 and paeth 9553, 6868, 6402', () => {
  const g = ev.levels.smooth_gradient, f = ev.levels.flat;
  assert.deepEqual([1, 6, 9].map((l) => g[`paeth_l${l}`].bytes), [3449, 2175, 1604]);
  assert.deepEqual([1, 6, 9].map((l) => g[`default_l${l}`].bytes), [135332, 135338, 135338]);
  assert.deepEqual([1, 6, 9].map((l) => f[`default_l${l}`].bytes), [6137, 4346, 3812]);
  assert.deepEqual([1, 6, 9].map((l) => f[`paeth_l${l}`].bytes), [9553, 6868, 6402]);
});

t('on flat colour runs the explicit paeth file is more than 30 percent bigger than the explicit none file at compression levels 1, 6 and 9 (any build): the cost of paeth there is not a zlib-level artefact', () => {
  const f = ev.levels.flat;
  for (const l of [1, 6, 9]) assert.ok(f[`paeth_l${l}`].bytes > 1.3 * f[`none_l${l}`].bytes, `level ${l}: paeth ${f[`paeth_l${l}`].bytes} vs none ${f[`none_l${l}`].bytes}`);
});

v6('ffmpeg 6.1.1: at every compression level 0, 1, 6, 9 the default file is byte for byte the -pred none file, on all three images', () => {
  for (const [n, l] of Object.entries(ev.levels)) for (const lv of [0, 1, 6, 9]) assert.equal(l[`default_l${lv}`].sha256, l[`none_l${lv}`].sha256, `${n} level ${lv}`);
});

// ---- the practical angle: hashes and caches -------------------------------------------------------------------
t('the comparison tool works: an evidence file compared with itself says every file has the same bytes and pixels; with one sha-256 altered it reports exactly that file, and the pixels still agree', () => {
  const same = compareEvidence(ev, ev);
  assert.equal(same.explicitSameBytes, same.explicitTotal); assert.equal(same.defaultSameBytes, same.defaultTotal); assert.ok(same.allPixelsSame);
  const other = JSON.parse(JSON.stringify(ev));
  other.contents.testsrc2.runs.default.sha256 = 'x'; other.contents.testsrc2.runs.paeth.sha256 = 'y';
  const diff = compareEvidence(ev, other);
  assert.equal(diff.defaultSameBytes, diff.defaultTotal - 1);
  assert.deepEqual(diff.explicitDifferent, ['testsrc2/paeth']);
  assert.ok(diff.allPixelsSame);
});

v6('ffmpeg 6.1.1: the same picture, two file hashes. testsrc2 default and -pred paeth files are 30324 and 26458 bytes with different sha-256, and one decoded pixel md5', () => {
  const d = R('testsrc2', 'default'), p = R('testsrc2', 'paeth');
  assert.equal(d.bytes, 30324); assert.equal(p.bytes, 26458);
  assert.notEqual(d.sha256, p.sha256);
  assert.equal(d.reader1.decodedMd5, p.reader1.decodedMd5);
  assert.equal(d.reader1.decodedMd5, d.srcMd5);
});


// ---- ffmpeg 8.1.2: what the PC measured (exact numbers only when the build is 8.x) ------------------------
v8('ffmpeg 8.1.2: the help text says -pred defaults to paeth, and in every default file the first row carries filter 1 (sub) and every other row filter 4 (paeth), for all 16 images', () => {
  assert.equal(ev.help.predDefault, 'paeth');
  for (const [name, c] of Object.entries(ev.contents)) assert.deepEqual(c.runs.default.reader2.histogram, [0, 1, 0, 0, c.height - 1], name);
});

v8('ffmpeg 8.1.2: the default file is byte for byte the file written by -pred paeth (same sha-256) on all 16 images, and differs from -pred none on every one', () => {
  for (const [name, c] of Object.entries(ev.contents)) {
    assert.equal(c.runs.default.sha256, c.runs.paeth.sha256, `${name} default == paeth`);
    assert.notEqual(c.runs.default.sha256, c.runs.none.sha256, `${name} default != none`);
  }
});

v8('ffmpeg 8.1.2: default sizes, in bytes: testsrc2 26482, mandelbrot 145654, noisy field 101688, smooth gradient 2229, flat colour runs 6581, four-colour noise 42956, white noise 173623', () => {
  const want = {testsrc2: 26482, mandelbrot: 145654, noisy_field: 101688, smooth_gradient: 2229, flat: 6581, four_colour_noise: 42956, white_noise: 173623};
  for (const [n, b] of Object.entries(want)) assert.equal(bytes(n, 'default'), b, n);
});

v8('ffmpeg 8.1.2: the six explicit -pred sizes on testsrc2 are none 31461, sub 30890, up 27605, avg 35208, paeth 26482, mixed 26203', () => {
  assert.deepEqual(Object.fromEntries(PREDS.map((p) => [p, bytes('testsrc2', p)])), {none: 31461, sub: 30890, up: 27605, avg: 35208, paeth: 26482, mixed: 26203});
});

v8('ffmpeg 8.1.2: compression_level 1, 6 and 9 for the default on the smooth gradient are 4488, 2229 and 1596, and on flat runs 10961, 6581 and 5945 (the default is paeth, so these are the paeth files)', () => {
  for (const [n, want] of [['smooth_gradient', [4488, 2229, 1596]], ['flat', [10961, 6581, 5945]]]) {
    assert.deepEqual([1, 6, 9].map((l) => ev.levels[n][`default_l${l}`].bytes), want, n);
    for (const l of [0, 1, 6, 9]) assert.equal(ev.levels[n][`default_l${l}`].sha256, ev.levels[n][`paeth_l${l}`].sha256, `${n} level ${l}`);
  }
});

// ---- the two builds side by side, from the two saved evidence files (any machine) -----------------------
const A = () => loadEv('evidence-6.1.1.json'), B = () => loadEv('evidence-8.1.2.json');

t('two builds, saved evidence: the files are the evidence of ffmpeg 6.1.1 and ffmpeg 8.1.2, with libavcodec 60 and 62', () => {
  assert.match(A().ffmpeg, /version 6\.1\.1/); assert.match(B().ffmpeg, /version 8\.1\.2/);
  assert.ok(A().libs.some((l) => /^libavcodec 60\./.test(l))); assert.ok(B().libs.some((l) => /^libavcodec 62\./.test(l)));
});

t('two builds: the default predictor changed. The 6.1.1 help says none and its default histograms are all rows filter 0; the 8.1.2 help says paeth and its default histograms are one row of filter 1 and the rest filter 4, on all 16 images', () => {
  const [a, b] = [A(), B()];
  assert.equal(a.help.predDefault, 'none'); assert.equal(b.help.predDefault, 'paeth');
  for (const n of Object.keys(CONTENT)) {
    const rows = a.contents[n].height;
    assert.deepEqual(a.contents[n].runs.default.reader2.histogram, [rows, 0, 0, 0, 0], `6.1.1 ${n}`);
    assert.deepEqual(b.contents[n].runs.default.reader2.histogram, [0, 1, 0, 0, rows - 1], `8.1.2 ${n}`);
  }
});

t('two builds: the picture does not change. Every one of the 112 files (16 images x 7 variants) decodes to the same pixels on both builds, by both readers, and equals the source', () => {
  const c = compareEvidence(A(), B());
  assert.equal(c.rows.length, 112); assert.ok(c.allPixelsSame);
  for (const r of Object.values(B().contents).flatMap((x) => Object.values(x.runs))) assert.ok(r.pixelsMatchSource && r.readersAgree);
});

t('two builds: no file has the same bytes on both builds. 0 of 96 explicit -pred files and 0 of 16 default files are byte-identical (-pred none on testsrc2 is 30324 B on 6.1.1 and 31461 B on 8.1.2), while the filter histogram of every explicit -pred file is the same on both builds (96 of 96)', () => {
  const c = compareEvidence(A(), B());
  assert.equal(c.explicitTotal, 96); assert.equal(c.explicitSameBytes, 0);
  assert.equal(c.defaultTotal, 16); assert.equal(c.defaultSameBytes, 0);
  assert.equal(c.explicitSameHistogram, 96);
  assert.equal(A().contents.testsrc2.runs.none.bytes, 30324); assert.equal(B().contents.testsrc2.runs.none.bytes, 31461);
});

t('two builds: the 8.1.2 default equals no explicit mode of 6.1.1 in bytes, on any of the 16 images', () => {
  const c = compareEvidence(A(), B());
  for (const [n, d] of Object.entries(c.defaultVsExplicit)) assert.deepEqual(d.aExplicitWithSameBytes, [], n);
});

t('two builds, the same command: moving from 6.1.1 to 8.1.2 the default file gets 98.4 percent smaller on the smooth gradient (135338 to 2229), 38.8 percent smaller on the noisy field (166220 to 101688), 12.7 percent on testsrc2 (30324 to 26482) and 9.9 percent on mandelbrot (161639 to 145654), but 51.4 percent bigger on flat colour runs (4346 to 6581) and 78.4 percent bigger on 4-colour noise (24081 to 42956); white noise is unchanged at 173623', () => {
  const d = (n) => [A().contents[n].runs.default.bytes, B().contents[n].runs.default.bytes];
  const pct = (n) => { const [x, y] = d(n); return Math.round((y / x - 1) * 1000) / 10; };
  assert.deepEqual(d('smooth_gradient'), [135338, 2229]); assert.equal(pct('smooth_gradient'), -98.4);
  assert.deepEqual(d('noisy_field'), [166220, 101688]); assert.equal(pct('noisy_field'), -38.8);
  assert.deepEqual(d('testsrc2'), [30324, 26482]); assert.equal(pct('testsrc2'), -12.7);
  assert.deepEqual(d('mandelbrot'), [161639, 145654]); assert.equal(pct('mandelbrot'), -9.9);
  assert.deepEqual(d('flat'), [4346, 6581]); assert.equal(pct('flat'), 51.4);
  assert.deepEqual(d('four_colour_noise'), [24081, 42956]); assert.equal(pct('four_colour_noise'), 78.4);
  assert.deepEqual(d('white_noise'), [173623, 173623]);
});

t('two builds: some PNGs get bigger on upgrade and some smaller. Counting the 16 images, the default file is smaller on 8.1.2 for 12 and bigger for 3 (flat runs, 4-colour noise, solid grey by 4 bytes), and unchanged in size for white noise', () => {
  const [a, b] = [A(), B()];
  const names = Object.keys(CONTENT);
  const bigger = names.filter((n) => b.contents[n].runs.default.bytes > a.contents[n].runs.default.bytes);
  const smaller = names.filter((n) => b.contents[n].runs.default.bytes < a.contents[n].runs.default.bytes);
  assert.deepEqual(bigger.sort(), ['flat', 'four_colour_noise', 'solid']);
  assert.equal(smaller.length, 12);
  assert.equal(names.length - bigger.length - smaller.length, 1);
});

t('two builds, same file, other metadata: both builds write the chunks IHDR, pHYs, IDAT, IEND (no other chunk), only the number of IDAT chunks for the same image can differ', () => {
  for (const ev2 of [A(), B()]) for (const r of Object.values(ev2.contents).flatMap((x) => Object.values(x.runs))) {
    assert.deepEqual([...new Set(r.reader2.chunkTypes)], ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  }
});

t('two builds, filtered scanline data: where both evidence files carry the md5 of the inflated scanlines (filter bytes included), the explicit modes have identical scanline data on both builds even though the compressed bytes differ; the check is skipped on files without that field', () => {
  const c = compareEvidence(A(), B());
  if (!c.filteredDataKnown) return; // evidence from the PC was taken before the field existed
  assert.equal(c.explicitSameFilteredData, c.rows.filter((r) => r.run !== 'default' && r.sameFilteredData !== null).length);
});

t('fixture budget: the whole measurement ran in under 90 seconds on this machine', () => {
  assert.ok(ev.seconds < 90, `${ev.seconds} s`);
});
