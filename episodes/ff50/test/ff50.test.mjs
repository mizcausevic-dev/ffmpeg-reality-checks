import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, aliasOf, buildOf, nodeDb, nodePeak, SWEEP, DIAL, CTL_HZ, ALIAS_HZ, SR_IN, SR_OUT, NYQ_OUT, AMP} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff50-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const ROWS = () => [['ctl', ev.ctl], ...SWEEP.map((f) => [`sweep${f}`, ev.sweep[f]]), ['naive', ev.naive], ...DIAL.map((n) => [`dial${n}`, ev.dial[n]])];

t('the helpers behave: aliasOf folds a tone about the new Nyquist, the Node reader reads a synthetic sine at the right level and finds its frequency, build detection', () => {
  assert.equal(aliasOf(20000), 4000); assert.equal(aliasOf(12100), 11900); assert.equal(aliasOf(6000), 6000);
  const x = new Float32Array(48000); for (let i = 0; i < x.length; i++) x[i] = 0.5 * Math.sin(2 * Math.PI * 5000 * i / 24000);
  near(nodeDb(x, 24000, 5000), 20 * Math.log10(0.5 / Math.SQRT2), 0.1);
  near(nodePeak(x, 24000).hz, 5000, 0.5);
  assert.ok(nodeDb(x, 24000, 9000) < -100, 'a band with no tone reads far below the tone');
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the source is what the fixture promises: 48000 Hz, 2 s, a pure tone at amplitude 0.25 (-15.1 dB RMS) read by both readers at each of its frequencies', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.src.probe.sampleRate, SR_IN); near(ev.src.probe.duration, 2, 0.01); assert.equal(ev.src.samples, SR_IN * 2);
  near(ev.src.expectedDb, 20 * Math.log10(AMP / Math.SQRT2), 0.1);
  for (const [hz, lv] of Object.entries(ev.src.levels)) { near(lv.node, ev.src.expectedDb, 0.2, `node ${hz}`); near(lv.ffmpeg, ev.src.expectedDb, 0.5, `ffmpeg ${hz}`); }
});

t('every resampled file is 24000 Hz, mono, 2 s: the new Nyquist is 12000 Hz, so a tone above it has nowhere to live except as an alias', () => {
  assert.equal(NYQ_OUT, 12000);
  for (const [k, r] of ROWS()) { assert.equal(r.probe.sampleRate, SR_OUT, k); assert.equal(r.probe.channels, 1, k); near(r.probe.duration, 2, 0.01, k); assert.equal(r.samples, SR_OUT * 2, k); }
});

t('control: a 6000 Hz tone, inside the new band, comes out at 6000 Hz at the same level (0 dBc within 0.3 dB) by both readers, and it is the strongest thing in the file', () => {
  const r = ev.ctl;
  near(r.dbc.node, 0, 0.3); near(r.dbc.ffmpeg, 0, 0.3); near(r.peakHz, CTL_HZ, 1); near(r.peakDb, ev.src.expectedDb, 0.3);
});

t('known-positive control: decimating the 20000 Hz tone by 2 with no filter (every second sample, in Node) puts the full tone at 4000 Hz, 0 dBc within 0.3 dB, and both readers see it, so they can see an alias when there is one', () => {
  const r = ev.naive;
  assert.equal(r.readHz, 4000);
  near(r.dbc.node, 0, 0.3); near(r.dbc.ffmpeg, 0, 0.3); near(r.peakHz, 4000, 1); near(r.peakDb, ev.src.expectedDb, 0.3);
});

t('the question: a 20000 Hz tone through the default aresample=24000 leaves no usable alias at 4000 Hz: at least 90 dB below the input in both readers, and the strongest peak left in the file is 90 dB or more below the input', () => {
  const r = ev.sweep[ALIAS_HZ];
  assert.equal(r.readHz, 4000);
  assert.ok(r.dbc.node <= -90, `node ${r.dbc.node}`); assert.ok(r.dbc.ffmpeg <= -90, `ffmpeg ${r.dbc.ffmpeg}`);
  assert.ok(r.peakDb - ev.src.levels[ALIAS_HZ].node <= -90, `peak ${r.peakDb}`);
});

t('far above the new Nyquist nothing survives: tones at 14000, 16000, 20000 and 23000 Hz all leave an alias at least 90 dB below the input, in both readers', () => {
  for (const f of [14000, 16000, 20000, 23000]) { const r = ev.sweep[f]; assert.ok(r.dbc.node <= -90, `${f} node ${r.dbc.node}`); assert.ok(r.dbc.ffmpeg <= -90, `${f} ffmpeg ${r.dbc.ffmpeg}`); }
});

t('just above the new Nyquist the alias is real: a 12100 Hz tone comes back at 11900 Hz within 30 dB of the input (both readers), the strongest peak of the file is at 11900 Hz, and the two readers agree within 1.5 dB', () => {
  const r = ev.sweep[12100];
  assert.equal(r.readHz, 11900);
  assert.ok(r.dbc.node > -30, `node ${r.dbc.node}`); assert.ok(r.dbc.ffmpeg > -30, `ffmpeg ${r.dbc.ffmpeg}`);
  near(r.peakHz, 11900, 2); near(r.dbc.node, r.dbc.ffmpeg, 1.5);
});

t('the alias fades with distance from the new Nyquist, in both readers: 12100 Hz is louder than 12500 Hz, which is louder than 13000 Hz, which is louder than 14000 Hz', () => {
  for (const reader of ['node', 'ffmpeg']) {
    const v = [12100, 12500, 13000, 14000].map((f) => ev.sweep[f].dbc[reader]);
    assert.ok(v[0] > v[1] && v[1] > v[2] && v[2] > v[3], `${reader} ${v.join(' ')}`);
  }
  assert.ok(ev.sweep[13000].dbc.node > -60, 'a 13000 Hz tone still leaves an alias above -60 dBc');
});

t('the alias lands where folding predicts: the strongest peak of each file is at 24000 minus the tone frequency, within 2 Hz, for the three tones that leave a measurable alias (12100, 12500, 13000 Hz)', () => {
  for (const f of [12100, 12500, 13000]) near(ev.sweep[f].peakHz, 24000 - f, 2, String(f));
});

t('the filter is what removes the alias: filter_size 1, 2, 4 and 8 give an alias level that falls with every step (about -7, -16, -31, -88 dBc), the default (32) is at least 90 dB down, and filter_size=1 is still above -20 dBc, in both readers', () => {
  for (const reader of ['node', 'ffmpeg']) {
    const v = [1, 2, 4, 8].map((n) => ev.dial[n].dbc[reader]);
    assert.ok(v[0] > v[1] && v[1] > v[2] && v[2] > v[3], `${reader} ${v.join(' ')}`);
    assert.ok(v[0] > -20, `${reader} filter_size=1 ${v[0]}`);
    assert.ok(ev.dial[32].dbc[reader] <= -90, `${reader} default ${ev.dial[32].dbc[reader]}`);
  }
  near(ev.dial[32].dbc.node, ev.sweep[ALIAS_HZ].dbc.node, 0.1, 'filter_size=32 is the default');
  assert.equal(ev.dial[32].md5, ev.sweep[ALIAS_HZ].md5);
});

t('three ways to ask for 24000 Hz give the same samples: -ar 24000, aresample=24000 and aformat=sample_rates=24000 (identical sample hash)', () => {
  assert.equal(ev.routes.ar, ev.routes.aresample); assert.equal(ev.routes.aformat, ev.routes.aresample);
});

t('reader agreement: wherever the alias is above -90 dBc (the control, the naive decimation, 12100 to 13000 Hz, filter_size 1 to 8) the Node FFT and the ffmpeg bandpass with astats agree within 1.5 dB', () => {
  let n = 0;
  for (const [k, r] of ROWS()) if (r.dbc.node > -90) { near(r.dbc.node, r.dbc.ffmpeg, 1.5, k); n++; }
  assert.ok(n >= 9, `only ${n} rows were compared`);
});

t('below -90 dBc the ffmpeg reader meets its own noise floor, so the film says "90 dB down or better" and quotes both readers: the Node reader is the more sensitive one and never reads above the ffmpeg reader there', () => {
  for (const f of [14000, 16000, 20000, 23000]) { const r = ev.sweep[f]; assert.ok(r.dbc.node <= r.dbc.ffmpeg + 0.5, `${f}: node ${r.dbc.node} ffmpeg ${r.dbc.ffmpeg}`); }
});
