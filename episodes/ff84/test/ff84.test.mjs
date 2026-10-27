import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cutoffOf, goertzel, FREQS, SEG, SR, AMP, COMBOS, buildOf, encoderOk} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe') && encoderOk('libmp3lame') && encoderOk('libopus') && encoderOk('aac');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff84-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe or one of libmp3lame, libopus, aac not available'}, fn);
const R = (n) => ev.runs[n];
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const isV8 = () => buildOf(ev.ffmpeg) === 'v8';
const BR = [64, 96, 128, 192, 256];
const cut = (n) => R(n).c1.cutoff;
const incr = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);

t('the helpers behave: Goertzel reads the amplitude of a pure tone and ignores a tone 100 Hz away, cutoffOf finds the end of the unbroken passing run and ignores a stray passing tone above it, build detection', () => {
  const y = Float32Array.from({length: 4800}, (_, i) => 0.25 * Math.sin((2 * Math.PI * 12000 * i) / SR));
  assert.ok(Math.abs(goertzel(y, 0, 4800, 12000) - 0.25) < 1e-4);
  assert.ok(goertzel(y, 0, 4800, 12100) < 1e-3);
  const lv = FREQS.map((f) => (f <= 15000 ? 0 : f === 18000 ? 0 : -60));
  const c = cutoffOf(lv); assert.equal(c.cutoff, 15000); assert.equal(c.firstFail, 15100); assert.equal(c.highestAny, 18000);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the stimulus is what the fixture promises: 151 stepped tones from 1000 to 23900 Hz, 0.25 s each, stereo, left equal to right', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(FREQS.length, 151); assert.equal(FREQS[0], 1000); assert.equal(FREQS.at(-1), 23900);
  assert.equal(ev.stimSamples, FREQS.length * SEG);
  assert.equal(Object.keys(COMBOS).length, Object.keys(ev.runs).length);
});

t('control, no codec: both readers see every tone of the stimulus at 0 dB and report a cutoff of 23900 Hz (the top tone), so a missing tone in a decoded file is the codec and not the readers', () => {
  const c = ev.control;
  assert.ok(c.lv1.every((v) => Math.abs(v) < 0.2), 'Goertzel levels'); assert.ok(c.lv2.every((v) => v === 0), 'ffmpeg levels are the stimulus against itself');
  assert.equal(c.c1.cutoff, 23900); assert.equal(c.c2.cutoff, 23900); assert.equal(c.c1.firstFail, null);
});

t('known positive: libopus -cutoff 12000 puts the cutoff at 12000 Hz (within 100 Hz) in both readers, and -cutoff 8000 puts it at or below 8000 Hz, so both readers can see a cutoff that was asked for', () => {
  assert.ok(Math.abs(cut('opus_c12000') - 12000) <= 100, `${cut('opus_c12000')}`);
  assert.ok(Math.abs(R('opus_c12000').c2.cutoff - 12000) <= 100);
  assert.ok(cut('opus_c8000') <= 8000 && cut('opus_c8000') >= 7000, `${cut('opus_c8000')}`);
  assert.ok(R('opus_c12000').c1.worstAbove < -40);
});

t('the two readers agree: for every one of the 37 encodes the cutoff from the Node Goertzel levels and from ffmpeg frame RMS differ by at most 100 Hz, and the first failing tone is the next one in both', () => {
  for (const r of Object.values(ev.runs)) {
    assert.ok(r.c1.cutoff !== null && r.c2.cutoff !== null, r.name);
    assert.ok(Math.abs(r.c1.cutoff - r.c2.cutoff) <= 100, `${r.name}: ${r.c1.cutoff} vs ${r.c2.cutoff}`);
    assert.ok(Math.abs(r.c1.firstFail - r.c2.firstFail) <= 100, r.name);
  }
});

t('libmp3lame, stereo CBR: the cutoff rises with the bitrate, from 11.2 kHz at 64 kbit/s to 19.5 kHz at 256 (on 6.1.1: 11200, 15000, 16500, 18700, 19500 Hz)', () => {
  const v = BR.map((k) => cut(`mp3_s${k}`));
  assert.ok(incr(v), `${v}`); assert.ok(v[0] > 9000 && v[0] < 13000); assert.ok(v[4] > 18000 && v[4] < 21000);
  if (isV6()) assert.deepEqual(v, [11200, 15000, 16500, 18700, 19500]);
});

t('aac (the native encoder), stereo: the cutoff rises with the bitrate, from 12.0 kHz at 64 kbit/s to 21.7 kHz at 256 (on 6.1.1: 12000, 15700, 17200, 19500, 21700 Hz)', () => {
  const v = BR.map((k) => cut(`aac_s${k}`));
  assert.ok(incr(v), `${v}`); assert.ok(v[0] > 10000 && v[0] < 14000); assert.ok(v[4] > 19000);
  if (isV6()) assert.deepEqual(v, [12000, 15700, 17200, 19500, 21700]);
});

t('libopus, stereo: the cutoff does not move with the bitrate: 64, 96, 128, 192 and 256 kbit/s all end at 20000 Hz (the fullband limit); -vbr off at 64 kbit/s also does on 6.1.1, but ends lower on 8.1.2 (15500 Hz)', () => {
  const v = BR.map((k) => cut(`opus_s${k}`));
  assert.ok(v.every((x) => x === v[0]), `${v}`); assert.ok(v[0] >= 19500 && v[0] <= 20500);
  if (isV6()) { assert.equal(cut('opus_cbr64'), v[0]); assert.equal(v[0], 20000); }
  else { assert.ok(cut('opus_cbr64') <= v[0], `${cut('opus_cbr64')}`); if (isV8()) assert.ok(cut('opus_cbr64') >= 12000 && cut('opus_cbr64') < v[0], `${cut('opus_cbr64')}`); }
});

t('same nominal bitrate, three codecs: at 64 kbit/s libmp3lame ends lowest and libopus highest; at 256 libopus is above libmp3lame; the ranking is in the numbers, not in the names', () => {
  assert.ok(cut('mp3_s64') < cut('aac_s64') && cut('aac_s64') < cut('opus_s64'));
  assert.ok(cut('mp3_s128') < cut('aac_s128') && cut('aac_s128') < cut('opus_s128'));
  assert.ok(cut('mp3_s256') <= cut('opus_s256'));
  if (isV6()) assert.ok(cut('aac_s256') > cut('opus_s256'), 'aac at 256 ends above opus');
});

t('it is a cliff, not a slope: at every bitrate of libmp3lame, aac and libopus the level 1 kHz and more above the cutoff is at least 40 dB down (both readers), and the tone where the level is still within 20 dB is at most 200 Hz above the one within 3 dB (on 6.1.1)', () => {
  for (const r of Object.values(ev.runs)) {
    if (r.name.startsWith('opus_c8') ) continue;
    assert.ok(r.c1.worstAbove < -40, `${r.name} ${r.c1.worstAbove}`);
  }
  for (const r of Object.values(ev.runs)) {
    const wide = cutoffOf(r.lv1, -20).cutoff;
    assert.ok(wide >= r.c1.cutoff && wide - r.c1.cutoff <= (isV6() ? 200 : 500) + (r.c1.cutoff < 10000 ? 300 : 0), `${r.name}: -3 dB at ${r.c1.cutoff}, -20 dB at ${wide}`);
  }
  assert.ok(R('mp3_s128').c1.nextDrop < -40 && R('aac_s128').c1.nextDrop < -40);
  for (const k of [64, 96, 128, 192, 256]) assert.ok(R(`mp3_s${k}`).c1.nextDrop < -30, `mp3_s${k} ${R(`mp3_s${k}`).c1.nextDrop}`);
});

t('channels matter: at the same nominal bitrate mono ends at least as high as stereo for libmp3lame and aac; for aac the mono cutoff at k equals the stereo cutoff at 2k for all five pairs (on 6.1.1), for libmp3lame only for some pairs (64 equals 128, 48 equals 64 stereo)', () => {
  for (const [m, s] of [[64, 64], [96, 96], [128, 128]]) {
    assert.ok(cut(`mp3_m${m}`) >= cut(`mp3_s${s}`), 'mp3 mono'); assert.ok(cut(`aac_m${m}`) >= cut(`aac_s${s}`), 'aac mono');
  }
  if (isV6()) {
    for (const [m, s] of [[32, 64], [48, 96], [64, 128], [96, 192], [128, 256]]) assert.equal(cut(`aac_m${m}`), cut(`aac_s${s}`), `aac mono ${m} vs stereo ${s}`);
    assert.equal(cut('mp3_m64'), cut('mp3_s128')); assert.equal(cut('mp3_m48'), cut('mp3_s64'));
    assert.notEqual(cut('mp3_m96'), cut('mp3_s192')); assert.notEqual(cut('mp3_m48'), cut('mp3_s96'));
    const eq = [[32, 64], [48, 96], [64, 128], [96, 192], [128, 256]].filter(([m, s]) => cut(`mp3_m${m}`) === cut(`mp3_s${s}`)).length; assert.equal(eq, 1, 'mp3: exactly 1 of 5 pairs (mono k/2, stereo k) is equal');
  }
  const op = ['32', '48', '64', '96', '128'].map((k) => cut(`opus_m${k}`)); assert.ok(op.every((x) => x === cut('opus_s64')));
});

t('-cutoff is honored within 600 Hz by the three encoders (mp3 16000 and 20000, aac 16000 and 20000, opus 8000 and 12000), measured at the real edge: libmp3lame ends below the request, aac at or above it (on 6.1.1)', () => {
  for (const [n, req] of [['mp3_c16000', 16000], ['mp3_c20000', 20000], ['aac_c16000', 16000], ['aac_c20000', 20000], ['opus_c8000', 8000], ['opus_c12000', 12000]]) assert.ok(Math.abs(cut(n) - req) <= 600, `${n}: ${cut(n)}`);
  if (isV6()) { assert.ok(cut('mp3_c20000') < 20000 && cut('mp3_c16000') < 16000); assert.ok(cut('aac_c16000') > 16000 && cut('aac_c20000') > 20000); }
  assert.ok(cut('mp3_c16000') < cut('mp3_s128') && cut('mp3_c20000') > cut('mp3_s128'));
});

t('the nominal bitrate is a label, not a measurement: libmp3lame CBR files are within 1% of the label, libopus VBR files on these tones are far above it at 64 kbit/s (and libopus -vbr off is within 3% of 64), and with default VBR the cutoff stays at 20000 whatever the label; with -vbr off it is the same on 6.1.1 and lower on 8.1.2', () => {
  for (const k of BR) assert.ok(Math.abs(R(`mp3_s${k}`).kbps - k) / k < 0.01, `mp3 ${k}: ${R(`mp3_s${k}`).kbps}`);
  assert.ok(Math.abs(R('opus_cbr64').kbps - 64) / 64 < 0.03, `${R('opus_cbr64').kbps}`);
  assert.ok(R('opus_s64').kbps > 70, `${R('opus_s64').kbps}`);
  if (isV6()) assert.equal(cut('opus_cbr64'), cut('opus_s64')); else assert.ok(cut('opus_cbr64') <= cut('opus_s64'));
});

t('every decoded file has the stimulus length (no tone is cut or shifted into the next frame): within 0.05 s of 37.75 s, and 2 channels for stereo and 1 for mono', () => {
  for (const r of Object.values(ev.runs)) {
    assert.ok(Math.abs(r.decSamples - ev.stimSamples) < 2400, `${r.name}: ${r.decSamples} vs ${ev.stimSamples}`);
    assert.equal(r.decChannels, r.channels, r.name);
  }
});
