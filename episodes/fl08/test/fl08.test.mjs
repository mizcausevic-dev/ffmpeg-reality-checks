import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, ALPHA_CONTENT, ALPHA_LAVFI, MAIN_RANGE, EXTRA_RANGE, TAGS} from '../fixture/experiment.mjs';

// Relations hold on any build. Exact numbers are asserted only on the build they were measured on:
//   ffmpeg 6.1.1 (this container, evidence.json) and ffmpeg 8.1.2 (the PC, evidence-v8.json from the first run).
// The colordetect assertions skip when the filter does not exist.
// Three ways to write a tag (ffprobe measured on the PC by probe-pc.mjs: which are a pure label depends on the build):
//   `content_tag`      label: `-vf setparams=range=T -color_range T`, pure (bytes untouched, tag read back) on 6.1.1 and 8.1.2
//   `content_tag_opt`  option: the output option `-color_range T` alone; relabel on 6.1.1, converts tv to pc on 8.1.2
//   `content_tag_vf`   vf: `-vf setparams=range=T` alone; pure on 6.1.1, on 8.1.2 FFV1 converts a pc frame to limited and the file reads tv
const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl08-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const v6 = () => ev.build === 'v6';
const v8 = () => ev.build === 'v8';
const R = () => ev.range.cases;
const A = () => ev.alpha.cases;
const has = () => ev.colordetect.exists;
const SKIP8 = 'colordetect does not exist in this ffmpeg build';
const outside = (c) => c.raw.ymin < 16 || c.raw.ymax > 235;
const cdRange = (k, m = 'all') => R()[k].colordetect[m].range;

t('build label: the build seen by the test is the one in the version line, and the version and library versions are recorded in the evidence', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.ok(['v6', 'v8', 'other'].includes(ev.build));
  assert.ok(ev.libs.libavfilter, 'libavfilter version recorded');
});

// ---- controls and readers ---------------------------------------------------------------------------------------------------------
t('control: the pixel readers can see the effect. A 0..255 ramp reads outside 16..235 by raw bytes and by signalstats; a 16..235 ramp reads inside; an opaque frame has alpha 255 everywhere; a channel above alpha is seen', () => {
  const f = R().full_tv, l = R().limited_tv;
  assert.deepEqual([f.raw.ymin, f.raw.ymax], [0, 255]); assert.deepEqual([f.signalstats.ymin, f.signalstats.ymax], [0, 255]);
  assert.deepEqual([l.raw.ymin, l.raw.ymax], [16, 235]); assert.deepEqual([l.signalstats.ymin, l.signalstats.ymax], [16, 235]);
  assert.ok(outside(f) && !outside(l));
  assert.equal(A().opaque_red.raw.minA, 255); assert.equal(A().opaque_red.alphaSignalstats.ymin, 255);
  assert.ok(A().straight_half_red.raw.straightEvidence > 0, 'a straight pixel (r 255 above alpha 128) must be seen');
  assert.equal(A().premult_half_red.raw.straightEvidence, 0, 'a premultiplied-consistent frame has no channel above its alpha');
});

t('reader agreement: raw plane bytes and signalstats give the same Y, Cb and Cr min and max for every range clip, frame by frame on luma; raw alpha and alphaextract+signalstats agree for every alpha clip', () => {
  for (const [k, c] of Object.entries(R())) {
    for (const p of ['ymin', 'ymax', 'umin', 'umax', 'vmin', 'vmax']) assert.equal(c.raw[p], c.signalstats[p], `${k} ${p}`);
    assert.deepEqual(c.raw.yPerFrame, c.signalstats.yPerFrame, `${k} per frame`);
    assert.equal(c.raw.frames, 3); assert.equal(c.signalstats.frames, 3);
  }
  for (const [k, c] of Object.entries(A())) {
    assert.equal(c.alphaSignalstats.ymin, c.raw.minA, `${k} min alpha`); assert.equal(c.alphaSignalstats.ymax, c.raw.maxA, `${k} max alpha`);
  }
});

t('determinism: every FFV1 file is byte-identical when encoded twice (bitexact), and the source bytes do not depend on the tag', () => {
  assert.equal(ev.deterministic, true);
  for (const content of [...MAIN_RANGE, ...EXTRA_RANGE]) {
    const shas = new Set(Object.values(R()).filter((c) => c.content === content).map((c) => c.sourceSha));
    assert.equal(shas.size, 1, content);
  }
});

// ---- the tag ----------------------------------------------------------------------------------------------------------------------
t('tag: ffprobe color_range is exactly the tag that was written for tv and pc; an untagged file reads "unknown" on 6.1.1 and "tv" on 8.1.2', () => {
  for (const content of MAIN_RANGE) {
    assert.equal(R()[`${content}_tv`].probeRange, 'tv'); assert.equal(R()[`${content}_pc`].probeRange, 'pc');
    const none = R()[`${content}_none`].probeRange;
    if (v6()) assert.ok(none == null || none === 'unknown', `${content} none on 6.1.1: ${none}`);
    if (v8()) assert.equal(none, 'tv', `${content} none on 8.1.2`);
  }
  for (const k of EXTRA_RANGE) assert.equal(R()[`${k}_tv`].probeRange, 'tv');
});

t('tag versus pixels: the label (setparams plus the output option) never changes a byte, on 6.1.1 and 8.1.2 (same decoded bytes under none, tv and pc), so a file can claim tv while holding 0..255 and claim pc while holding 16..235', () => {
  for (const content of MAIN_RANGE) {
    const base = R()[`${content}_none`].raw;
    for (const tag of TAGS) { const r = R()[`${content}_${tag}`].raw; assert.equal(r.sha, base.sha, `${content} ${tag} decoded bytes`); }
  }
  assert.equal(R().full_tv.probeRange, 'tv'); assert.ok(outside(R().full_tv), 'tagged tv, pixels beyond 16..235');
  assert.equal(R().limited_pc.probeRange, 'pc'); assert.ok(!outside(R().limited_pc), 'tagged pc, pixels inside 16..235');
  assert.deepEqual([R().full_tv.raw.ymin, R().full_tv.raw.ymax], [0, 255]); assert.deepEqual([R().limited_pc.raw.ymin, R().limited_pc.raw.ymax], [16, 235]);
  // the label is pure for all three ramps and both tags, so the tag tests below compare the tag alone
  for (const content of MAIN_RANGE) for (const tag of ['tv', 'pc']) { assert.equal(R()[`${content}_${tag}`].via, 'label'); assert.equal(R()[`${content}_${tag}`].raw.sha, R()[`${content}_none`].raw.sha); }
});

t('consequence of the tag: the same bytes become different RGB depending only on the tag (limited ramp: tv expands to 0..255, pc keeps 16..235; full ramp: tv crushes 256 levels to 220, pc keeps 256); an untagged file is shown as tv', () => {
  const L = {tv: R().limited_tv.rgb, pc: R().limited_pc.rgb, none: R().limited_none.rgb}, F = {tv: R().full_tv.rgb, pc: R().full_pc.rgb, none: R().full_none.rgb};
  assert.ok(L.tv.min < L.pc.min && L.tv.max > L.pc.max, 'tv expands the limited ramp beyond what pc leaves');
  assert.ok(F.pc.distinct > F.tv.distinct, 'tv tag collapses full-range levels');
  assert.deepEqual(L.none, L.tv, 'untagged is read as tv'); assert.deepEqual(F.none, F.tv);
  // tv and untagged: the same numbers on both builds (6.1.1 evidence.json, 8.1.2 evidence-v8.json)
  if (v6() || v8()) {
    assert.deepEqual([L.tv.min, L.tv.max, L.tv.distinct, L.tv.columnsAtZero, L.tv.columnsAt255], [0, 255, 220, 2, 1]);
    assert.deepEqual([F.tv.min, F.tv.max, F.tv.distinct, F.tv.columnsAtZero, F.tv.columnsAt255], [0, 255, 220, 17, 21], 'Y 0..16 all black, Y 235..255 all white');
    assert.deepEqual([R().mid_tv.rgb.min, R().mid_tv.rgb.max, R().mid_tv.rgb.distinct], [55, 203, 128]);
  }
  // pc: the label is pure on both builds, so the bytes are the same and the numbers are measured here (6.1.1) and confirmed by the PC rerun (8.1.2)
  if (v6()) { assert.deepEqual([L.pc.min, L.pc.max, L.pc.distinct], [16, 235, 220]); assert.equal(F.pc.distinct, 256); assert.deepEqual([R().mid_pc.rgb.min, R().mid_pc.rgb.max], [64, 191]); }
  if (v8()) { assert.equal(F.pc.distinct, 256); assert.deepEqual([L.pc.min, L.pc.max], [16, 235]); }
});

// ---- build difference: the OUTPUT OPTION -color_range ---------------------------------------------------------------------------------
t('build difference: the output option -color_range pc only relabels on 6.1.1 (decoded bytes unchanged) and converts the pixels on 8.1.2 (ff26); tv leaves the bytes alone on both', () => {
  for (const c of MAIN_RANGE) {
    assert.equal(R()[`${c}_tv_opt`].probeRange, 'tv'); assert.equal(R()[`${c}_pc_opt`].probeRange, 'pc');
    assert.equal(R()[`${c}_tv_opt`].raw.sha, R()[`${c}_none`].raw.sha, `${c} -color_range tv keeps the bytes`);
  }
  if (v6()) for (const c of MAIN_RANGE) assert.equal(R()[`${c}_pc_opt`].raw.sha, R()[`${c}_none`].raw.sha, `${c} 6.1.1 relabel only`);
  if (v8()) {
    for (const c of MAIN_RANGE) assert.notEqual(R()[`${c}_pc_opt`].raw.sha, R()[`${c}_none`].raw.sha, `${c} 8.1.2 converts`);
    assert.deepEqual([R().limited_pc_opt.raw.ymin, R().limited_pc_opt.raw.ymax], [0, 255], 'limited 16..235 becomes 0..255');
    assert.deepEqual([R().mid_pc_opt.raw.ymin, R().mid_pc_opt.raw.ymax], [56, 204], 'mid 64..191 becomes 56..204');
    assert.deepEqual([R().full_pc_opt.raw.ymin, R().full_pc_opt.raw.ymax], [0, 255], 'full ramp clips, min and max look the same');
  }
});

// ---- build difference: setparams=range=pc ALONE ---------------------------------------------------------------------------------------
t('build difference: -vf setparams=range=pc alone is a pure label on 6.1.1 and on 8.1.2 it is not (FFV1 converts the pc frames to limited and the file reads tv); the tv label is pure on both', () => {
  for (const c of MAIN_RANGE) {
    assert.equal(R()[`${c}_tv_vf`].probeRange, 'tv'); assert.equal(R()[`${c}_tv_vf`].raw.sha, R()[`${c}_none`].raw.sha, `${c} setparams tv keeps the bytes`);
  }
  if (v6()) for (const c of MAIN_RANGE) { assert.equal(R()[`${c}_pc_vf`].probeRange, 'pc'); assert.equal(R()[`${c}_pc_vf`].raw.sha, R()[`${c}_none`].raw.sha, `${c} 6.1.1 relabel only`); }
  if (v8()) {
    for (const c of MAIN_RANGE) { assert.equal(R()[`${c}_pc_vf`].probeRange, 'tv', `${c} reads tv`); assert.notEqual(R()[`${c}_pc_vf`].raw.sha, R()[`${c}_none`].raw.sha, `${c} 8.1.2 converts`); }
    assert.deepEqual([R().full_pc_vf.raw.ymin, R().full_pc_vf.raw.ymax], [16, 235], 'the 0..255 ramp becomes 16..235');
    assert.deepEqual([R().limited_pc_vf.raw.ymin, R().limited_pc_vf.raw.ymax], [30, 218], 'the 16..235 ramp becomes 30..218');
    assert.deepEqual([R().mid_pc_vf.raw.ymin, R().mid_pc_vf.raw.ymax], [71, 180], 'the 64..191 ramp becomes 71..180');
  }
});

// ---- what a pixel reader can prove (the 6.1.1 equivalent of colordetect) --------------------------------------------------------------
t('recipe without colordetect: signalstats YMIN/YMAX prove "full" the moment one sample leaves 16..235 (one pixel of one frame is enough) and can never prove "limited"', () => {
  const verdict = (k) => R()[k].recipe.verdict;
  for (const tag of TAGS) { assert.equal(verdict(`full_${tag}`), 'full'); assert.equal(verdict(`limited_${tag}`), 'undetermined'); assert.equal(verdict(`mid_${tag}`), 'undetermined'); }
  assert.equal(verdict('hi1_tv'), 'full', 'a single 236 in the last frame'); assert.equal(R().hi1_tv.signalstats.ymax, 236);
  assert.equal(verdict('lo1_tv'), 'full', 'a single 15 in the first frame'); assert.equal(R().lo1_tv.signalstats.ymin, 15);
  assert.equal(verdict('edge_tv'), 'undetermined', 'exactly 16 and 235 is still inside limited range');
  assert.equal(R().cbfull_tv.recipe.lumaOnlyVerdict, 'undetermined'); assert.equal(R().cbfull_tv.recipe.provesFullByChroma, true);
  assert.ok(Object.values(R()).every((c) => c.recipe.verdict !== 'limited'), 'no pixel reading ever yields "limited"');
  assert.equal(R().hi1_tv.signalstats.yPerFrame.filter(([, mx]) => mx > 235).length, 1, 'the outlier is in exactly one frame');
});

// ---- alpha: pixels are the only evidence ---------------------------------------------------------------------------------------------
t('alpha without colordetect: pixels prove "opaque" (alpha 255 everywhere) and "straight" (some channel above its alpha) but a premultiplied-consistent frame only stays "undetermined"', () => {
  const want = {opaque_red: 'opaque', straight_half_red: 'straight', premult_half_red: 'undetermined', dark_half: 'undetermined', boundary_127: 'straight', transparent: 'undetermined',
    ramp_straight: 'straight', ramp_premult: 'undetermined', one_bad_pixel: 'straight', lavfi_red_half: 'straight', lavfi_red: 'opaque', lavfi_800000_half: 'straight'};
  for (const [k, w] of Object.entries(want)) assert.equal(A()[k].raw.verdict, w, k);
  assert.equal(A().one_bad_pixel.raw.straightEvidence, 1, 'one pixel of one frame');
  assert.equal(A().one_bad_pixel.raw.firstEvidenceFrame, 2);
  assert.deepEqual(Object.keys(A()).sort(), [...Object.keys(ALPHA_CONTENT), ...Object.keys(ALPHA_LAVFI)].sort());
});

t('alpha lavfi probe replication: color=c=red@0.5 is (255,0,0,127), color=c=red is opaque, color=c=0x800000@0.5 is (128,0,0,127), one above its alpha', () => {
  assert.deepEqual(A().lavfi_red_half.first, [255, 0, 0, 127]); assert.deepEqual(A().lavfi_red.first, [255, 0, 0, 255]); assert.deepEqual(A().lavfi_800000_half.first, [128, 0, 0, 127]);
  assert.ok(A().lavfi_800000_half.raw.maxOver >= 1);
});

t('alpha tag: a file with straight alpha and a file with premultiplied-consistent alpha have identical stream metadata, so ffprobe cannot tell them apart', () => {
  const T = ev.alpha.fileTags;
  assert.equal(T.identicalStreamMetadata, true);
  assert.deepEqual(T.pix_fmt, ['bgra', 'bgra']);
  assert.deepEqual(T.alphaKeys, [[], []], 'no alpha mode field on either build');
});

t('alpha overlay (recorded, not a film claim): (128,0,0,128) over gray 128 composites with overlay alpha=straight to red 128 on both builds; alpha=premultiplied gives 192 on 6.1.1 and the same 128 on 8.1.2 (not explained, not used in the film)', (tt) => {
  const O = ev.alpha.overlay;
  assert.deepEqual(O.straight, [128, 64, 64]);
  if (v6()) { assert.deepEqual(O.premultiplied, [192, 64, 64]); assert.equal(O.redDifference, 64); }
  if (v8()) { assert.deepEqual(O.premultiplied, [128, 64, 64]); assert.equal(O.redDifference, 0); }
  tt.diagnostic(`overlay straight ${O.straight}, premultiplied ${O.premultiplied}, red difference ${O.redDifference}`);
});

// ---- colordetect --------------------------------------------------------------------------------------------------------------------
t('availability: on 6.1.1 colordetect is missing (non-zero exit, "No such filter"); where it exists it has the mode option with color_range and alpha_mode', () => {
  if (!has()) {
    assert.notEqual(ev.colordetect.probe.status, 0); assert.equal(ev.colordetect.probe.noSuchFilter, true);
    if (v6()) { assert.equal(ev.colordetect.probe.status, 8); assert.match(ev.libs.libavfilter, /^\s*9\./); }
  } else {
    assert.equal(ev.colordetect.probe.status, 0); assert.equal(ev.colordetect.hasModeOption, true);
    assert.notEqual(ev.build, 'v6');
  }
});

t('colordetect prints one "Detected color properties" block at the end of the run; a yuv clip with no alpha plane reports "Alpha mode: none"; mode=color_range prints only the range line and mode=alpha_mode only the alpha line', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  for (const k of ['full_tv', 'limited_tv', 'mid_tv', 'hi1_tv']) {
    const d = R()[k].colordetect.all; assert.equal(d.blocks, 1, k); assert.ok(d.rangeText, `${k} range line`); assert.equal(d.status, 0);
    assert.equal(d.alphaText, 'none', `${k} no alpha plane`);
    assert.equal(R()[k].colordetect.color_range.alphaText, null, `${k} mode=color_range prints no alpha line`);
    assert.equal(R()[k].colordetect.alpha_mode.rangeText, null, `${k} mode=alpha_mode prints no range line`);
    assert.deepEqual(R()[k].colordetect.default.block, d.block, `${k} default mode equals mode=all`);
  }
  for (const k of ['straight_half_red', 'opaque_red']) { const d = A()[k].colordetect.rgba; assert.equal(d.blocks, 1, k); assert.ok(d.alphaText, `${k} alpha line`); assert.equal(d.status, 0); }
});

t('colordetect range, probe values: a 0..255 ramp is "JPEG / full range" tagged none, tv or via the option pc; a 16..235 ramp tagged tv or none and a 64..191 ramp are "undetermined" (it cannot prove limited)', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  for (const tag of ['none', 'tv']) {
    assert.equal(cdRange(`full_${tag}`), 'full'); assert.match(R()[`full_${tag}`].colordetect.all.rangeText, /full range/i);
    assert.equal(cdRange(`limited_${tag}`), 'undetermined'); assert.match(R()[`limited_${tag}`].colordetect.all.rangeText, /undetermined/i);
    assert.equal(cdRange(`mid_${tag}`), 'undetermined');
  }
  assert.equal(cdRange('full_tv_opt'), 'full'); assert.equal(cdRange('limited_tv_opt'), 'undetermined'); assert.equal(cdRange('mid_tv_opt'), 'undetermined');
});

t('colordetect range, it reads the pixels and does not echo the tag: after -color_range pc on 8.1.2 the 16..235 ramp has really become 0..255 and reads full, but the 64..191 ramp (now 56..204) stays undetermined although the tag says pc', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  if (v8()) {
    assert.equal(R().limited_pc_opt.probeRange, 'pc'); assert.equal(R().limited_pc_opt.raw.ymax, 255); assert.equal(cdRange('limited_pc_opt'), 'full');
    assert.equal(R().mid_pc_opt.probeRange, 'pc'); assert.deepEqual([R().mid_pc_opt.raw.ymin, R().mid_pc_opt.raw.ymax], [56, 204]); assert.equal(cdRange('mid_pc_opt'), 'undetermined');
    assert.equal(cdRange('full_pc_opt'), 'full');
  }
  // the pure label (bytes unchanged, tag pc): the true echo question. The tag says pc on every clip; the verdict follows the bytes alone
  for (const c of MAIN_RANGE) { assert.equal(R()[`${c}_pc`].probeRange, 'pc'); assert.equal(R()[`${c}_pc`].raw.sha, R()[`${c}_none`].raw.sha); }
  assert.equal(cdRange('full_pc'), 'full'); assert.equal(cdRange('limited_pc'), 'undetermined', 'tagged pc, bytes 16..235: not full'); assert.equal(cdRange('mid_pc'), 'undetermined');
  assert.match(R().limited_pc.colordetect.all.rangeText, /undetermined/i);
});

t('colordetect range, never limited: across every range clip, tag and mode the verdict is never "limited"', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  for (const [k, c] of Object.entries(R())) for (const [m, d] of Object.entries(c.colordetect)) assert.notEqual(d.range, 'limited', `${k} ${m}`);
});

t('colordetect agrees with the signalstats LUMA recipe on every clip whose tag gives it no help (none or tv), including one outlier pixel (236 or 15) and exactly 16/235; it does not look at chroma (Cb 0..254 with luma 16..235 stays undetermined while the recipe with chroma says full)', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  const bad = [];
  const keys = [...MAIN_RANGE.flatMap((c) => ['none', 'tv'].map((tag) => `${c}_${tag}`)), ...EXTRA_RANGE.map((c) => `${c}_tv`)];
  for (const k of keys) if (R()[k].colordetect.all.range !== R()[k].recipe.lumaOnlyVerdict) bad.push(`${k}: colordetect ${R()[k].colordetect.all.range} vs recipe ${R()[k].recipe.lumaOnlyVerdict}`);
  assert.deepEqual(bad, []);
  assert.equal(cdRange('hi1_tv'), 'full'); assert.equal(cdRange('lo1_tv'), 'full'); assert.equal(cdRange('edge_tv'), 'undetermined');
  assert.equal(cdRange('cbfull_tv'), 'undetermined'); assert.equal(R().cbfull_tv.recipe.verdict, 'full');
  for (const c of MAIN_RANGE) assert.equal(cdRange(`${c}_pc`), R()[`${c}_pc`].recipe.lumaOnlyVerdict, `${c} tagged pc (pure label)`);
});

t('colordetect alpha, probe values: rgba 50 percent red is straight, opaque red is opaque, and the lavfi sources red@0.5, red, 0x800000@0.5 are straight, opaque, straight; premultiplied-looking, dark, all-zero and premultiplied-ramp frames are undetermined; one bad pixel in one frame flips it to straight', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  const got = (k) => A()[k].colordetect.rgba.alpha;
  assert.equal(got('straight_half_red'), 'straight'); assert.equal(got('opaque_red'), 'opaque');
  assert.equal(got('lavfi_red_half'), 'straight'); assert.equal(got('lavfi_red'), 'opaque'); assert.equal(got('lavfi_800000_half'), 'straight');
  assert.equal(got('boundary_127'), 'straight'); assert.equal(got('ramp_straight'), 'straight');
  for (const k of ['premult_half_red', 'dark_half', 'transparent', 'ramp_premult']) assert.equal(got(k), 'undetermined', k);
  assert.equal(got('one_bad_pixel'), 'straight');
});

t('colordetect alpha, readers agree: colordetect on rgba says exactly what the raw pixel reader proves (opaque, straight or undetermined) for every alpha clip, and mode=alpha_mode alone gives the same answer as mode=all', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  const bad = [];
  for (const [k, c] of Object.entries(A())) {
    if (c.colordetect.rgba.alpha !== c.raw.verdict) bad.push(`${k}: pixels ${c.raw.verdict}, colordetect ${c.colordetect.rgba.alpha}`);
    if (c.colordetect.alphaOnly.alpha !== c.colordetect.rgba.alpha) bad.push(`${k}: alpha_mode alone ${c.colordetect.alphaOnly.alpha}`);
  }
  assert.deepEqual(bad, []);
  assert.equal(ev.alpha.fileTags.colordetect.straight.alpha, 'straight'); assert.equal(ev.alpha.fileTags.colordetect.premult.alpha, 'undetermined');
});

t('colordetect alpha, the pixel format changes the verdict: the same straight picture is "straight" as rgba and "undetermined" as yuva420p (it compares the Y plane with alpha), while the white ramp stays straight in both and opaque stays opaque', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  const y = (k) => A()[k].colordetect.yuva420p.alpha;
  assert.equal(A().straight_half_red.colordetect.rgba.alpha, 'straight'); assert.equal(y('straight_half_red'), 'undetermined');
  assert.equal(y('ramp_straight'), 'straight'); assert.equal(y('opaque_red'), 'opaque');
  assert.equal(y('one_bad_pixel'), 'undetermined');
});

t('colordetect leaves no machine-readable trace: no lavfi metadata keys, no side data, and the tag on the filtered output is still the input tag (a full-range ramp tagged tv is still tagged tv)', (tt) => {
  if (!has()) return tt.skip(SKIP8);
  const P = ev.colordetect.props;
  assert.deepEqual(P.fullTv.metadataLines, []); assert.equal(P.fullTv.metadataHasColordetectKey, false);
  assert.equal(P.written.ok, true); assert.equal(P.written.streamColorRange, 'tv'); assert.equal(P.written.frameSideData, null);
  assert.deepEqual(P.written.streamAlphaKeys, []);
});

// ---- the script and the distribution kit -----------------------------------------------------------------------------------------
// Numbers spoken or captioned must exist in the evidence of one of the two builds (this run, evidence.json, evidence-v8.json).
import {readJson, knownNumbers, checkScript, checkKit} from './numbers08.mjs';
const HERE = import.meta.dirname;
const script = readJson('script.json');

t('script: every number spoken in the narration, and every number in a caption, is a number in the evidence (this run, evidence.json or evidence-v8.json)', () => {
  assert.deepEqual(checkScript(script, knownNumbers(ev)), []);
});

test('script: long film, 14 to 18 scenes, 850 to 1050 words, estimated 330 to 440 s, riso palette, no em dash, flags lowercase, titles within their limits', () => {
  const words = script.scenes.map((s) => s.narration.trim().split(/\s+/).length).reduce((a, b) => a + b, 0);
  assert.equal(script.kind, 'long'); assert.equal(script.palette, 'riso'); assert.equal(script.kicker, 'Deep dive 08'); assert.equal(script.series, 'FFmpeg Reality Checks');
  assert.ok(script.scenes.length >= 14 && script.scenes.length <= 18, `${script.scenes.length} scenes`);
  assert.ok(words >= 850 && words <= 1050, `${words} words`);
  const est = words / 2.79 + 5 + 10; assert.ok(est >= 330 && est <= 440, `estimate ${est.toFixed(0)} s`);
  assert.ok(script.fullTitle.length <= 74 && script.thumb.label.length <= 28 && script.thumb.number && script.thumb.color);
  for (const s of script.scenes) assert.ok(s.chapter && s.captions.length >= 1 && s.narration.trim(), s.id);
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all), 'no em or en dash'); assert.ok(!/ -[A-Z]/.test(all.replace(/-[A-Z][a-z]+ /g, '')), 'flags are lowercase');
  assert.ok(/dash v f/.test(all) && /equals/.test(all), 'flags and equals signs are spelled out for the voice');
});

t('script: the film says which build each build-dependent claim is from (colordetect on 8.1.2, the missing filter on 6.1.1, the pc option on both)', () => {
  const by = Object.fromEntries(script.scenes.map((s) => [s.id, s.narration.toLowerCase()]));
  assert.match(by.missing, /six point one point one/); assert.match(by.full, /eight point one point two/); assert.match(by.option, /six point one point one[\s\S]*eight point one point two/);
  assert.match(by.recipe, /six point one point one/); assert.match(by.notecho, /eight point one point two/); assert.match(by.close, /six point one point one and eight point one point two/);
  assert.match(by.tag, /six point one point one/); assert.match(by.consequence, /six point one point one/);
});

test('distribution kits (fl08 and fs08): numbers come from the evidence; titles at most 60 characters (4 of them), pinned comment at most 300, 15 tags, no em dash; the short ends with #Shorts', () => {
  const known = knownNumbers();
  for (const id of ['fl08', 'fs08']) {
    const md = fs.readFileSync(path.join(HERE, '..', '..', id, 'content', 'distribution.md'), 'utf8');
    assert.deepEqual(checkKit(md, known), [], `${id}: numbers not in the evidence`);
    const titles = [...md.matchAll(/^\d\. `(.*?)` :/gm)].map((m) => m[1]);
    assert.equal(titles.length, 4, id); for (const x of titles) assert.ok(x.length <= 60, x);
    assert.ok(md.split('### Pinned comment (≤ 300 chars)\n\n')[1].trim().length <= 300, id);
    assert.equal(md.split('### Tags (15)\n\n')[1].split('\n')[0].split(', ').length, 15, id);
    assert.ok(!/[\u2014\u2013]/.test(md), 'no em or en dash');
    if (id === 'fs08') assert.ok(md.split('### Description\n\n')[1].split('\n### Tags')[0].trim().endsWith('#Shorts'), 'the fs08 description ends with #Shorts');
  }
});

// ---- the film's numbers: the E block in video/Scenes.tsx is generated from the evidence and must not drift --------------------------
import {sceneFacts, factsBlock, blockRe} from '../fixture/facts.mjs';
const e6 = () => readJson('evidence.json'), e8 = () => readJson('evidence-v8.json');
test('video/Scenes.tsx (fl08 and fs08): the generated E block equals the block built from evidence.json and evidence-v8.json (no hand-edited or stale on-screen numbers)', () => {
  const want = factsBlock(sceneFacts(e6(), e8()));
  for (const id of ['fl08', 'fs08']) {
    const src = fs.readFileSync(path.join(HERE, '..', '..', id, 'video', 'Scenes.tsx'), 'utf8');
    assert.ok(blockRe.test(src), `${id}: no E:start / E:end block`);
    assert.equal(src.match(blockRe)[0], want, `${id}: run node episodes/fl08/fixture/gen-facts.mjs`);
  }
});
t('video/Scenes.tsx: on ffmpeg 6.1.1 a fresh run of the fixture gives the same on-screen facts as the committed evidence.json (the film and the evidence cannot disagree)', () => {
  if (!v6()) return; // the committed evidence.json is the 6.1.1 measurement
  assert.deepEqual(sceneFacts(ev, e8()), sceneFacts(e6(), e8()));
});
