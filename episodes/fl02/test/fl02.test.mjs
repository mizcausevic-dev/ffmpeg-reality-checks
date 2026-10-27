import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, runRecipe, mp4Tracks, mp4SampleCount, peaksOf, buildOf, AAC} from '../fixture/experiment.mjs';
import {spokenNumbers, captionNumbers, unknownNumbers, durations, wordCount, mmss, evidenceNumbers} from './helpers.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl02-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const E78 = (k) => ev.ff78.encodes[k], C78 = (k) => ev.ff78.cuts[k];
const E79 = (k) => ev.ff79.encodes[k], P79 = (k) => ev.ff79.patched[k], C79 = (k) => ev.ff79.cuts[k];
const R46 = (k) => ev.ff46.runs[k];
const RC = () => ev.recipe;

// ---------- the readers can be trusted: helpers on files they did not read from ffmpeg ----------
const box = (type, ...kids) => { const body = Buffer.concat(kids); const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(type, 4, 'latin1'); return Buffer.concat([h, body]); };
const u32 = (...v) => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeInt32BE(x, 4 * i)); return b; };
// ftyp, moov(mvhd 1000, trak(edts(elst: one edit of 2000 ms from media time 1024), mdia(mdhd 44100, hdlr soun, minf(stbl(stts: 87 x 1024 then 1 x 136)))))
const fake = () => Buffer.concat([box('ftyp', Buffer.from('isom0000', 'latin1')), box('moov',
  box('mvhd', Buffer.concat([u32(0, 0, 0), u32(1000, 0)])),
  box('trak', box('edts', box('elst', Buffer.concat([u32(0, 1), u32(2000, 1024, 0x10000)]))),
    box('mdia', box('mdhd', Buffer.concat([u32(0, 0, 0), u32(44100, 0)])), box('hdlr', Buffer.concat([u32(0, 0), Buffer.from('soun', 'latin1'), u32(0, 0, 0)])),
      box('minf', box('stbl', box('stts', Buffer.concat([u32(0, 2), u32(87, 1024), u32(1, 136)])))))))]);

t('reader 2 (the mp4 bytes) is right on a hand-built file: one edit of 2000 ms from media time 1024 reads as skip 1024 and no lead, and the sample table counts 88 samples', () => {
  const [a] = mp4Tracks(fake());
  assert.equal(a.type, 'audio'); assert.equal(a.edits.length, 1); assert.equal(a.edits[0].dur, 2000); assert.equal(a.skipUnits, 1024); assert.equal(a.leadSeconds, 0); assert.equal(mp4SampleCount(fake()), 88);
});

t('reader 1 (the click finder) is right on built signals: four clicks are found, close maxima merge, a click below the threshold is ignored', () => {
  const a = new Int16Array(200000); a[100] = 24000; a[88100] = 24000; a[88300] = 12000; a[176300] = 12000; a[176310] = 4000; a[500] = 5000;
  assert.deepEqual(peaksOf(a, AAC.thr).map((p) => p.index), [100, 88100, 88300, 176300]);
});

t('ffmpeg -version is recorded, and the evidence holds the four source films and the new checks', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const k of ['ff08', 'ff46', 'ff78', 'ff79', 'bridge', 'recipe', 'facts']) assert.ok(ev[k], k);
  assert.match(ev.ff08.ffmpeg, /^ffmpeg version /);
});

// ---------- chapter 1: MP3 (ff78) ----------
t('MP3 control: the same wav through pcm_s16le returns the impulse at 4410 with 44100 samples (the reader can see an exact position)', () => {
  assert.equal(ev.ff78.control.imp.peak, 4410); assert.equal(ev.ff78.control.imp.samples, 44100);
});

t('MP3 without the tag (-write_xing 0): the impulse returns 1105 samples late and 46080 samples come out; CBR and VBR alike', () => {
  for (const m of ['cbr', 'vbr']) { const r = E78(`imp_${m}_raw`); near(r.shift, 1105, 3); assert.equal(r.samples, 46080); if (isV6()) { assert.equal(r.shift, 1105); assert.equal(r.peak, 5515); } }
});

t('MP3 with the tag: the impulse is back at 4410 and 44100 samples come out (6.1.1); on every build the tagged decode is earlier and shorter than the raw one', () => {
  const tg = E78('imp_cbr_tag'), raw = E78('imp_cbr_raw');
  assert.ok(Math.abs(tg.shift) < Math.abs(raw.shift)); assert.ok(tg.samples < raw.samples);
  if (isV6()) { assert.equal(tg.peak, 4410); assert.equal(tg.samples, 44100); }
});

t('MP3 tag, two readers: the bytes say delay 576 and padding 1404, and the decoder removed delay + 529 = 1105 at the start and 875 at the end; ffprobe start_time is 1105 / 44100', () => {
  const tg = E78('imp_cbr_tag'), raw = E78('imp_cbr_raw'), f = ev.facts;
  assert.equal(f.mp3DecoderExtra, 529); near(raw.shift - tg.shift, tg.mp3.delay + f.mp3DecoderExtra, 3);
  assert.equal(tg.mp3.delay + tg.mp3.padding, tg.mp3.audioFrames * 1152 - 44100);
  if (isV6()) { assert.equal(tg.mp3.delay, 576); assert.equal(tg.mp3.padding, 1404); assert.equal(f.mp3Skip, 1105); assert.equal(f.mp3Trim, 875); near(tg.probe.startTime, 1105 / 44100, 2e-6); }
});

// ---------- chapter 2: Opus (ff79) ----------
t('Opus header: pre-skip 312 samples = 6.5 ms in ogg, 100 ms pages, mkv and .opus; the click is at 4800 in all four and the control is 4800', () => {
  assert.equal(ev.ff79.control.click, 4800);
  for (const f of ['ogg', 'oggp', 'mkv', 'opus']) { assert.equal(E79(f).head.preSkip, E79('ogg').head.preSkip, f); assert.equal(E79(f).probe.initialPadding, E79(f).head.preSkip, f); assert.equal(E79(f).click, 4800, f); assert.equal(E79(f).samples, 48000, f); }
  if (isV6()) { assert.equal(E79('ogg').head.preSkip, 312); assert.equal(ev.facts.opusPreSkipMs, 6.5); }
  near(E79('mkv').head.codecDelayNs * 48000 / 1e9, E79('mkv').head.preSkip, 0.01);
});

t('Opus, rewrite only the pre-skip field in ogg: the click lands at 4800 + 312 - value (0: 312 late, 1000: 688 early), the sample count follows', () => {
  const base = E79('ogg').head.preSkip;
  for (const v of [0, 1000]) { const r = P79(`ogg_${v}`); assert.equal(r.head.preSkip, v); assert.equal(r.click, 4800 + base - v); assert.equal(r.samples, 48000 + base - v); }
  assert.equal(P79('ogg_312').click, 4800);
  if (isV6()) { assert.equal(ev.facts.opusLate0, 312); assert.equal(ev.facts.opusEarly1000, 688); assert.equal(P79('mkv_0').click, 5112); assert.equal(P79('mkv_1000').click, 4112); }
});

// ---------- chapter 3: AAC and the mp4 edit list (ff08, ff46, bridge) ----------
t('AAC priming is the mp4 edit list: one edit, 2000 ms long, starting at media time 1024 (the skip ffprobe reports); the decoder honours it and ignoring it brings the 1024 samples back', () => {
  const b = ev.bridge.single;
  assert.equal(b.editCount, 1); assert.equal(b.mediaTime, ev.ff08.a.firstPacketSkipSamples); assert.equal(b.mediaTime, 1024); near(b.editMs, 2000, 1);
  assert.equal(b.decodedHonoured, b.sampleCount * 1024 - b.mediaTime, 'reader 2 (bytes) predicts the decoder');
  assert.equal(b.ignoredMinusHonoured, 1024); assert.equal(b.decodedIgnored, b.sampleCount * 1024);
  if (isV6()) { assert.equal(b.decodedHonoured, 89088); assert.equal(b.decodedIgnored, 90112); }
});

t('the edit list also moves audio (ff46): -itsoffset 1 on the audio is an empty edit of 1000 ms in mp4 (audio start 1.000 s) and ignoring edit lists puts it back at 0; the mkv stores it as the first block time', () => {
  const m = R46('mp4.aPlus'), k = R46('mkv.aPlus');
  assert.equal(m.probe.audioStart, 1); assert.equal(m.bytes.audioEmpty, 1); assert.equal(m.bytes.audioEdits[0].dur, 1000); assert.equal(m.bytes.audioEdits[0].media, -1);
  assert.equal(m.ignored.audioStart, 0); assert.equal(k.probe.audioStart, 1); assert.equal(k.bytes.audioStart, 1);
  assert.equal(m.audio.samples, 192000); assert.equal(R46('mp4.base').probe.audioStart, 0);
});

t('-itsoffset -1 on the audio (ff46): the mp4 edit list skips the first 48000 samples and the mkv keeps all 192000 (the mp4 decode is shorter on every build; 144000 exactly on 6.1.1)', () => {
  const m = R46('mp4.aMinus'), k = R46('mkv.aMinus');
  assert.equal(m.bytes.audioSkipUnits, 48000); assert.equal(m.bytes.audioEdits[0].media, 48000); assert.equal(k.audio.samples, 192000); assert.ok(m.audio.samples < 192000);
  assert.equal(m.ignored.audioSamples, 192000);
  if (isV6()) { assert.equal(m.audio.samples, 144000); assert.equal(ev.facts.mp4SkipEdit, 48000); }
});

t('the copy join (ff08): 176 packets, no skip marker, the edit list is 4024 ms from media time 0, it decodes 180224 samples, 3824 more than the 176400 asked = 2 x (1024 priming + 888 padding)', () => {
  const a = ev.ff08;
  assert.equal(a.join.packets, a.a.packets + a.b.packets); assert.equal(a.join.firstPacketSkipSamples, 0);
  assert.equal(a.accounting.joinMinusValid, 2 * (a.accounting.primingPerFile + a.accounting.paddingPerFile));
  assert.equal(ev.bridge.join.mediaTime, 0); near(ev.bridge.join.editMs, 4024, 1);
  assert.equal(a.join.decodedSamples, ev.bridge.join.sampleCount * 1024, 'bytes predict the decode');
  if (isV6()) { assert.equal(a.join.decodedSamples, 180224); assert.equal(a.accounting.joinMinusValid, 3824); assert.equal(a.join.packets, 176); assert.equal(ev.facts.aacExtraMs, 86.7); }
});

// ---------- chapter 4: the seam (new), the click readers ----------
t('control: the two clicked wavs joined as pcm have the clicks at 100, 88100, 88300, 176300, seam 200, 176400 samples, file A louder than file B (the reader sees an exact seam and the order)', () => {
  const c = RC().control;
  assert.deepEqual(c.clicks, [100, 88100, 88300, 176300]); assert.equal(c.seamGap, 200); assert.equal(c.samples, 176400); assert.equal(c.orderOk, true);
});

t('single AAC file: the clicks are where they were put (within 2 samples) and the decode has end padding after the last click (fewer than 1024 samples)', () => {
  const s = RC().single.a;
  assert.equal(s.count, 2); near(s.clicks[0], 100, 2); near(s.clicks[1], 88100, 2);
  assert.ok(s.padding > 0 && s.padding < 1024); assert.equal(s.padding, ev.ff08.accounting.paddingPerFile);
  assert.equal(s.editMs, 2000); assert.equal(s.skip, 1024);
});

t('known positive (the copy join): the first click is 1024 late, the seam is 2112 = 200 + priming 1024 + padding 888, on every build the seam is within 2 samples of 200 + priming + padding', () => {
  const c = RC().copy, f = ev.facts;
  assert.equal(c.count, 4); assert.equal(c.orderOk, true);
  near(c.firstClick, 100 + 1024, 2); near(c.seamGap, 200 + f.aacSeamPrimingPlusPadding, 3);
  if (isV6()) { assert.deepEqual(c.clicks, [1124, 89124, 91236, 179236]); assert.equal(c.seamGap, 2112); assert.equal(f.seamCopyMsRound, 48); }
});

t('reader agreement on the copy join: the sample table (bytes) predicts the seam as 200 + packets x 1024 - 88200, the decoder finds that seam; ffprobe counts the same 176 packets', () => {
  const c = RC().copy;
  near(c.seamGap, c.predictedSeamGap, 2); assert.equal(c.ffprobePackets, c.sampleCount); assert.equal(c.predictedDecode, c.samples);
  assert.equal(c.mediaTime, 0); assert.ok(c.editMs > 4000); near(c.ffprobeDuration, 4.0232, 0.001);
  if (isV6()) { assert.equal(c.sampleCount, 176); assert.equal(c.editMs, 4024); }
});

t('re-encoding the copy join without a trim still leaves the first file\'s padding as silence: the seam is 200 + 888 = 1088 (the first click is back at 100)', () => {
  const n = RC().notrim;
  assert.equal(n.count, 4); near(n.firstClick, 100, 2); near(n.seamGap, 200 + ev.ff08.accounting.paddingPerFile, 3); assert.ok(n.seamGap > 1000);
  if (isV6()) { assert.equal(n.seamGap, 1088); assert.equal(n.samples, 178176); }
});

// ---------- chapter 5: cutting (ff78, ff79) ----------
t('MP3 copy cut: -ss 0.5 -c copy writes a new tag whose delay makes the cut start thousands of samples late; the re-encoded cut starts within 2 samples of 22050 (exact on 6.1.1)', () => {
  const cp = C78('copyBefore5'), re = C78('reencode5');
  assert.ok(cp.late > 1000); near(re.startsAt, 22050, 2); assert.equal(re.consistent, true); assert.ok(cp.mp3.delay > E78('imp_cbr_tag').mp3.delay);
  if (isV6()) { assert.equal(cp.mp3.delay, 3567); assert.equal(cp.late, 3981); assert.equal(ev.facts.mp3CutDrop, 4096); assert.equal(re.startsAt, 22050); assert.equal(C78('copyNoXing5').late, -115); }
});

t('Opus copy cut: copies land on 960-sample (20 ms) packets, so the start is off by 0 or by 960 samples; the re-encode starts at 24000', () => {
  assert.equal(ev.facts.opusPacketSamples, 960); assert.equal(ev.facts.opusPacketMs, 20);
  for (const k of ['mkvBefore', 'mkvAfter', 'oggAfter', 'oggpAfter']) assert.ok([0, 960, -960].includes(C79(k).offset), `${k}: ${C79(k).offset}`);
  assert.equal(C79('reencode').startsAt, 24000);
  if (isV6()) { assert.equal(C79('mkvBefore').offset, -960); assert.equal(C79('mkvAfter').offset, 0); assert.equal(C79('oggAfter').offset, 960); }
});

// ---------- chapter 6: the recipe (new composite) ----------
t('the recipe (trim to the container duration, concat, encode once), on a fresh pair: the clicks come out within 2 samples of 100, 88100, 88300, 176300 and the seam is 200 (within 2)', () => {
  const r = RC().recipe;
  assert.equal(r.count, 4); assert.equal(r.orderOk, true);
  [100, 88100, 88300, 176300].forEach((v, i) => near(r.clicks[i], v, 2, `click ${i}`)); near(r.seamGap, 200, 2);
  assert.match(r.command, /atrim=duration=2\[x\]/); assert.equal(RC().durations.a, 2);
  if (isV6()) { assert.deepEqual(r.clicks, [100, 88100, 88300, 176300]); assert.equal(r.seamGap, 200); assert.equal(r.samples, 177152); }
});

t('the recipe, reader 2 (the bytes) and reader 3 (ffprobe): edit list 4000 ms from media time 1024, 174 packets in the sample table and in ffprobe, ffprobe duration 4 s, and the bytes predict the decoded length (packets x 1024 - skip)', () => {
  const r = RC().recipe;
  near(r.editMs, 4000, 1); assert.equal(r.mediaTime, 1024); assert.equal(r.skip, 1024); assert.equal(r.ffprobePackets, r.sampleCount); near(r.ffprobeDuration, 4, 0.001);
  assert.equal(r.predictedDecode, r.samples); near(r.editSamples, 176400, 45);
  const pad = r.samples - 176400; assert.ok(pad >= 0 && pad < 1024, `end padding ${pad}`);
  if (isV6()) { assert.equal(r.sampleCount, 174); assert.equal(r.editMs, 4000); assert.equal(pad, 752); }
});

t('the recipe against its controls: it beats the copy join and the untrimmed re-encode at the seam, and the two bad cases are visible to every reader (clicks, edit list, packets)', () => {
  const { recipe, copy, notrim, control } = RC();
  assert.ok(Math.abs(recipe.seamGap - control.seamGap) <= 2); assert.ok(copy.seamGap > recipe.seamGap + 1900); assert.ok(notrim.seamGap > recipe.seamGap + 800);
  assert.ok(copy.editMs > recipe.editMs && notrim.editMs > recipe.editMs, 'the bytes of the bad files claim a longer file');
  assert.ok(copy.ffprobePackets > recipe.ffprobePackets);
});

t('the recipe is repeatable: a second fresh pair, encoded and joined again in a new folder, gives the same clicks, seam, packets and edit list', () => {
  const again = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl02b-'));
  try {
    const r2 = runRecipe(again).recipe, r1 = RC().recipe;
    assert.deepEqual(r2.clicks, r1.clicks); assert.equal(r2.seamGap, r1.seamGap); assert.equal(r2.sampleCount, r1.sampleCount); assert.equal(r2.editMs, r1.editMs); assert.equal(r2.samples, r1.samples);
  } finally { fs.rmSync(again, {recursive: true, force: true}); }
});

// ---------- the script ----------
const script = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'script.json'), 'utf8'));

t('script: 14 to 18 scenes, 850 to 1050 words, every scene has narration and two captions', () => {
  assert.ok(script.scenes.length >= 14 && script.scenes.length <= 18, `${script.scenes.length}`);
  const w = wordCount(script); assert.ok(w >= 850 && w <= 1050, `${w} words`);
  for (const s of script.scenes) { assert.ok(s.narration.length > 20, s.id); assert.equal(s.captions.length, 2, s.id); }
  assert.equal(new Set(script.scenes.map((s) => s.id)).size, script.scenes.length);
});

t('script: the estimated length is 5:40 to 6:50 (words at 148 per minute, with the engine lead and end card; and the engine word-rate estimate)', () => {
  const d = durations(script);
  assert.ok(d.total148 >= 340 && d.total148 <= 410, `${mmss(d.total148)} at 148 wpm`);
  assert.ok(d.engine >= 340 && d.engine <= 410, `${mmss(d.engine)} by the engine estimate`);
});

t('script: every number spoken or captioned (above ten) is in the evidence', () => {
  assert.deepEqual(unknownNumbers(script, ev), []);
  assert.deepEqual(spokenNumbers('four thousand four hundred ten and six point five'), [4410, 6.5]);
  assert.deepEqual(captionNumbers('Skips 576 + 529 = 1,105'), [576, 529, 1105]);
});

t('script: no em or en dashes, no uppercase flags, fullTitle at most 74 characters, thumb label at most 28, palette and series set, the ffmpeg build named in the last scene matches the evidence', () => {
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all)); assert.ok(!/\s-[A-Z]{2,}\b/.test(all));
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28); assert.equal(script.series, 'FFmpeg Reality Checks'); assert.equal(script.kicker, 'Deep dive 02');
  assert.ok(['red', 'cyan', 'amber', 'green'].includes(script.thumb.color));
  if (isV6()) assert.match(ev.ffmpeg, /version 6\.1\.1/);
  assert.ok(script.scenes.some((s) => s.id === script.hero.scene));
});

t('distribution kits (fl02 and fs02): titles at most 60 characters, exactly 15 tags, pinned comment at most 300 characters and naming ffmpeg 6.1.1, every number in the text is in the evidence, no dashes, fs02 description starts with a hook line and ends with #Shorts', () => {
  const base = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const have = evidenceNumbers(ev);
  for (const f of ['fl02', 'fs02']) {
    const md = fs.readFileSync(path.join(base, f, 'content', 'distribution.md'), 'utf8');
    const titles = [...md.matchAll(/^\d\. `([^`]+)`/gm)].map((m) => m[1]); assert.equal(titles.length, 4, f);
    for (const x of titles) assert.ok(x.length <= 60, `${f}: ${x}`);
    const tags = md.split('### Tags (15)')[1].split('###')[0].trim().split(', '); assert.equal(tags.length, 15, f);
    const pin = md.split('### Pinned comment')[1].split('\n').slice(2).join('\n').trim(); assert.ok(pin.length <= 300, `${f} pin ${pin.length}`); assert.match(pin, /6\.1\.1/);
    assert.ok(!/[\u2014\u2013]/.test(md)); assert.match(md, /<!-- chapters:start -->[\s\S]+<!-- chapters:end -->/); assert.ok(!/\{\{/.test(md));
    const body = md.replace(/<!-- chapters:start -->[\s\S]*<!-- chapters:end -->/, '').replace(/≤ \d+ chars/g, '').replace(/ffmpeg \d+\.\d+\.\d+/gi, ' ').replace(/\b\d\.\d\.\d\b/g, ' ').replace(/FL02|FS02|ff0?\d+/gi, ' ').replace(/github\.com\S+/g, ' ');
    const bad = [...new Set([...body.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ''))).filter((n) => !(Number.isInteger(n) && n <= 10) && !have.has(n)))];
    assert.deepEqual(bad, [], f);
    if (f === 'fs02') { const d = md.split('### Description')[1].split('Chapters\n')[0].trim(); assert.ok(d.split('\n')[0].length < 300); assert.ok(d.endsWith('#Shorts')); }
    if (f === 'fl02') { const d = md.split('### Description')[1]; for (const s of ['FFmpeg AAC Join: 2112 Samples at the Seam', 'MP3 Encoder Delay: 1105 Samples Late Without the Xing Tag', 'Opus Pre-Skip 312', 'FFmpeg itsoffset Moves Audio 1.000 s', 'FFmpeg AAC Join Adds Extra Samples at the Seam']) assert.ok(d.includes(s), s); }
  }
});
