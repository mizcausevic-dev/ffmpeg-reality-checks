import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff07-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const off = (m) => Math.abs(m.I - ev.target.I);

t('fixture: the source is quiet (below -20 LUFS) and has a real loudness range of about 8 LU', () => {
  assert.ok(ev.source.I < -20, `${ev.source.I}`);
  assert.ok(ev.source.LRA > 7 && ev.source.LRA < 9, `${ev.source.LRA}`);
});

t('two independent meters agree on the one-pass output: loudnorm\'s own report and ebur128 differ by under 0.3 LU', () => {
  assert.ok(Math.abs(ev.onePass.loudnormReportsOutputI - ev.onePass.measured.I) < 0.3, `${ev.onePass.loudnormReportsOutputI} vs ${ev.onePass.measured.I}`);
});

t('one pass misses the target by more than the two-pass result does', () => {
  assert.ok(off(ev.onePass.measured) > off(ev.twoPass.measured), `${off(ev.onePass.measured)} vs ${off(ev.twoPass.measured)}`);
});

t('two pass with linear=true lands within 1 LU of the target, and loudnorm reports it ran in linear mode', () => {
  assert.ok(off(ev.twoPass.measured) < 1, `${off(ev.twoPass.measured)}`);
  assert.equal(ev.twoPass.type, 'linear');
});

t('one pass changes how the sound moves: loudness range shrinks by at least 2 LU', () => {
  assert.ok(ev.source.LRA - ev.onePass.measured.LRA >= 2, `${ev.source.LRA} to ${ev.onePass.measured.LRA}`);
});

t('two pass keeps the loudness range of the source, within 0.5 LU', () => {
  assert.ok(Math.abs(ev.source.LRA - ev.twoPass.measured.LRA) <= 0.5, `${ev.source.LRA} to ${ev.twoPass.measured.LRA}`);
});

t('neither result breaks the true-peak ceiling: sample peaks stay below -1.5 dBFS', () => {
  assert.ok(ev.onePass.measured.peak < -1.5 && ev.twoPass.measured.peak < -1.5);
});
