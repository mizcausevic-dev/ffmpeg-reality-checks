import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runAll, verdict, ASK, WANT, range} from '../fixture/experiment.mjs';
import {spokenNumbers, evidenceNumbers} from './numbers.mjs';

// Relations hold on any build. Exact numbers are asserted only on ffmpeg 6.1.1 (the 6.x build in this container);
// on any other build the exact lines are skipped, so a difference there shows up as a finding, not a failure.
const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl01-')); ev = runAll(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const v6 = () => ev.build === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const S = () => ev.sources;
const R = () => ev.recipe;

t('build label: the build seen by the test is the one in the version line, and the version is recorded in the evidence', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.ok(['v6', 'v8', 'other'].includes(ev.build));
});

// ---- ff23: which seconds -------------------------------------------------------------------------------------
t('ff23 control: the source has 500 frames and every frame is unique, so a frame md5 names a frame', () => {
  assert.equal(S().ff23.source.frames, 500); assert.equal(S().ff23.source.uniqueFrames, 500);
});

t('ff23: -ss and -to together give the same 5 s from either side of -i; -to alone after a seek is a timestamp on the NEW clock and doubles the clip', () => {
  const r = S().ff23.runs;
  assert.deepEqual([r.to_before_ss.content.first, r.to_before_ss.content.last], [r.both_after.content.first, r.both_after.content.last]);
  assert.equal(r.to_after_ss.declared.frames, 2 * r.to_before_ss.declared.frames, '-to after the input doubles the clip');
  assert.equal(r.to_after_ss.content.first, r.to_before_ss.content.first, 'same start');
  assert.ok(r.to_after_ss.content.contiguous && r.to_before_ss.content.contiguous);
  assert.deepEqual([r.t_after_ss.content.first, r.t_after_ss.content.last], [r.to_before_ss.content.first, r.to_before_ss.content.last], '-t after a seek is a length');
  if (v6()) {
    assert.equal(r.to_before_ss.declared.frames, 125); assert.equal(r.to_before_ss.content.first, 125); assert.equal(r.to_before_ss.content.last, 249);
    assert.equal(r.to_after_ss.declared.frames, 250); assert.equal(r.to_after_ss.content.last, 374);
    assert.equal(r.to_only_input.declared.frames, 250); assert.equal(r.to_only_input.content.first, 0);
    near(r.to_after_ss.declared.seconds, 10, 0.05); near(r.to_before_ss.declared.seconds, 5, 0.05);
  }
});

t('ff23 readers: ffprobe frame count equals the span of source frames found by md5, for every cut', () => {
  for (const [k, r] of Object.entries(S().ff23.runs)) assert.equal(r.declared.frames, r.content.last - r.content.first + 1, k);
});

// ---- ff01: -c copy, where it starts ----------------------------------------------------------------------------
t('ff01 control: the frame lookup finds the first and last source frame and rejects an unknown md5; 500 unique frames, keyframes every 5 s', () => {
  const s = S().ff01;
  assert.equal(s.lookup.first, 0); assert.equal(s.lookup.last, 499); assert.equal(s.lookup.unknown, -1);
  assert.equal(s.source.uniqueFrames, 500); assert.deepEqual(s.source.keyframes, [0, 5, 10, 15]);
});

t('ff01: copy with -ss BEFORE -i starts on the right frame but hides a pre-roll; copy with -ss AFTER -i starts at the next keyframe and is far too short; re-encoding is frame accurate', () => {
  const v = S().ff01.variants, q = S().ff01.request;
  assert.equal(v.input_seek_copy.firstSourceFrame, q.expectedFirstFrame);
  assert.ok(v.input_seek_copy.packets - v.input_seek_copy.decodedFrames >= 50, 'hidden pre-roll');
  assert.ok(v.input_seek_copy.firstPacketPts < 0, 'pre-roll packets carry negative timestamps');
  assert.ok(v.output_seek_copy.firstSourceTime > q.seekSeconds, 'starts later than asked');
  assert.ok(v.output_seek_copy.decodedSeconds < 1, 'much shorter than the 3 s asked for');
  assert.equal(v.input_seek_reencode.firstSourceFrame, q.expectedFirstFrame);
  assert.ok(Math.abs(v.input_seek_reencode.decodedFrames - q.expectedFrames) <= 1);
  if (v6()) {
    assert.equal(v.input_seek_copy.firstSourceTime, 7.52); assert.equal(v.input_seek_copy.decodedFrames, 75); assert.equal(v.input_seek_copy.packets, 138);
    assert.equal(v.input_seek_copy.packets - v.input_seek_copy.decodedFrames, 63);
    assert.equal(v.output_seek_copy.firstSourceTime, 10); assert.equal(v.output_seek_copy.decodedFrames, 13); near(v.output_seek_copy.decodedSeconds, 0.52, 0.001);
    assert.equal(v.input_seek_reencode.decodedFrames, 74); near(v.input_seek_reencode.decodedSeconds, 2.96, 0.001);
  }
});

// ---- ff21: who places the keyframes ----------------------------------------------------------------------------
t('ff21: -g 100 is a maximum (keyframes land on the scene cuts); -sc_threshold 0 gives a strict grid; -force_key_frames places them exactly; both readers agree', () => {
  const r = S().ff21.runs, cuts = S().ff21.source.cuts;
  assert.ok(cuts.every((c) => r.g100.keyframes.includes(c)), 'cuts get keyframes');
  assert.ok(!r.g100_nosc.keyframes.includes(3.2), 'no keyframe on the cut when scenecut is off');
  const gaps = r.g100_nosc.keyframes.map((k, i, a) => (i ? +(k - a[i - 1]).toFixed(2) : null)).slice(1);
  assert.ok(gaps.every((g) => g === gaps[0]), 'equal gaps');
  assert.deepEqual(r.g100_forced.keyframes, [0, ...cuts]);
  assert.ok(r.g100_force_2s.keyframes.includes(2) && cuts.every((c) => r.g100_force_2s.keyframes.includes(c)), 'a forced keyframe is added to the cuts');
  for (const [k, x] of Object.entries(r)) { assert.deepEqual(x.iFrames, x.keyframes, k); const k2 = [...x.keyframes, 10]; for (let i = 1; i < k2.length; i++) assert.ok(k2[i] - k2[i - 1] <= 4.01, `${k} gap`); }
  if (v6()) { assert.deepEqual(r.g100.keyframes, [0, 3.2, 6.8]); assert.deepEqual(r.g100_nosc.keyframes, [0, 4, 8]); assert.deepEqual(r.g100_force_2s.keyframes, [0, 2, 3.2, 6.8]); }
});

// ---- ff32: -sseof ----------------------------------------------------------------------------------------------
t('ff32: re-encoded -sseof -3 is exactly 90 frames (210 to 299) and equals the -ss 7 control; copy starts on a keyframe and gives more; both readers agree on every output', () => {
  const r = S().ff32.runs, want = range(210, 299);
  for (const k of ['ffv1_enc', 'g100_enc', 'g10_enc']) assert.deepEqual(r[k].byMd5, want, k);
  assert.deepEqual(r.g100_ss.byMd5, r.g100_enc.byMd5, 'control');
  assert.ok(r.g100_copy.frames > r.g100_enc.frames, 'copy gives more than asked');
  assert.deepEqual(r.g100_copy.byMd5.slice(-90), r.g100_enc.byMd5, 'the copy contains the asked frames');
  assert.ok(S().ff32.source.keyframes.g100.includes(r.g100_copy.first), 'copy starts on a keyframe');
  assert.deepEqual(r.g10_copy.byMd5, r.g10_enc.byMd5, 'keyframe exactly 3 s from the end: copy equals re-encode');
  assert.ok(r.g10_enc29.frames < r.g10_copy29.frames, 'at -2.9 the copy starts earlier than the re-encode');
  for (const [k, x] of Object.entries(r)) { assert.deepEqual(x.byCode, x.byMd5, k); near(x.packetSeconds, x.decodedSeconds, 0.02, k); }
  if (v6()) { assert.equal(r.g100_copy.frames, 100); assert.equal(r.g100_copy.first, 200); near(r.g100_copy.packetSeconds, 3.333, 0.03); assert.equal(r.g10_enc29.frames, 87); assert.equal(r.g10_copy29.frames, 90); }
});

t('ff32: the offset counts back from the container (10 s picture, 12 s audio: 1 s of picture, 3 s of audio), and an offset longer than the file is not an error', () => {
  const s = S().ff32;
  near(s.source.av.container, 12, 0.05); near(s.source.av.picture, 10, 0.05);
  const r = s.runs.av;
  assert.ok(r.frames < 90, 'less picture than the 3 s asked for'); near(r.audioSeconds, 3, 0.05);
  assert.deepEqual(s.runs.big_enc.byMd5, range(0, 299)); assert.deepEqual(s.runs.big_copy.byMd5, range(0, 299));
  if (v6()) { assert.equal(r.frames, 30); assert.deepEqual(r.byMd5, range(270, 299)); }
});

// ---- ff15: -shortest -------------------------------------------------------------------------------------------
t('ff15: -shortest with -c copy ends the picture early (fewer frames than the re-encode), and with longer audio it trims the sound to the picture', () => {
  const r = S().ff15.runs;
  assert.equal(r.short_audio_none.decoded.videoFrames, 125);
  assert.ok(r.short_audio_copy.decoded.videoFrames < r.short_audio_encode.decoded.videoFrames, 'copy ends early');
  assert.equal(r.short_audio_encode.decoded.videoFrames, 75);
  near(r.long_audio_none.declared.container, 8, 0.01); near(r.long_audio_none.declared.video, 5, 0.01);
  near(r.long_audio_short.declared.container, 5, 0.01); assert.equal(r.long_audio_short.decoded.videoFrames, 125);
  for (const [k, x] of Object.entries(r)) { near(x.declared.video, x.decoded.videoSeconds, 0.05, `${k} video`); near(x.declared.audio, x.decoded.audioSeconds, 0.05, `${k} audio`); }
  if (v6()) { assert.equal(r.short_audio_copy.decoded.videoFrames, 73); near(r.short_audio_copy.decoded.videoSeconds, 2.92, 0.01); }
});

// ---- new: the end of a copy ----------------------------------------------------------------------------------------
t('new: -t 3 with -c copy is not a fix for -shortest: copy cannot give the 75 frames that the re-encode gives (73 with -shortest, 77 with -t 3)', () => {
  const e = ev.recipe.ends;
  assert.equal(e.t3_enc.decoded.videoFrames, 75, 're-encode with -t 3 is exact');
  assert.ok(e.shortest.decoded.videoFrames < 75, '-shortest copy ends early');
  near(e.t3_enc.declared.video, 3, 0.02);
  if (v6()) { assert.equal(e.shortest.decoded.videoFrames, 73); assert.equal(e.t3.decoded.videoFrames, 77); near(e.t3.declared.video, 3.08, 0.01); }
});

// ---- new: the recipe ---------------------------------------------------------------------------------------------
t('recipe fixture: 600 unique coded frames, 30 fps, 20 s; 7.5 s is frame 225 and 3 s is 90 frames; grid keyframes every 5 s; forced keyframes at 7.5 s and 10.5 s; the x264 files are lossless', () => {
  const s = R().source;
  assert.equal(s.frames, 600); assert.equal(s.unique, 600);
  assert.equal(ASK.start * ASK.fps, ASK.startFrame); assert.equal(ASK.length * ASK.fps, ASK.wantFrames);
  assert.deepEqual(s.keyframes.grid, [0, 150, 300, 450]);
  assert.ok(s.keyframes.prepared.includes(225) && s.keyframes.prepared.includes(315), 'keyframes at the cut points');
  assert.deepEqual(s.md5Same, {grid: true, prepared: true});
});

t('recipe control: a reference built by frame number passes both readers, a shifted answer fails each reader on its own, and the naive copy (-ss after -i, -c copy) fails both', () => {
  const ref = R().control.reference;
  assert.deepEqual(ref.byMd5, WANT); assert.deepEqual(ref.byCode, WANT); assert.equal(ref.verdict.exact, true);
  const shifted = range(WANT[0] + 1, WANT[WANT.length - 1] + 1);
  assert.equal(verdict({...ref, byMd5: shifted}).md5, false, 'reader 1 can fail');
  assert.equal(verdict({...ref, byCode: shifted}).code, false, 'reader 2 can fail');
  assert.equal(verdict({...ref, byMd5: shifted}).exact, false);
  const n = R().runs.naive_copy;
  assert.equal(n.verdict.md5, false); assert.equal(n.verdict.code, false); assert.equal(n.verdict.exact, false);
  assert.ok(n.first > ASK.startFrame, 'starts later than asked'); assert.ok(n.frames < ASK.wantFrames / 2, 'far shorter than asked');
  if (v6()) { assert.equal(n.first, 300); assert.equal(n.frames, 15); }
});

t('recipe: seek before -i, -t for the length, re-encode: exactly the 90 asked-for frames (225 to 314), both readers agree, no hidden packets', () => {
  const r = R().runs.reencode;
  assert.deepEqual(r.byMd5, WANT); assert.deepEqual(r.byCode, WANT); assert.equal(r.verdict.exact, true);
  assert.equal(r.verdict.hiddenPackets, 0); assert.equal(r.frames, 90);
});

t('recipe: copy with -ss before -i on a 5 s grid shows the right 90 frames but carries a hidden pre-roll (165 packets, 75 hidden)', () => {
  const r = R().runs.copy_on_grid;
  assert.equal(r.verdict.exact, true);
  assert.ok(r.verdict.hiddenPackets > 0, 'hidden pre-roll');
  if (v6()) { assert.equal(r.packets, 165); assert.equal(r.verdict.hiddenPackets, 75); }
});

t('recipe: keyframes forced at the cut points make a copy exact: 90 frames, 90 packets, no hidden pre-roll, with -ss on either side of -i', () => {
  for (const k of ['copy_prepared', 'copy_prepared_after']) {
    const r = R().runs[k];
    assert.equal(r.verdict.exact, true, k); assert.equal(r.verdict.hiddenPackets, 0, k); assert.equal(r.frames, 90, k); assert.equal(r.packets, 90, k);
  }
});

t('the two readers agree on every recipe output (frame md5 and decoded frame code name the same frames), and the packet reader agrees on picture length', () => {
  for (const [k, r] of Object.entries(R().runs)) { assert.deepEqual(r.byCode, r.byMd5, k); if (r.verdict.hiddenPackets === 0) near(r.packetSeconds, r.decodedSeconds, 0.05, k); }
});

// ---- the script ------------------------------------------------------------------------------------------------------
t('script: every number spoken in the narration (and every number in a caption) is a number in the evidence', () => {
  const script = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'script.json'), 'utf8'));
  const known = evidenceNumbers(ev);
  const derived = {63: ev.sources.ff01.variants.input_seek_copy.packets - ev.sources.ff01.variants.input_seek_copy.decodedFrames};
  const bad = [];
  for (const sc of script.scenes) for (const n of spokenNumbers(sc.narration)) if (!known.has(n.value) && !(n.value in derived && derived[n.value] === n.value)) bad.push(`${sc.id}: "${n.words}" = ${n.value}`);
  for (const sc of script.scenes) for (const c of sc.captions) for (const m of c.replace(/ffmpeg 6\.1\.1/g, '').matchAll(/\d+(?:\.\d+)?/g)) if (!known.has(Number(m[0])) && !(Number(m[0]) in derived)) bad.push(`${sc.id} caption: ${m[0]}`);
  assert.deepEqual(bad, []);
});

t('script: 14 to 18 scenes, 850 to 1050 words, no em dash, flags are not uppercased, fullTitle at most 74 characters', () => {
  const script = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'script.json'), 'utf8'));
  const words = script.scenes.map((s) => s.narration.trim().split(/\s+/).length).reduce((a, b) => a + b, 0);
  assert.ok(script.scenes.length >= 14 && script.scenes.length <= 18, `${script.scenes.length} scenes`);
  assert.ok(words >= 850 && words <= 1050, `${words} words`);
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28);
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all), 'no em or en dash');
  assert.ok(!/ -[A-Z]/.test(all.replace(/-[A-Z][a-z]+ /g, '')), 'flags are lowercase');
});

t('distribution kits (fl01 and fs01): every number in the descriptions, titles and pinned comments is a number in the evidence; limits hold (titles 60, pinned comment 300, 15 tags)', () => {
  const known = evidenceNumbers(ev);
  for (const id of ['fl01', 'fs01']) {
    const md = fs.readFileSync(path.join(import.meta.dirname, '..', '..', id, 'content', 'distribution.md'), 'utf8');
    const body = md.replace(/<!-- chapters:start -->[\s\S]*?<!-- chapters:end -->/, '').replace(/^# .*$/m, '').replace(/ffmpeg 6\.1\.1|8\.1\.2|github\.com\S+|^\d+\. /gm, ' ');
    const bad = [...body.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g)].map((m) => Number(m[0])).filter((n) => !known.has(n));
    assert.deepEqual([...new Set(bad)], [], `${id}: numbers not in the evidence`);
    const titles = [...md.matchAll(/^\d\. `(.*?)` :/gm)].map((m) => m[1]);
    assert.equal(titles.length, 4); for (const x of titles) assert.ok(x.length <= 60, x);
    assert.ok(md.split('### Pinned comment (≤ 300 chars)\n\n')[1].trim().length <= 300);
    assert.equal(md.split('### Tags (15)\n\n')[1].split('\n')[0].split(', ').length, 15);
    assert.ok(!/[\u2014\u2013]/.test(md), 'no em or en dash');
  }
  const fsMd = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'fs01', 'content', 'distribution.md'), 'utf8');
  assert.ok(fsMd.split('### Description\n\n')[1].split('\n### Tags')[0].trim().endsWith('#Shorts'), 'the fs01 description ends with #Shorts');
});

// ---- the film's numbers: the E block in video/Scenes.tsx is generated from this evidence and must not drift ----
import {sceneFacts, factsBlock, blockRe} from '../fixture/facts.mjs';
t('video/Scenes.tsx: the generated E block equals the block built from a fresh run of the fixture (no hand-edited or stale on-screen numbers)', () => {
  if (!v6()) return; // the on-screen numbers are the ffmpeg 6.1.1 numbers
  const file = path.join(import.meta.dirname, '..', 'video', 'Scenes.tsx');
  const src = fs.readFileSync(file, 'utf8');
  assert.ok(blockRe.test(src), 'no E:start / E:end block');
  assert.equal(src.match(blockRe)[0], factsBlock(sceneFacts(ev)), 'run: node episodes/fl01/fixture/gen-facts.mjs');
});
