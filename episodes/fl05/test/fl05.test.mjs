import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, expectedFrameBytes, FIX} from '../fixture/experiment.mjs';
import {longFacts, IDIOMS} from '../fixture/facts.mjs';
import {sceneData} from '../fixture/scene-data.mjs';
import {scriptTests, loadScript} from './support.mjs';

const hasX265 = () => (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '').includes('libx265');
const ok = have('ffmpeg') && have('ffprobe') && hasX265();
let ev;
before(async () => { if (ok) ev = await runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl05-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe or libx265 not available'}, fn);
// Relations hold on every build. Exact numbers are asserted on 6.1.1 only (this is where they were measured).
const V6 = () => ev.build === 'v6';
const S = () => ev.sources, C = () => ev.composite.cases;
const wrote = (c) => c.wrote === true;

// ---------------------------------------------------------------- ff02: pixel format
t('ff02: RGB input with no -pix_fmt gives yuv444p and a 4:4:4 profile; -pix_fmt yuv420p gives High 4:2:0; a yuv420p source stays 4:2:0 (control)', () => {
  const v = S().ff02.variants;
  assert.equal(S().ff02.source.pngPixFmt, 'rgb24');
  assert.equal(v.default_rgb_input.pixFmt, 'yuv444p'); assert.match(v.default_rgb_input.profile, /4:4:4/);
  assert.equal(v.forced_yuv444p.pixFmt, 'yuv444p');
  assert.equal(v.pix_fmt_yuv420p.pixFmt, 'yuv420p'); assert.doesNotMatch(v.pix_fmt_yuv420p.profile, /4:4:4/);
  assert.equal(v.control_yuv420p_input.pixFmt, 'yuv420p');
});
t('ff02: 4:2:0 costs quality against the original frames (relation on every build; 37.04 and 35.4 dB on 6.1.1)', () => {
  const a = S().ff02.variants.default_rgb_input.psnrVsOriginal, b = S().ff02.variants.pix_fmt_yuv420p.psnrVsOriginal;
  assert.ok(a > b && b > 25);
  if (V6()) { assert.equal(a, 37.04); assert.equal(b, 35.4); }
});

// ---------------------------------------------------------------- ff09: odd sizes
t('ff09: the control scales 1920x1080 to 1280x720 and encodes; scale=-1:333 on 1000x562 gives 593x333 and libx264 refuses it, nothing written', () => {
  const c = S().ff09.cases;
  assert.equal(c.clean_16x9.scaleTo, '1280x720'); assert.equal(c.clean_16x9.exit, 0);
  assert.equal(c.odd_both.scaleTo, '593x333'); assert.notEqual(c.odd_both.exit, 0);
  assert.equal(c.odd_both.disk.video, null); assert.match(c.odd_both.encoderLine, /\(593x333\)/);
});
t('ff09: either dimension is enough (width 427 then height 333), and -2 with an even height works: 594x334, 10 frames', () => {
  const c = S().ff09.cases;
  assert.equal(c.odd_width.scaleTo, '427x240'); assert.notEqual(c.odd_width.exit, 0); assert.match(c.odd_width.encoderLine, /width not divisible by 2/);
  assert.equal(c.odd_height.scaleTo, '592x333'); assert.notEqual(c.odd_height.exit, 0); assert.match(c.odd_height.encoderLine, /height not divisible by 2/);
  assert.equal(c.fixed.scaleTo, '594x334'); assert.equal(c.fixed.exit, 0); assert.deepEqual(c.fixed.disk.video, {size: '594x334', frames: 10});
});
t('ff09: the cause is 4:2:0 chroma: the same 593x333 frame encodes with yuv444p', () => {
  const c = S().ff09.cases.odd_444;
  assert.equal(c.scaleTo, '593x333'); assert.equal(c.exit, 0); assert.deepEqual(c.disk.video, {size: '593x333', frames: 10});
});

// ---------------------------------------------------------------- ff03: index position
t('ff03: two readers agree on the box order; plain puts moov after mdat, faststart before; same 250 frames; moov size equal', () => {
  const f = S().ff03.files;
  for (const x of Object.values(f)) { assert.deepEqual(x.order, x.traceOrder); assert.equal(x.frames, 250); }
  assert.equal(f.plain.order.at(-1), 'moov'); assert.ok(f.faststart.order.indexOf('moov') < f.faststart.order.indexOf('mdat'));
  assert.equal(f.plain.moovSize, f.faststart.moovSize);
  if (V6()) { assert.deepEqual(f.plain.order, ['ftyp', 'free', 'mdat', 'moov']); assert.deepEqual(f.faststart.order, ['ftyp', 'moov', 'free', 'mdat']); assert.equal(f.plain.moovOffset, 917559); assert.equal(f.plain.bytes, 927238); }
});
t('ff03: a client that cannot seek takes the whole plain file and under a quarter of the faststart file; a client with range requests needs 3 requests for the plain file and 1 for faststart', () => {
  const h = S().ff03.http;
  assert.equal(h.plain.noSeek.bytesServed, h.plain.noSeek.fileBytes);
  assert.ok(h.faststart.noSeek.bytesServed < h.faststart.noSeek.fileBytes * 0.25);
  assert.ok(h.plain.rangeSeek.requests >= 2); assert.equal(h.faststart.rangeSeek.requests, 1);
  if (V6()) assert.equal(h.plain.rangeSeek.requests, 3);
});

// ---------------------------------------------------------------- ff31: hev1 and hvc1
t('ff31: libx265 to MP4 writes hev1 on both tag readers; -c copy -tag:v hvc1 gives hvc1 on both; both directions are seen (control)', () => {
  const f = S().ff31.files;
  assert.equal(f.def.probe.tagString, 'hev1'); assert.equal(f.def.box.fourcc, 'hev1');
  assert.equal(f.remux.probe.tagString, 'hvc1'); assert.equal(f.remux.box.fourcc, 'hvc1');
  assert.equal(f.back.probe.tagString, 'hev1'); assert.equal(f.back.box.fourcc, 'hev1');
});
t('ff31: the retag changes 0 of 50 frames (packets, samples and frames hash the same) and every differing byte is inside the sample entry; 2 bytes on 6.1.1', () => {
  const f = S().ff31.files, d = S().ff31.diffs;
  assert.equal(f.def.decoded.frames, 50);
  assert.equal(f.remux.packetMd5, f.def.packetMd5); assert.equal(f.remux.box.sampleSha, f.def.box.sampleSha); assert.equal(f.remux.decoded.sha, f.def.decoded.sha);
  assert.ok(d['def:remux'].insideSampleEntry && d['def:remux'].count > 0);
  if (V6()) assert.equal(d['def:remux'].count, 2);
});
t('ff31: the tag is a label (a stream with in-band parameter sets keeps them under hvc1) and Matroska has no such tag', () => {
  const f = S().ff31.files;
  assert.ok(f.rep.box.samplesWithParamSets >= 1); assert.equal(f.repvc.box.fourcc, 'hvc1'); assert.equal(f.repvc.box.samplesWithParamSets, f.rep.box.samplesWithParamSets); assert.equal(f.repvc.box.sampleSha, f.rep.box.sampleSha);
  assert.ok(!['hev1', 'hvc1'].includes(f.mkv.probe.tagString)); assert.ok(f.mkv.mkv.codecId);
});

// ---------------------------------------------------------------- composite: the naive command on a fresh fixture
t('fixture: the composite source is 25 RGB PNG frames at 1000x562', () => {
  assert.equal(ev.composite.fixture.pngPixFmt, 'rgb24'); assert.equal(ev.composite.fixture.pngSize, '1000x562'); assert.equal(ev.composite.fixture.frames, FIX.frames);
});
t('naive H.264 (RGB frames, scale=-1:333, no other flag): exit 0, High 4:4:4 Predictive, yuv444p, 593x333, moov last. Three readers say the same', () => {
  const c = C().naive264;
  assert.equal(c.exit, 0); assert.ok(wrote(c));
  assert.equal(c.probe.profile, 'High 4:4:4 Predictive'); assert.equal(c.probe.pixFmt, 'yuv444p'); assert.equal(c.probe.width, 593); assert.equal(c.probe.height, 333);
  assert.equal(c.entry.profileIdc, 244); assert.equal(c.entry.chromaFormatIdc, 3); assert.equal(c.entry.width, 593); assert.equal(c.entry.height, 333);
  assert.equal(c.decoded.bytesPerFrame, 3 * 593 * 333);
  assert.equal(c.order.at(-1), 'moov'); assert.deepEqual(c.order, c.traceOrder);
});
t('why the first command did not crash: the odd frame passes only because the format is 4:4:4. Adding -pix_fmt yuv420p to the naive command is refused: non-zero exit, nothing written, the message names 593x333', () => {
  const c = C().strict264;
  assert.notEqual(c.exit, 0); assert.equal(c.wrote, false); assert.match(c.refusal, /width not divisible by 2 \(593x333\)/);
  assert.equal(C().naive264.probe.width, 593);
});
t('recipe H.264 (scale=-2:334, -pix_fmt yuv420p, -movflags +faststart): exit 0, High, yuv420p, 594x334, moov before mdat, 25 frames. Three readers say the same', () => {
  const c = C().recipe264;
  assert.equal(c.exit, 0); assert.ok(wrote(c));
  assert.equal(c.probe.profile, 'High'); assert.equal(c.probe.pixFmt, 'yuv420p'); assert.equal(c.probe.width, 594); assert.equal(c.probe.height, 334); assert.equal(c.probe.frames, 25);
  assert.equal(c.entry.profileIdc, 100); assert.equal(c.entry.chromaFormatIdc, 1); assert.equal(c.entry.width, 594); assert.equal(c.entry.height, 334);
  assert.equal(c.decoded.bytesPerFrame, 594 * 334 + 2 * 297 * 167); assert.equal(c.decoded.frames, 25);
  assert.deepEqual(c.order, ['ftyp', 'moov', 'free', 'mdat']); assert.deepEqual(c.order, c.traceOrder);
});
t('each flag fixes only its own problem: faststart alone leaves 4:4:4 and the odd size; the format and size flags without faststart leave moov last', () => {
  const a = C().fastonly264, b = C().nofast264;
  assert.equal(a.probe.pixFmt, 'yuv444p'); assert.equal(a.probe.width, 593); assert.equal(a.order.indexOf('moov'), 1);
  assert.equal(b.probe.pixFmt, 'yuv420p'); assert.equal(b.probe.width, 594); assert.equal(b.order.at(-1), 'moov');
});
t('naive HEVC (same frames, libx265, no other flag): exit 0, profile Rext, gbrp, hev1 in both readers, 593x333, moov last', () => {
  const c = C().naive265;
  assert.equal(c.exit, 0); assert.ok(wrote(c));
  assert.equal(c.probe.profile, 'Rext'); assert.equal(c.probe.pixFmt, 'gbrp'); assert.equal(c.probe.tag, 'hev1'); assert.equal(c.entry.fourcc, 'hev1');
  assert.equal(c.entry.profileIdc, 4); assert.equal(c.entry.chromaFormatIdc, 3); assert.equal(c.entry.width, 593); assert.equal(c.entry.height, 333);
  assert.equal(c.order.at(-1), 'moov');
});
t('libx265 also refuses the odd 4:2:0 frame (593x333 with -pix_fmt yuv420p): non-zero exit and nothing written on every build; the message names the chroma subsampling (x265 3.5 text, checked on 6.1.1)', () => {
  const c = C().strict265;
  assert.notEqual(c.exit, 0); assert.equal(c.wrote, false);
  if (V6()) assert.match(c.refusal, /multiple of the specified chroma subsampling/);
});
t('recipe HEVC (adds -tag:v hvc1): exit 0, Main, yuv420p, 594x334, hvc1 in both readers, moov before mdat', () => {
  const c = C().recipe265;
  assert.equal(c.exit, 0); assert.ok(wrote(c));
  assert.equal(c.probe.profile, 'Main'); assert.equal(c.probe.pixFmt, 'yuv420p'); assert.equal(c.probe.tag, 'hvc1'); assert.equal(c.entry.fourcc, 'hvc1');
  assert.equal(c.entry.profileIdc, 1); assert.equal(c.entry.chromaFormatIdc, 1); assert.equal(c.entry.width, 594); assert.equal(c.entry.height, 334);
  assert.deepEqual(c.order, ['ftyp', 'moov', 'free', 'mdat']); assert.equal(c.decoded.frames, 25);
});

// ---------------------------------------------------------------- readers: agreement and known-positive controls
const written = () => Object.entries(C()).filter(([, c]) => c.wrote);
t('reader agreement on every written file: ffprobe pix_fmt and size match the decoded bytes per frame; ffprobe size matches the sample entry; box order matches the ffprobe trace; the tag matches the FourCC', () => {
  assert.ok(written().length >= 6);
  for (const [k, c] of written()) {
    assert.equal(c.decoded.bytesPerFrame, expectedFrameBytes(c.probe.pixFmt, c.probe.width, c.probe.height), k);
    assert.equal(c.decoded.allSameSize, true, k);
    assert.equal(c.entry.width, c.probe.width, k); assert.equal(c.entry.height, c.probe.height, k);
    assert.deepEqual(c.order, c.traceOrder, k);
    assert.equal(c.entry.fourcc, c.probe.tag, k);
    assert.equal(c.decoded.frames, 25, k); assert.equal(c.probe.frames, 25, k);
  }
});
t('known-positive controls: each reader sees both answers (yuv444p and yuv420p; chroma_format_idc 3 and 1; moov first and last; hev1 and hvc1; two frame sizes)', () => {
  const cs = written().map(([, c]) => c);
  const seen = (f) => new Set(cs.map(f));
  assert.ok(seen((c) => c.probe.pixFmt).has('yuv444p') && seen((c) => c.probe.pixFmt).has('yuv420p'));
  assert.ok(seen((c) => c.entry.chromaFormatIdc).has(3) && seen((c) => c.entry.chromaFormatIdc).has(1));
  assert.ok(seen((c) => c.order.indexOf('moov') === 1).has(true) && seen((c) => c.order.indexOf('moov') === 1).has(false));
  assert.ok(seen((c) => c.probe.tag).has('hev1') && seen((c) => c.probe.tag).has('hvc1'));
  assert.ok(seen((c) => c.decoded.bytesPerFrame).size >= 2);
});

// ---------------------------------------------------------------- the script
const script = loadScript(new URL('../script.json', import.meta.url));
scriptTests(t, {script, facts: longFacts, idioms: IDIOMS, getEv: () => ev, limits: {words: [850, 1050], scenes: [14, 18], seconds: [340, 410]}});
t('script: palette, series, kicker, thumb and end card are set as the series expects', () => {
  assert.equal(script.series, 'FFmpeg Reality Checks'); assert.equal(script.kicker, 'Deep dive 05'); assert.ok(['red', 'cyan', 'amber', 'green'].includes(script.thumb.color)); assert.ok(script.thumb.label.length <= 28);
  assert.ok(script.endCard); assert.ok(script.palette);
});

// ---------------------------------------------------------------- scenes: every number on screen comes from the evidence
for (const rel of ['../video/Scenes.tsx', '../../fs05/video/Scenes.tsx']) {
  t(`scenes: the DATA block of ${rel.replace('../', '')} equals the live evidence (exact on ffmpeg 6.1.1; the structure on any build)`, () => {
    const src = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
    const m = src.match(/const DATA = ([\s\S]*?) as const;\n\/\/ DATA-END/);
    assert.ok(m, 'DATA block found');
    const shown = JSON.parse(m[1]);
    const live = JSON.parse(JSON.stringify(sceneData(ev)));
    assert.deepEqual(Object.keys(shown), Object.keys(live));
    if (V6()) assert.deepEqual(shown, live);
  });
}
