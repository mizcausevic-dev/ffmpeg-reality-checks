// Deep dive 03: "Why colors shift: is it the label, or the pixels?" One test per claim, the recipe check, a known positive per reader, and the script.
// The experiment re-runs the six source fixtures (ff17, ff22, ff26, ff44, ff76, ff85) live, about a minute. Exact numbers are asserted on ffmpeg 6.1.1 only
// (the build of this container); every other build gets the relations that must hold anyway. Where a source test already branches on the build, so does this one.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, PATCHES, RECIPE_COMMAND} from '../fixture/experiment.mjs';
import {videoData, readBlock, BEGIN, END} from '../fixture/video-data.mjs';
import {CLAIMS, accountFor, checkClaim, captionNumbers, claimValues, readScript, evidenceNumbers, copyNumbers} from '../fixture/claims.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl03-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const tz = (name, fn, needs = ['zscale']) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, (ctx) => {
  const missing = needs.filter((f) => !ev.ff44[f]);
  if (missing.length) { ctx.skip(`${missing.join(', ')} not in this ffmpeg build`); return; }
  fn();
});
const v6 = () => ev.build === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const SMALL = 3, BIG = 15;

// ---- the evidence ---------------------------------------------------------------------------------------------------------------------
t('ffmpeg -version is recorded, the build is recognised, and all six source experiments and the recipe ran', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  for (const k of ['ff17', 'ff22', 'ff26', 'ff44', 'ff76', 'ff85', 'recipe', 'labelOnly']) assert.ok(ev[k], k);
  assert.equal(JSON.stringify(ev).includes('"node"'), false, 'raw planes are not kept in the evidence');
});

// ---- ff17: the matrix -----------------------------------------------------------------------------------------------------------------
t('matrix (ff17): the default output has no matrix tag and BT.601 pixels; read as BT.709 it is wrong by 30 or more, gray never moves, and a file converted with BT.709 and tagged reads right', () => {
  const d = ev.ff17.encodes.default, g = ev.ff17.encodes.tagged709;
  assert.equal(d.tag.colorSpace, null);
  assert.ok(d.read.auto.worstError <= SMALL && d.read.bt601.worstError <= SMALL);
  assert.ok(d.read.bt709.worstError >= 30);
  for (const e of Object.values(ev.ff17.encodes)) for (const r of Object.values(e.read)) for (const x of r.patches.gray) near(x, 128, 1, 'gray');
  assert.equal(g.tag.colorSpace, 'bt709');
  assert.ok(g.read.auto.worstError <= SMALL && g.read.bt709.worstError <= SMALL && g.read.bt601.worstError >= BIG);
  if (v6()) {
    assert.deepEqual(d.read.bt709.patches.green, [0, 215, 0]);
    assert.equal(d.read.bt709.patches.red[1], 23); assert.equal(d.read.bt709.patches.blue[1], 14);
    assert.equal(d.read.bt709.worstError, 40); assert.equal(g.read.bt601.worstError, 23);
  }
});
t('matrix (ff17): -colorspace bt709 on a plain RGB source is a label only on 6.1.1 (tag bt709, pixels still BT.601, error 40); on a build that converts too it reads right', () => {
  const e = ev.ff17.encodes.liar;
  assert.equal(e.tag.colorSpace, 'bt709');
  if (e.read.auto.worstError <= SMALL) assert.ok(e.read.bt709.worstError <= SMALL, 'the conversion followed the tag');
  else { assert.ok(e.read.auto.worstError >= 30 && e.read.bt601.worstError <= SMALL, 'a label on BT.601 pixels'); }
  if (v6()) assert.equal(e.read.auto.worstError, 40);
  // scale=out_color_matrix=bt709 without a tag: BT.709 pixels everywhere, the tag only on some builds
  const u = ev.ff17.encodes.untagged709;
  assert.ok(u.read.bt709.worstError <= SMALL);
  if (u.tag.colorSpace == null) { assert.ok(u.read.auto.worstError >= BIG); if (v6()) assert.equal(u.read.auto.worstError, 23); }
});

// ---- ff76: black and white ------------------------------------------------------------------------------------------------------------
const F = ['red', 'green', 'blue', 'yellow'];
const sh = (s, m, n) => ev.ff76.patches[s][m].shown[n][0];
const raw = (s, m, n) => ev.ff76.patches[s][m].native[n][0];
t('gray (ff76): format=gray and hue=s=0 store different numbers (white 255 against 235) but show the same picture (within 1); the mixer follows its own weights (the 709 set matches the Node formula within 1)', () => {
  const g = ev.ff76.patches.rgb.gray, h = ev.ff76.patches.rgb.hue;
  assert.equal(g.range, 'pc'); assert.ok(h.range === 'tv' || (h.range == null && /^yuv/.test(h.fmt)));
  assert.ok(raw('rgb', 'gray', 'white') - raw('rgb', 'hue', 'white') >= 20 && raw('rgb', 'hue', 'black') - raw('rgb', 'gray', 'black') >= 15);
  for (const n of Object.keys(PATCHES).concat(['yellow'])) if (ev.ff76.patches.rgb.gray.shown[n]) near(sh('rgb', 'hue', n), sh('rgb', 'gray', n), 1, n);
  for (const n of F) near(sh('rgb', 'ccm709', n), ev.ff76.model['709'][n], 1, `mixer 709 ${n}`);
  if (v6()) {
    assert.deepEqual(F.map((n) => raw('rgb', 'gray', n)), [76, 150, 29, 226]);
    assert.deepEqual(F.map((n) => raw('rgb', 'hue', n)), [81, 145, 41, 210]);
    assert.deepEqual(['red', 'green', 'blue'].map((n) => sh('rgb', 'hue', n)), [76, 150, 29]);
    assert.deepEqual(['red', 'green', 'blue'].map((n) => sh('rgb', 'ccm709', n)), [54, 182, 18]);
  }
});
t('gray (ff76): on a BT.709 file 6.1.1 gray follows the file (red 55, green 183) while the BT.601 mixer stays at 76 and 149 (green 34 off); other builds may differ, but gray and the BT.601 mixer cannot both match the BT.709 numbers', () => {
  const gap = (n) => Math.abs(sh('hd', 'gray', n) - sh('hd', 'ccm601', n));
  if (v6()) {
    assert.deepEqual(['red', 'green'].map((n) => sh('hd', 'gray', n)), [55, 183]);
    assert.deepEqual(['red', 'green'].map((n) => sh('hd', 'ccm601', n)), [76, 149]);
    assert.equal(sh('hd', 'gray', 'green') - sh('hd', 'ccm601', 'green'), 34);
    assert.ok(F.every((n) => gap(n) >= 10));
  } else {
    const far = (n) => Math.abs(sh('hd', 'ccm709', n) - sh('hd', 'gray', n));
    assert.ok(far('green') >= 30 || gap('green') <= 2, 'gray equals the 601 mixer or follows the file');
  }
});

// ---- ff26: range ----------------------------------------------------------------------------------------------------------------------
const C = (k) => ev.ff26.cases[k];
const Y = (k, p) => C(k).patches[p].rawY;
const LIMITED = {black: 16, white: 235, shadow: 23, highlight: 228}, FULL = {black: 0, white: 255, shadow: 8, highlight: 247};
const ys = (k) => Object.fromEntries(Object.keys(FULL).map((p) => [p, Y(k, p)]));
t('range (ff26): the default writes black at 16 and white at 235 with no range tag; -color_range pc is a label only on 6.1.1 (identical raw frame, tag pc, a tag-following player shows 16) and converts on 8.x', () => {
  assert.deepEqual(ys('default'), LIMITED); assert.equal(C('default').color_range, 'unknown');
  assert.equal(C('pc_tag').color_range, 'pc');
  if (v6()) {
    assert.equal(C('pc_tag').rawMd5, C('default').rawMd5); assert.deepEqual(ys('pc_tag'), LIMITED);
    assert.equal(C('pc_tag').patches.black.shownByTag, 16); assert.equal(C('pc_tag').patches.white.shownByTag, 235);
  } else assert.ok(C('pc_tag').rawMd5 === C('default').rawMd5 || C('pc_tag').rawMd5 === C('yuvj').rawMd5);
});
t('range (ff26): both directions on every build: flag 1 on limited bytes shows black as 16; flag 0 on full bytes crushes 8 and 247 to 0 and 255; -pix_fmt yuvj420p is the real fix (Y 0 and 255, tag pc, shown right)', () => {
  assert.equal(C('relabel_pc').rawMd5, C('default').rawMd5); assert.equal(C('relabel_pc').color_range, 'pc');
  assert.equal(C('relabel_pc').patches.black.shownByTag, 16); assert.equal(C('relabel_pc').patches.white.shownByTag, 235);
  assert.equal(C('relabel_tv').rawMd5, C('yuvj').rawMd5); assert.notEqual(C('relabel_tv').color_range, 'pc');
  assert.equal(C('relabel_tv').patches.shadow.shownByTag, 0); assert.equal(C('relabel_tv').patches.highlight.shownByTag, 255);
  assert.deepEqual(ys('yuvj'), FULL); assert.equal(C('yuvj').color_range, 'pc'); assert.equal(C('yuvj').patches.black.shownByTag, 0); assert.equal(C('yuvj').patches.white.shownByTag, 255);
});

// ---- ff44: HDR to SDR -----------------------------------------------------------------------------------------------------------------
const H = (k) => ev.ff44.hdr[k], S = (k) => ev.ff44.sdr[k];
const tagsOf = (r) => ({p: r.tags.color_primaries, t: r.tags.color_transfer, s: r.tags.color_space, r: r.tags.color_range});
t('HDR (ff44): a plain -pix_fmt yuv420p only rescales: 100 nit white lands far below the 235 an SDR white has (127.3 on 6.1.1), the 50 nit patch is more than 60 codes dark, nothing is clipped (five distinct highlights), and the PQ tags survive; the SDR control is left alone', () => {
  const r = H('pix');
  assert.equal(r.failed, false);
  assert.ok(ev.ff44.expected[4] - r.y[4] > 100);
  assert.ok(r.sum.err[3] < -60, `50 nit error ${r.sum.err[3]}`);
  assert.equal(r.sum.highDistinct, 5);
  assert.deepEqual(tagsOf(r), {p: 'bt2020', t: 'smpte2084', s: 'bt2020nc', r: 'tv'});
  assert.ok(S('pix').sum.err.every((e) => Math.abs(e) <= 1), 'control');
  if (v6()) { near(r.y[4], 127.3, 0.1); near(r.sum.err[3], -67.5, 0.1); assert.equal(ev.ff44.expected[4], 235); }
});
t('HDR (ff44): forcing the colorspace filter with iall=bt2020 keeps the naive pixels (every patch within 0.5) and rewrites the tags to bt709; without iall it refuses PQ on 6.1.1', () => {
  const r = H('csIall');
  if (r.failed) { assert.notEqual(ev.build, 'v6', 'this must work on 6.1.1'); return; }
  r.y.forEach((v, i) => near(v, H('pix').y[i], 0.5, `patch ${i}`));
  assert.deepEqual(tagsOf(r), {p: 'bt709', t: 'bt709', s: 'bt709', r: 'tv'});
  if (v6()) { assert.equal(H('csPlain').failed, true); assert.match(H('csPlain').error, /Unsupported input transfer characteristics 16/); }
});
tz('HDR (ff44): zscale reads the tags and is exact from 0 to 100 nits but puts 203 nits and above on one value; with tonemap=hable they stay apart (203 nits at 182 on 6.1.1); the SDR control is unchanged; the relabelled file stays grey', () => {
  const z = H('zsPlain');
  assert.equal(z.failed, false); assert.ok(z.sum.maxLowErr <= 1); assert.equal(z.sum.highDistinct, 1);
  assert.ok(S('zsPlain').sum.err.every((e) => Math.abs(e) <= 1));
  if (ev.ff44.tonemap) {
    const h = H('zsHable'); assert.equal(h.sum.highDistinct, 5);
    if (v6()) { assert.equal(Math.round(h.y[5]), 182); assert.equal(Math.round(h.y[8]), 254); }
  }
  if (ev.ff44.recoverRelabel.y) assert.ok(ev.ff44.recoverRelabel.sum.maeMid > 50);
});

// ---- ff22: chroma ---------------------------------------------------------------------------------------------------------------------
const R22 = (k) => ev.ff22.runs[k];
const between = (v, lo, hi, msg) => assert.ok(v >= lo && v <= hi, `${msg}: ${v} not in ${lo}..${hi}`);
t('chroma (ff22): through yuv420p (and yuv422p) a vertical one pixel red line turns purple and tints its right neighbour, yuv444p keeps it red, a horizontal line survives 4:2:2 and smears in 4:2:0, and Y does not move (about 81)', () => {
  const red = R22('vline_yuv444p').rgb[0];
  between(red[0], 245, 255, 'R'); between(red[1], 0, 6, 'G'); between(red[2], 0, 6, 'B');
  for (const k of ['vline_yuv422p', 'vline_yuv420p']) { const p = R22(k).rgb[0]; between(p[0], 120, 180, k + ' R'); between(p[2], 120, 180, k + ' B'); between(R22(k).rgb[1][0], 80, 130, k + ' +1'); }
  between(R22('hline_yuv422p').rgb[0][0], 245, 255, '422 hline R'); between(R22('hline_yuv420p').rgb[0][2], 120, 200, '420 hline B');
  for (const r of Object.values(ev.ff22.runs)) between(r.chroma.y, 78, 84, 'Y');
  if (v6()) { assert.deepEqual(R22('vline_yuv420p').rgb[0], [150, 21, 149]); assert.equal(R22('vline_yuv420p').chroma.y, 81); }
});

// ---- ff85: bit depth ------------------------------------------------------------------------------------------------------------------
const M85 = (n) => ev.ff85.modes[n];
t('bit depth (ff85): format=yuv420p already dithers a 10 bit ramp (more than 64 values, every 2 x 2 block mean exact); only sws_dither=none changes the bytes, into flat bands (64 values of 16 px on 6.1.1); the other spellings are byte for byte the default; no spelling adds levels', () => {
  assert.equal(ev.ff85.control.distinct, 256); assert.equal(ev.ff85.control.mismatches, 0);
  assert.ok(M85('default').distinct > 64 && M85('default').blockMaxErr < 0.001);
  const group = ev.ff85.classes.find((c) => c.includes('default'));
  for (const m of ['auto', 'bayer', 'ed', 'a_dither', 'x_dither', 'flag_ed']) assert.ok(group.includes(m), m);
  assert.ok(M85('none').md5 !== M85('default').md5);
  for (const m of ['default', 'none', 'ed']) assert.equal(ev.ff85.full[m].distinct, 256);
  if (v6()) { assert.equal(M85('default').distinct, 65); assert.equal(M85('none').distinct, 64); assert.equal(M85('none').maxRun, 16); assert.equal(M85('none').meanRun, 16); assert.equal(group.length, 7); }
});
t('bit depth (ff85) known positive: with rgb8 output the same eight spellings give more than one output, seen by both readers, so identical yuv420p bytes are not a blind reader', () => {
  assert.ok(ev.ff85.rgb8Classes.length >= 3);
  assert.deepEqual(ev.ff85.rgb8Classes.map((c) => c.slice().sort()).sort(), ev.ff85.rgb8ClassesFfmpeg.map((c) => c.slice().sort()).sort());
  assert.deepEqual(ev.ff85.classes.map((c) => c.slice().sort()).sort(), ev.ff85.classesFfmpeg.map((c) => c.slice().sort()).sort());
  if (v6()) assert.equal(ev.ff85.rgb8Classes.length, 5);
});

// ---- the cross-film finding ------------------------------------------------------------------------------------------------------------
t('label or pixels: three commands change only the label. On 6.1.1: -colorspace bt709 (ff17), -color_range pc (ff26) and colorspace=all=bt709:iall=bt2020 (ff44) each leave the pixels identical to the default and move a tag; the bitstream relabel does it on every build', () => {
  assert.equal(ev.labelOnly.rangeBsf, true);
  assert.equal(ev.labelOnly.transfer, true);
  if (v6()) { assert.equal(ev.labelOnly.matrix, true); assert.equal(ev.labelOnly.range, true); assert.equal(['matrix', 'range', 'transfer'].filter((k) => ev.labelOnly[k]).length, 3); }
  else assert.equal(ev.labelOnly.matrix, ev.ff17.encodes.liar.read.auto.worstError >= 30);
});

// ---- the recipe -----------------------------------------------------------------------------------------------------------------------
const RC = (k) => ev.recipe.encodes[k];
t('recipe: the recommended command on a fresh six patch card (two readers). Reader 1 ffprobe: yuv420p, bt709 matrix, primaries and transfer, range not pc. Reader 2 the decoded RGB: right within 3 when the tag is followed and when read as BT.709, wrong by 15 or more as BT.601 (23 on 6.1.1), gray untouched', () => {
  assert.equal(ev.recipe.command, RECIPE_COMMAND);
  const r = RC('recipe');
  assert.deepEqual([r.tag.pixFmt, r.tag.colorSpace, r.tag.colorPrimaries, r.tag.colorTransfer], ['yuv420p', 'bt709', 'bt709', 'bt709']);
  assert.notEqual(r.tag.range, 'pc');
  assert.ok(r.read.auto.worstError <= SMALL && r.read.bt709.worstError <= SMALL);
  assert.ok(r.read.bt601.worstError >= BIG);
  for (const rd of Object.values(r.read)) for (const v of rd.patches.gray) near(v, 128, 1, 'gray');
  if (v6()) { assert.equal(r.read.auto.worstError, 1); assert.equal(r.read.bt601.worstError, 23); }
});
t('recipe: the range is limited and agreed by both range readers. Raw luma plane (Node) and signalstats (ffmpeg) both say black 16 and white 235, and decoding gives black 0 and white 255 within 2', () => {
  const r = RC('recipe');
  assert.deepEqual([r.rawY.black, r.rawY.white], [16, 235]);
  assert.deepEqual([r.stats.black.min, r.stats.white.max], [16, 235]);
  near(r.read.auto.patches.black[0], 0, 2); near(r.read.auto.patches.white[0], 255, 2);
});
t('recipe control: the plain command writes no tag and BT.601 pixels, so a reader that follows the file is right (within 3) and a BT.709 reading is wrong by 30 or more (40 on 6.1.1)', () => {
  const p = RC('plain');
  assert.equal(p.tag.colorSpace, null);
  assert.ok(p.read.auto.worstError <= SMALL && p.read.bt601.worstError <= SMALL && p.read.bt709.worstError >= 30);
  if (v6()) assert.equal(p.read.bt709.worstError, 40);
  assert.ok(RC('recipe').read.bt709.worstError < p.read.bt709.worstError, 'the recipe beats the plain command under a BT.709 reading');
});
t('recipe control: -colorspace bt709 alone writes the tag; on 6.1.1 the pixels are still BT.601 and a tag-following reader is off by 40 (on a build that converts too, it reads right)', () => {
  const l = RC('tagOnly');
  assert.equal(l.tag.colorSpace, 'bt709');
  if (l.read.auto.worstError <= SMALL) assert.ok(l.read.bt709.worstError <= SMALL);
  else { assert.ok(l.read.auto.worstError >= 30 && l.read.bt601.worstError <= SMALL); }
  if (v6()) assert.equal(l.read.auto.worstError, 40);
});

// ---- a known positive for every reader, and the readers agree -------------------------------------------------------------------------
t('known positive, label reader: ffprobe tells the recipe (bt709, tv) from the plain command (no tag), and a full range encode (range pc) from both', () => {
  assert.notEqual(RC('recipe').tag.colorSpace, RC('plain').tag.colorSpace);
  assert.equal(RC('recipe').tag.range === 'pc', false); assert.equal(RC('full').tag.range, 'pc');
});
t('known positive, pixel reader: the decoded RGB tells a BT.709 file from a BT.601 file (the same reading gives errors of 3 or less and 30 or more), and a wrong-matrix reading of the six source experiments is seen too', () => {
  const a = RC('recipe').read.bt709.worstError, b = RC('plain').read.bt709.worstError;
  assert.ok(a <= SMALL && b >= 30);
  assert.ok(ev.ff17.encodes.untagged709.read.bt601.worstError >= BIG);
});
t('known positive, range readers: raw luma and signalstats both see a limited encode (16, 235) against a full encode (0, 255), and agree on every encode', () => {
  for (const [k, e] of Object.entries(ev.recipe.encodes)) { assert.equal(e.rawY.black, e.stats.black.min, `${k} black`); assert.equal(e.rawY.white, e.stats.white.max, `${k} white`); }
  assert.deepEqual([RC('full').rawY.black, RC('full').rawY.white, RC('full').stats.black.min, RC('full').stats.white.max], [0, 255, 0, 255]);
});
t('reader agreement in the source experiments: ff26 signalstats equals the raw luma byte in every case; ff44 Node and signalstats luma agree within 1; ff85 Node and ffmpeg md5 agree; ff76 what is seen follows the stored number through the range map', () => {
  for (const c of Object.values(ev.ff26.cases)) for (const v of Object.values(c.patches)) { assert.equal(v.signalstatsMin, v.rawY); assert.equal(v.signalstatsMax, v.rawY); assert.equal(v.shownByFfmpegGray, v.shownByTag); }
  for (const kind of ['hdr', 'sdr']) for (const r of Object.values(ev.ff44[kind])) if (r.y) assert.ok(r.readerGap <= 1);
  for (const m of Object.values(ev.ff85.modes)) assert.equal(m.md5, m.md5Ffmpeg);
  const tv = (y) => Math.max(0, Math.min(255, Math.round(((y - 16) * 255) / 219)));
  for (const n of F) near(sh('rgb', 'hue', n), tv(raw('rgb', 'hue', n)), 1, n);
});

// ---- the script: every spoken number is in the evidence ------------------------------------------------------------------------------
const script = () => readScript('fl03');
t('script: 14 to 18 scenes, 850 to 1050 words, a title of at most 74 characters, kicker, thumb, endCard, no em dashes, no uppercase flags, ids unique', () => {
  const s = script(), words = s.scenes.reduce((a, x) => a + x.narration.trim().split(/\s+/).length, 0);
  assert.ok(s.scenes.length >= 14 && s.scenes.length <= 18, `${s.scenes.length} scenes`);
  assert.ok(words >= 850 && words <= 1050, `${words} words`);
  assert.ok(s.fullTitle.length <= 74 && s.title.length > 0);
  assert.equal(s.kicker, 'Deep dive 03'); assert.equal(s.series, 'FFmpeg Reality Checks'); assert.ok(s.thumb.number && s.thumb.label.length <= 28 && ['red', 'cyan', 'amber', 'green'].includes(s.thumb.color));
  assert.deepEqual(s.endCard, {});
  assert.equal(new Set(s.scenes.map((x) => x.id)).size, s.scenes.length);
  assert.ok(s.scenes.some((x) => x.id === s.hero.scene));
  const all = JSON.stringify(s);
  assert.equal(all.includes('\u2014'), false); assert.equal(all.includes('\u2013'), false);
  assert.equal(/-[A-Z][a-z_]+\b/.test(s.scenes.flatMap((x) => x.captions).join(' ')), false, 'flags stay lowercase');
});
t('script: the estimated length at 148 words a minute is 5:40 to 6:50 for the narration alone, and still at most 6:50 with the 0.6 s lead and the end card hold', () => {
  const s = script(), words = s.scenes.reduce((a, x) => a + x.narration.trim().split(/\s+/).length, 0), sec = (words / 148) * 60;
  assert.ok(sec >= 340 && sec <= 410, `${sec.toFixed(1)} s`);
  assert.ok(sec + 0.6 + (s.endCard.seconds ?? 10) + 0.5 <= 410, `${(sec + 11.1).toFixed(1)} s with the end card`);
});
t('script: every number word in the narration of every scene is a measured value (a claim read from the live evidence), a format or build label, or a structural count; every claim that is spoken holds on 6.1.1', (ctx) => {
  if (!v6()) { ctx.skip('exact spoken numbers are asserted on ffmpeg 6.1.1 only'); return; }
  for (const sc of script().scenes) {
    const {used, uncovered} = accountFor(sc.narration, sc.id);
    assert.deepEqual(uncovered, [], `${sc.id}: number words not accounted for`);
    for (const c of used) checkClaim(c, ev).forEach((x, i) => assert.ok(x.ok, `${sc.id}: "${c.phrase}" should be ${JSON.stringify(c.value)}, evidence ${i} gives ${JSON.stringify(x.got)}`));
  }
});
t('script: every digit in the captions is a measured value too', (ctx) => {
  if (!v6()) { ctx.skip('exact numbers are asserted on ffmpeg 6.1.1 only'); return; }
  const allowed = claimValues(); for (const n of [1, 2, 3, 6, 601, 709, 2020, 420, 444, 422]) allowed.add(n); // counts and matrix or format names, the same labels the narration spells
  for (const sc of script().scenes) for (const line of sc.captions) for (const n of captionNumbers(line)) assert.ok(allowed.has(n), `${sc.id}: "${line}" has ${n}`);
});

// ---- the written copy ---------------------------------------------------------------------------------------------------------------------
const root = new URL('../../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const section = (md, head) => { const m = new RegExp(`### ${head}[^\\n]*\\n\\n([\\s\\S]*?)(?=\\n### |$)`).exec(md); return m ? m[1].trim() : ''; };
for (const [id, short] of [['fl03', false], ['fs03', true]]) {
  t(`copy (${id}): title options at most 60 characters, 15 tags, pinned comment at most 300, description under 5000, no em dashes${short ? ', starts with a one line hook and ends with #Shorts' : ', chapters block present, names the short cut and the six source films'}`, () => {
    const md = read(`${id}/content/distribution.md`);
    const titles = [...section(md, 'Title options').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    assert.ok(titles.length >= 3 && titles.every((x) => x.length <= 60), JSON.stringify(titles.map((x) => x.length)));
    assert.equal(section(md, 'Tags').split(',').length, 15);
    assert.ok(section(md, 'Pinned comment').length <= 300);
    const desc = section(md, 'Description'); assert.ok(desc.length < 5000 && desc.length > 500, `${desc.length}`);
    assert.equal(md.includes('\u2014'), false); assert.equal(md.includes('{{'), false);
    const pin = section(md, 'Pinned comment'); assert.match(pin, /6\.1\.1/);
    if (short) { assert.ok(desc.split('\n')[0].length < 200); assert.ok(desc.trim().endsWith('#Shorts')); }
    else {
      assert.match(md, /<!-- chapters:start -->[\s\S]*<!-- chapters:end -->/);
      for (const title of [readScript('fs03').fullTitle, "FFmpeg's Default Output Is BT.601, With No Tag", 'FFmpeg yuv420p Turns a 1-Pixel Red Line Purple', 'FFmpeg HDR to SDR: a Plain Conversion Puts 100 Nit White at 127, Not 235']) assert.ok(desc.includes(title), title);
      assert.ok(desc.includes('FFmpeg Black and White: gray and hue Match') && desc.includes('FFmpeg 10-bit to 8-bit Banding') && desc.includes('FFmpeg -color_range pc: 6.1.1 Relabels Black as 16'));
    }
  });
  t(`copy (${id}): every number in the description, the pinned comment and the outline row is in the evidence (or is a count or a format name)`, () => {
    const allowed = evidenceNumbers(ev);
    for (const [name, text] of [['distribution', read(`${id}/content/distribution.md`)], ['outline-row', read(`${id}/outline-row.md`)]]) for (const n of copyNumbers(text)) assert.ok(allowed.has(n), `${id} ${name}: ${n} is not in the evidence`);
  });
}

// ---- the films: every measured number a scene draws is the live evidence ---------------------------------------------------------------
// The render engine copies only video/Scenes.tsx and video/index.tsx, so both films carry a generated copy of videoData(evidence); this keeps it honest.
const SCENES = (ep) => fs.readFileSync(new URL(`../../${ep}/video/Scenes.tsx`, import.meta.url), 'utf8');
const stripGenerated = (src) => src.slice(0, src.indexOf(BEGIN)) + src.slice(src.indexOf(END) + END.length);
t('films: the data block embedded in the Scenes.tsx of fl03 and fs03 equals videoData() of the live evidence (regenerate with node episodes/fl03/fixture/embed-video-data.mjs)', (ctx) => {
  if (!v6()) { ctx.skip('the embedded data is the 6.1.1 evidence'); return; }
  const live = JSON.parse(JSON.stringify(videoData(ev)));
  for (const ep of ['fl03', 'fs03']) assert.deepEqual(readBlock(SCENES(ep)), live, `${ep}/video/Scenes.tsx data block is out of date`);
});
t('films: outside the generated block, no scene types a measured number into a string (only matrix, format and flag names, structural counts and the recorded 8.1.2 build)', () => {
  const allowed = [/\b(bt)?(601|709|2020)\b/gi, /\b(yuvj?|rgb|ccm|grayOn)\w*\b/gi, /\b\w*x264\b/g, /\bmd5\b/g, /\bmp4\b/g, /\b4:2:0\b/g, /\b10 bit to 8 bit\b/g, /\brgb8\b/g, /\brgb24\b/g, /\b8\.1\.2\b/g,
    /\bflag = [01]\b/g, /\brow 0 and row 1, the first 16 pixels\b/g, /\bof 3\b/g, /\bhue=s=0\b/g, /\b[1-9]\b(?= ?(?:spellings?|commands?|cases?|readers?|films?))/g];
  const css = /px|%|#|gradient|\\u|\bdecoded\b.*\bas 709\b/;
  const bad = [];
  for (const ep of ['fl03', 'fs03']) {
    const src = stripGenerated(SCENES(ep)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const found = [];
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) found.push((m[1] ?? m[2] ?? m[3]).replace(/\$\{[^}]*\}/g, ' '));
    for (const m of src.matchAll(/>([^<>{}\n]*\d[^<>{}\n]*)</g)) found.push(m[1]);
    for (const f of found) {
      if (!/\d/.test(f) || css.test(f) || /^\s+[0-9a-f]{2}$/.test(f) || /^\d+ \d+$/.test(f)) continue; // alpha suffixes of colors, svg dash arrays
      let rest = f; for (const re of allowed) rest = rest.replace(re, ' ');
      if (/\d/.test(rest)) bad.push(`${ep}: ${JSON.stringify(f)}`);
    }
  }
  assert.deepEqual(bad, [], 'numbers typed into a scene: read them from DATA instead');
});
