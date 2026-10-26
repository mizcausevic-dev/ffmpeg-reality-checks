import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff19-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const run = (k) => ev.runs[k];

t('control: every stereo source has a left peak of -7.96 dB, read by both readers', () => {
  for (const s of ['same', 'anti', 'leftonly', 'diff']) { const r = run(`${s}_stereo`); near(r.astats.peakDb, -7.96, 0.05, s + ' astats'); near(r.samples.peakDb, -7.96, 0.05, s + ' samples'); }
});

t('identical channels: -ac 1 leaves the level unchanged (peak -7.96 dB)', () => {
  const r = run('same_ac1'); near(r.astats.peakDb, -7.96, 0.05, 'astats'); near(r.samples.peakDb, -7.96, 0.05, 'samples');
});

t('out-of-phase channels: -ac 1 gives digital silence, both readers see no signal at all', () => {
  const r = run('anti_ac1');
  assert.equal(r.astats.peakDb, -Infinity); assert.equal(r.samples.peakDb, -Infinity); assert.equal(r.samples.rmsDb, -Infinity);
});

t('one-sided stereo (right silent): -ac 1 is 6 dB lower than the left channel (peak -13.98 dB, RMS -16.99 dB)', () => {
  const r = run('leftonly_ac1');
  near(r.astats.peakDb, -13.98, 0.05, 'astats peak'); near(r.samples.peakDb, -13.98, 0.05, 'samples peak'); near(r.samples.rmsDb, -16.99, 0.05, 'samples rms');
  near(run('leftonly_stereo').samples.peakDb - r.samples.peakDb, 6.02, 0.05, 'drop in peak');
});

t('different tones in the two channels: -ac 1 lowers the RMS by 3 dB against one channel (-13.98 dB)', () => {
  const r = run('diff_ac1'); near(r.samples.rmsDb, -13.98, 0.05, 'rms'); near(r.astats.rmsDb, -13.98, 0.05, 'astats rms');
});

t('pan=mono|c0=c0 keeps the left channel at its own level for every source, including the out-of-phase one', () => {
  for (const s of ['same', 'anti', 'leftonly', 'diff']) { const r = run(`${s}_left`); near(r.samples.peakDb, -7.96, 0.05, s); near(r.astats.peakDb, -7.96, 0.05, s + ' astats'); }
});

t('pan=mono|c0=c0+c1 adds the channels: identical channels gain 6 dB (peak -1.94 dB), out-of-phase still cancels', () => {
  near(run('same_sum').samples.peakDb, -1.94, 0.05, 'same'); near(run('same_sum').astats.peakDb, -1.94, 0.05, 'same astats');
  assert.equal(run('anti_sum').samples.peakDb, -Infinity);
  near(run('leftonly_sum').samples.peakDb, -7.96, 0.05, 'leftonly');
});

t('the two readers agree within 0.05 dB on every file with a finite level', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    if (!Number.isFinite(r.samples.peakDb)) { assert.equal(r.astats.peakDb, r.samples.peakDb, k); continue; }
    near(r.astats.peakDb, r.samples.peakDb, 0.05, k + ' peak'); near(r.astats.rmsDb, r.samples.rmsDb, 0.05, k + ' rms');
  }
});
