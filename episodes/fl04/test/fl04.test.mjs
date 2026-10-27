import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, RECIPE, sceneNumbers} from '../fixture/experiment.mjs';
import {EV_RE} from '../fixture/inject-ev.mjs';
import {spokenNumbers, digitNumbers, evidenceNumbers, STRUCTURAL} from './spoken.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl04-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const range = (n) => [...Array(n).keys()];
const loopOf = (n, plays) => Array.from({length: plays}, () => range(n)).flat();
const perBuild = (v6, other) => { if (ev.build === 'v6') v6(); else other?.(); };
const R = (k) => ev.recipe.runs[k];
const outline = fs.readFileSync(path.join(here, '..', '..', '..', 'SERIES_OUTLINE.md'), 'utf8');
const row = (n) => outline.split(/\r?\n/).find((l) => l.startsWith(`| ${n} |`));

// ---------- the build ----------
t('the build is recorded, and the label matches the version line', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /); assert.equal(buildOf(ev.ffmpeg), ev.build);
});

// ---------- chapter 1: ff05, variable to constant frame rate ----------
t('ff05: the source is variable frame rate: 93 frames over 5 s, three gap sizes (33, 67, 933 ms), base rate 30, average far below it', () => {
  const s = ev.ff05.source;
  assert.equal(s.frames, 93); assert.equal(s.rFrameRate, '30/1'); assert.deepEqual(s.distinctGapsMs, [33, 67, 933]);
  assert.ok(s.avgFps > 18 && s.avgFps < 19, `${s.avgFps}`); near(s.duration, 5, 0.1);
});
t('ff05 control: -fps_mode passthrough keeps all 93 frames and the three gap sizes, no duplicates', () => {
  const v = ev.ff05.variants.passthrough;
  assert.equal(v.frames, 93); assert.equal(v.distinctGapsMs.length, 3); assert.equal(v.duplicatesByCounter, 0);
});
t('ff05: with no rate option ffmpeg 6.1.1 gives 150 frames with 57 duplicates (both counters), and -fps_mode cfr -r 30 gives the same; every variant has 93 distinct pictures and about 5 s', () => {
  const d = ev.ff05.variants.default, c = ev.ff05.variants.cfr_30;
  perBuild(() => { assert.equal(d.frames, 150); assert.equal(d.duplicatesByCounter, 57); assert.equal(d.duplicatesByMd5, 57); });
  assert.equal(c.frames, 150); assert.equal(c.duplicatesByCounter, 57); assert.equal(c.distinctGapsMs.length, 1);
  for (const [k, v] of Object.entries(ev.ff05.variants)) { assert.equal(v.uniqueFrames, 93, k); assert.equal(v.duplicatesByCounter, v.duplicatesByMd5, k); near(v.duration, 5, 0.1, k); }
});

// ---------- chapter 2: ff16, -r before and after ----------
t('ff16: 60 frames at 30 fps in 2 s; -r 10 after -i gives 22 frames and 2.2 s, the fps filter gives 20 frames and 2.0 s', () => {
  const a = ev.ff16.runs.after, f = ev.ff16.runs.fps_filter;
  assert.equal(ev.ff16.source.mp4.inside.framesDecoded, 60);
  assert.equal(a.inside.framesDecoded, 22); near(a.declared.duration, 2.2, 0.01);
  assert.equal(f.inside.framesDecoded, 20); near(f.declared.duration, 2, 0.01);
});
t('ff16: -r 10 before -i keeps all 60 frames and plays 6 s at 10 fps; with -c copy it has no effect (30 fps, 2 s); the raw H.264 stream follows -r 10 before -i too', () => {
  const b = ev.ff16.runs.before, c = ev.ff16.runs.before_copy;
  assert.equal(b.inside.framesDecoded, 60); assert.equal(b.declared.fps, 10); near(b.declared.duration, 6, 0.01);
  assert.equal(c.declared.fps, 30); near(c.declared.duration, 2, 0.01);
  assert.equal(ev.ff16.runs.raw_before.declared.fps, 10); near(ev.ff16.runs.raw_before.declared.duration, 6, 0.01);
});

// ---------- chapter 3: ff25, which frame does fps=1 keep ----------
t('ff25: at 25 fps fps=1 keeps frames 12, 37, 62 (first at 0.48 s), round=up keeps 0, 25, 50, and both readers agree on every output', () => {
  const r = ev.ff25.runs;
  assert.deepEqual(r.s25_near.byMd5.slice(0, 5), [12, 37, 62, 87, 112]); near(r.s25_near.byMd5[0] / r.s25_near.fps, 0.48, 0.001);
  assert.deepEqual(r.s25_up.byMd5, [0, 25, 50, 75, 100]);
  for (const [k, x] of Object.entries(r)) assert.deepEqual(x.byMd5, x.byLuma, k);
});
t('ff25: 60 to 24 fps never uses frame 0 and keeps 1, 3, 6, 8, 11, 13', () => {
  const k = ev.ff25.runs.s60_to_24;
  assert.ok(!k.byMd5.includes(0)); assert.deepEqual(k.byMd5.slice(0, 6), [1, 3, 6, 8, 11, 13]); assert.equal(k.byMd5.length, 48);
});

// ---------- chapter 4: ff29, setpts and the audio ----------
t('ff29 control: the source has 300 unique frames, picture 10 s, audio 10 s, container 10 s, 440 Hz on both pitch readers', () => {
  const s = ev.ff29.source, r = s.read;
  assert.equal(s.unique, 300); near(r.video.endPackets, 10, 0.05); near(r.audio.endPackets, 10, 0.05); near(r.container, 10, 0.05);
  assert.equal(r.pitch.goertzel, 440); near(r.pitch.zeroCross, 440, 1);
});
t('ff29: setpts=0.5*PTS alone: picture 5.07 s, audio 10.0 s, container 10.0 s; at the default 30 fps only 152 of 300 frames survive (0, 1, 2, 3, then every second one)', () => {
  const r = ev.ff29.runs.video;
  near(r.video.endPackets, 5.066, 0.02); near(r.audio.endPackets, 10, 0.05); near(r.container, 10, 0.05);
  assert.equal(r.video.framesDecoded, 152); assert.deepEqual(r.byMd5.slice(0, 8), [0, 1, 2, 3, 5, 7, 9, 11]);
});
t('ff29: atempo=2 gives 5 s of sound at 440 Hz; asetrate=88200,aresample=44100 gives 5 s at 880 Hz (known positive for the pitch readers)', () => {
  const a = ev.ff29.runs.tempo, b = ev.ff29.runs.rate;
  near(a.audio.endDecoded, 5, 0.05); assert.equal(a.pitch.goertzel, 440); near(a.pitch.zeroCross, 440, 1);
  near(b.audio.endDecoded, 5, 0.05); assert.equal(b.pitch.goertzel, 880); near(b.pitch.zeroCross, 880, 1);
});

// ---------- chapter 5: ff33, -stream_loop ----------
t('ff33 control: audio and picture both 4 s: -stream_loop 2 gives 360 frames, 12 s, with and without -c copy, same frames as a concat demuxer build', () => {
  for (const k of ['eq-enc', 'eq-copy']) { const r = ev.ff33.runs[k]; assert.equal(r.video.framesDecoded, 360, k); assert.deepEqual(r.byMd5, loopOf(120, 3), k); near(r.container, 12, 0.02, k); }
  assert.deepEqual(ev.ff33.controls.concatDemux.byMd5, ev.ff33.runs['eq-enc'].byMd5);
});
t('ff33: audio 3.9 s, re-encoded: 6.1.1 keeps 355 frames (11.83 s); any build loses frames and ends before 12 s; known-positive hand-made sequence is read as 355 frames by both frame readers', () => {
  const r = ev.ff33.runs['short-enc'];
  assert.ok(r.video.framesDecoded < 360 && r.video.endPackets < 11.99);
  perBuild(() => { assert.equal(r.video.framesDecoded, 355); near(r.video.endPackets, 11.833, 0.05); });
  const h = ev.ff33.controls.handmadeGaps; assert.equal(h.video.framesDecoded, 355); assert.deepEqual(h.byMd5, h.byCode);
});
t('ff33: audio 4.1 s: 12.3 s, all 360 frames, two picture holes of about 0.13 s; -c copy with audio 3.9 s keeps 360 frames and has two sound holes of about 0.1 s', () => {
  const l = ev.ff33.runs['long-enc'], c = ev.ff33.runs['short-copy'];
  assert.equal(l.video.framesDecoded, 360); near(l.container, 12.3, 0.05); assert.equal(l.video.gaps.length, 2); l.video.gaps.forEach((g) => near(g.gap, 0.133, 0.03));
  assert.equal(c.video.framesDecoded, 360); assert.equal(c.audio.gaps.length, 2); c.audio.gaps.forEach((g) => near(g.gap, 0.1, 0.01));
});

// ---------- the composite recipe ----------
t('recipe fixture: 300 unique frames, looped 3 times, and the command texts are the ones the film names', () => {
  assert.equal(ev.recipe.source.unique, 300); assert.equal(ev.recipe.source.plays, 3);
  assert.equal(RECIPE.recipe.command, 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv');
});
t('recipe, any build: picture, sound and container all last about 15 s, pitch is 440 Hz on both pitch readers, timestamps never repeat and every gap is 16 to 17 ms on ffprobe and 16.7 ms on the decode', () => {
  const r = R('recipe');
  near(r.video.endPackets, 15, 0.1); near(r.video.endDecoded, 15, 0.1); near(r.audio.endPackets, 15, 0.1); near(r.audio.endDecoded, 15, 0.1); near(r.container, 15, 0.1);
  assert.equal(r.pitch.goertzel, 440); near(r.pitch.zeroCross, 440, 1);
  assert.equal(r.stamps.packets.repeats, 0); assert.equal(r.stamps.decoded.repeats, 0);
  assert.equal(r.stamps.packets.minGapMs, 16); assert.equal(r.stamps.packets.maxGapMs, 17); near(r.stamps.decoded.minGapMs, 16.667, 0.01); near(r.stamps.decoded.maxGapMs, 16.667, 0.01);
});
t('recipe, 6.1.1: exactly 900 frames in source order (0 to 299 three times), 900 distinct timestamps on both readers; frame md5 and decoded frame code agree', () => {
  const r = R('recipe');
  perBuild(() => { assert.equal(r.video.framesDecoded, 900); assert.deepEqual(r.byMd5, loopOf(300, 3)); assert.equal(r.stamps.packets.distinct, 900); assert.equal(r.stamps.decoded.distinct, 900); });
  assert.deepEqual(r.byCode, r.byMd5); assert.equal(r.stamps.packets.distinct, r.stamps.decoded.distinct);
});
t('two readers agree on every recipe run: frame md5 and decoded code, packet and decoded end times within 20 ms, distinct timestamps equal, pitch within 1 Hz', () => {
  for (const [k, r] of Object.entries(ev.recipe.runs)) {
    assert.deepEqual(r.byCode, r.byMd5, k); near(r.video.endPackets, r.video.endDecoded, 0.02, k + ' picture'); near(r.audio.endPackets, r.audio.endDecoded, 0.02, k + ' sound');
    assert.equal(r.stamps.packets.distinct, r.stamps.decoded.distinct, k); near(r.pitch.goertzel, r.pitch.zeroCross, 1, k);
  }
});
t('control for the timestamp readers (known positive): the obvious fix, -fps_mode passthrough, keeps 900 frames in order but repeats timestamps: 450 distinct on 6.1.1 on both readers', () => {
  const r = R('passthrough');
  perBuild(() => { assert.equal(r.video.framesDecoded, 900); assert.equal(r.stamps.packets.distinct, 450); assert.equal(r.stamps.decoded.distinct, 450); assert.equal(r.stamps.packets.repeats, 450); assert.deepEqual(r.byMd5, loopOf(300, 3)); });
  near(r.audio.endDecoded, 15, 0.1);
});
t('control for the frame readers (known positive): -r 60 after -i gives 901 frames with frame 0 shown twice; no output rate keeps 452 frames (0, 1, 2, 3, 5, 7...) on 6.1.1', () => {
  const a = R('rFlag'), d = R('defaultFps');
  perBuild(() => {
    assert.equal(a.video.framesDecoded, 901); assert.deepEqual(a.byMd5.slice(0, 3), [0, 0, 1]); assert.deepEqual(a.byCode.slice(0, 3), [0, 0, 1]);
    assert.equal(d.video.framesDecoded, 452); assert.deepEqual(d.byMd5.slice(0, 8), [0, 1, 2, 3, 5, 7, 9, 11]);
  }, () => { assert.ok(d.video.framesDecoded < 900); });
});
t('control for the sound readers (known positive): without atempo the sound is 30 s under 15 s of picture, on both readers', () => {
  const r = R('noAtempo');
  near(r.audio.endPackets, 30, 0.1); near(r.audio.endDecoded, 30, 0.1); near(r.container, 30, 0.1); near(r.video.endDecoded, 15, 0.1);
});

// ---------- numbers quoted from the other build ----------
t('the 8.1.2 numbers the film speaks are the ones published in SERIES_OUTLINE.md (this container cannot run 8.1.2)', () => {
  const o = ev.otherBuild;
  assert.equal(o.measuredHere, false);
  assert.ok(row('05').includes(`ffmpeg 8.1.2 keeps ${o.ff05DefaultFrames} and the uneven gaps`)); assert.ok(row('05').includes(`${o.ff05CfrFrames} (8.1.2)`));
  assert.ok(row('33').includes(`8.1.2 keeps ${o.ff33ShortAudioFrames} (${o.ff33ShortAudioSeconds} s`));
});


// ---------- the scenes ----------
t('video/Scenes.tsx: the EV block is exactly sceneNumbers(evidence), and the 8.1.2 heads quoted from row 33 are the published ones', () => {
  const src = fs.readFileSync(path.join(here, '..', 'video', 'Scenes.tsx'), 'utf8');
  const m = src.match(EV_RE); assert.ok(m, 'EV markers');
  assert.deepEqual(JSON.parse(m[1]), JSON.parse(JSON.stringify(sceneNumbers(ev))));
  assert.ok(row('33').includes('0, 0, 1') || row('33').includes('0,0,1'), 'row 33 states the published first frames 0, 0, 1');
});

// ---------- the script ----------
const script = JSON.parse(fs.readFileSync(path.join(here, '..', 'script.json'), 'utf8'));
t('script: 14 to 18 scenes, 850 to 1050 words, estimated 5:40 to 6:50 at 148 words a minute, title within 74 characters, no em dashes, flags lowercase', () => {
  const words = script.scenes.reduce((n, s) => n + s.narration.split(/\s+/).length, 0), sec = words / 148 * 60;
  assert.ok(script.scenes.length >= 14 && script.scenes.length <= 18, `${script.scenes.length} scenes`);
  assert.ok(words >= 850 && words <= 1050, `${words} words`); assert.ok(sec >= 340 && sec <= 410, `${sec} s`);
  assert.ok(script.fullTitle.length <= 74); assert.equal(script.palette, 'swiss'); assert.equal(script.kind, 'long'); assert.equal(script.series, 'FFmpeg Reality Checks');
  assert.ok(script.thumb.label.length <= 28); assert.ok(script.scenes.every((s) => s.id && s.chapter && s.narration && s.captions.length >= 1));
  assert.ok(!/[—–]/.test(JSON.stringify(script)), 'no em or en dashes');
  assert.ok(!/-[A-Z]/.test(script.scenes.flatMap((s) => s.captions).join(' ')), 'flags lowercase');
});
t('script: every number spoken or shown is in the evidence or in a command, or is a small structural count; the build words match the builds', () => {
  const first = ev.ff25.runs.s25_near, derived = [first.byMd5[0] / first.fps];   // 12 / 25 = 0.48 s: the time of the first kept frame
  const allowed = evidenceNumbers(ev, Object.values(RECIPE).map((c) => c.command), derived);
  const bad = [];
  for (const s of script.scenes) {
    for (const n of spokenNumbers(s.narration)) {
      if (typeof n === 'string') { if (n !== '6.1.1' && n !== '8.1.2') bad.push(`${s.id}: version ${n}`); continue; }
      if (!allowed.has(n) && !STRUCTURAL.has(n)) bad.push(`${s.id}: spoken ${n}`);
    }
    for (const n of s.captions.flatMap(digitNumbers)) if (!allowed.has(n) && !STRUCTURAL.has(n)) bad.push(`${s.id}: caption ${n}`);
  }
  assert.deepEqual(bad, []);
  assert.equal(ev.build, 'v6'); // this container; the film speaks 8.1.2 only through otherBuild
});

// ---------- the distribution kit ----------
t('distribution kit: every number in the description, limits and pinned comment is in the evidence, in a command, or a small structural count; title options and tags within limits; 8.1.2 only for the published results', () => {
  const md = fs.readFileSync(path.join(here, '..', 'content', 'distribution.md'), 'utf8');
  const first = ev.ff25.runs.s25_near, derived = [first.byMd5[0] / first.fps];
  const allowed = evidenceNumbers(ev, Object.values(RECIPE).map((c) => c.command), derived);
  const body = md.split(/\r?\n/).filter((l) => !l.startsWith('#') && !/^\d\d:\d\d /.test(l) && !/^1\. |^\d\. `/.test(l) || /^\d\. [A-Z]/.test(l))
    .join('\n').replace(/episodes? \d+( and \d+)?/gi, ' ').replace(/episodes\/f[ls]\d+/g, ' ');
  const bad = digitNumbers(body).filter((n) => !allowed.has(n) && !STRUCTURAL.has(n));
  assert.deepEqual(bad, []);
  const titles = [...md.matchAll(/^\d\. `(.+?)` :/gm)].map((m) => m[1]);
  assert.ok(titles.length >= 3 && titles.every((x) => x.length <= 60), titles.map((x) => x.length).join(','));
  const tags = md.split('### Tags (15)')[1].split('###')[0].trim().split(', '); assert.equal(tags.length, 15);
  const pinned = md.split('### Pinned comment')[1].split(/\r?\n/).slice(1).join('\n').trim(); assert.ok(pinned.length <= 300, `${pinned.length} chars`);
  assert.ok(!/[\u2014\u2013]/.test(md), 'no em or en dashes');
  assert.ok(md.includes('<!-- chapters:start -->') && md.includes('<!-- chapters:end -->'));
  assert.ok(pinned.includes('6.1.1') && !pinned.includes('8.1.2'));
  for (const m of md.matchAll(/[^.\n]*8\.1\.2[^.\n]*/g)) assert.ok(/published|PC|episodes 5 and 33|not been run|Not tested|marked|Statements/i.test(m[0]), `unmarked 8.1.2 statement: ${m[0]}`);
});
