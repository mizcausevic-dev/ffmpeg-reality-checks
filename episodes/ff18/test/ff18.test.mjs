import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff18-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

t('control: the source is a 2 s sine at -3 dBFS with nothing at full scale, read by both readers', () => {
  const s = ev.source;
  assert.equal(s.samples, 96000); near(s.peakDb, -3, 0.05, 'raw peak'); near(s.astats.peakDb, -3, 0.05, 'astats peak');
  assert.equal(s.atFullScale, 0); assert.equal(s.astats.flat, 0);
});

t('control: -6 dB and +3 dB do not clip (the +3 dB peak is just under full scale)', () => {
  for (const k of ['minus6', 'plus3']) {
    const r = ev.runs[k];
    assert.equal(r.samples.atFullScale, 0, k); assert.equal(r.astats.flat, 0, k);
  }
  near(ev.runs.minus6.samples.peakDb, -9, 0.05, 'minus6 peak');
  assert.ok(ev.runs.plus3.samples.peak >= 32700 && ev.runs.plus3.samples.peak < 32767, 'plus3 peak just under full scale');
});

t('known positive: +6 dB clips about half of all samples, +12 dB about three quarters, and astats sees the flat tops', () => {
  const six = ev.runs.plus6, twelve = ev.runs.plus12;
  near(six.samples.share, 0.5, 0.02, '+6 share'); near(twelve.samples.share, 0.77, 0.02, '+12 share');
  assert.ok(six.astats.flat > 20 && twelve.astats.flat > six.astats.flat, `flat factors ${six.astats.flat} ${twelve.astats.flat}`);
  assert.ok(six.samples.maxErrVsSource > 10000, 'error grows once clipped');
});

t('boost then cut in ONE command restores the source exactly (the gain stage is floating point and does not clip)', () => {
  const r = ev.runs.one_command;
  assert.equal(r.samples.maxErrVsSource, 0); assert.equal(r.samples.atFullScale, 0); near(r.astats.peakDb, -3, 0.05, 'peak');
});

t('boost then cut in TWO commands with 16-bit between does not: the first file clips and the damage stays (flat tops, error about 15000)', () => {
  const r = ev.runs.two_commands;
  assert.ok(r.samples.maxErrVsSource > 10000, `max error ${r.samples.maxErrVsSource}`);
  assert.ok(r.astats.flat > 20, `flat factor ${r.astats.flat}`); near(r.astats.peakDb, -12, 0.1, 'peak is the clipped ceiling cut by 12 dB');
});

t('with a 32-bit float file between the two commands, the source comes back exactly', () => {
  const r = ev.runs.float_between;
  assert.equal(r.samples.maxErrVsSource, 0); near(r.astats.peakDb, -3, 0.05, 'peak');
});

t('alimiter with level=disabled holds the peak at the limit (-1 dB) and nothing reaches full scale', () => {
  const r = ev.runs.limiter;
  assert.equal(r.samples.atFullScale, 0); near(r.samples.peakDb, -1.01, 0.1, 'peak');
});

t('alimiter with its default level setting still puts samples at full scale on this signal', () => {
  const r = ev.runs.limiter_auto;
  assert.ok(r.samples.atFullScale > 100, `${r.samples.atFullScale} samples at full scale`); near(r.astats.peakDb, 0, 0.05, 'peak');
});

t('the two readers agree on the four plain-gain cases: flat tops in astats if and only if samples at full scale', () => {
  for (const k of ['minus6', 'plus3', 'plus6', 'plus12']) {
    const r = ev.runs[k];
    assert.equal(r.astats.flat > 5, r.samples.atFullScale > 100, `${k}: astats flat ${r.astats.flat} vs ${r.samples.atFullScale} samples`);
  }
});
