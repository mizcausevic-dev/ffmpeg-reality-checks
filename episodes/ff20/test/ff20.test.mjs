import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, RATES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff20-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const within = (a, b, pct, msg) => assert.ok(Math.abs(a - b) <= b * pct, `${msg}: ${a} vs ${b} (+/-${pct * 100}%)`);
const R = (k) => ev.runs[k];

t('control: the mp3 encoder writes a fixed 128 kbps for stereo and 64 kbps for mono, and both readers agree', () => {
  within(R('mp3_stereo').declared.bitRate, 128000, 0.01, 'mp3 stereo declared'); within(R('mp3_stereo').measured.bitRate, 128000, 0.01, 'mp3 stereo measured');
  within(R('mp3_mono').declared.bitRate, 64000, 0.01, 'mp3 mono declared'); within(R('mp3_mono').measured.bitRate, 64000, 0.01, 'mp3 mono measured');
});

t('stereo noise with no -b:a comes out near 128 kbps at every sample rate from 22.05 to 48 kHz', () => {
  for (const rate of RATES) { const r = R(`aac_stereo_${rate}`); within(r.declared.bitRate, 128000, 0.02, `declared ${rate}`); within(r.measured.bitRate, 128000, 0.02, `measured ${rate}`); }
});

t('mono noise with no -b:a comes out near 69 kbps at every sample rate: not 64, and not half of stereo', () => {
  for (const rate of RATES) { const r = R(`aac_mono_${rate}`); within(r.declared.bitRate, 69300, 0.02, `declared ${rate}`); within(r.measured.bitRate, 69300, 0.02, `measured ${rate}`); }
  const ratio = R('aac_mono_44100').declared.bitRate / R('aac_stereo_44100').declared.bitRate;
  assert.ok(ratio > 0.52 && ratio < 0.56, `mono is ${ratio.toFixed(3)} of stereo, not 0.5`);
});

t('digital silence costs about 2 kbps with no -b:a: the default is a target the encoder only fills when there is sound to code', () => {
  const r = R('aac_stereo_silence'); assert.ok(r.declared.bitRate < 4000, `declared ${r.declared.bitRate}`); assert.ok(r.measured.bitRate < 4000, `measured ${r.measured.bitRate}`);
});

t('an explicit -b:a 96k is honored for stereo and mono, to within 1%', () => {
  for (const k of ['aac_stereo_96k', 'aac_mono_96k']) { within(R(k).declared.bitRate, 96000, 0.01, k + ' declared'); within(R(k).measured.bitRate, 96000, 0.01, k + ' measured'); }
});

t('the two readers agree within 1% on every file', () => {
  for (const [k, r] of Object.entries(ev.runs)) within(r.declared.bitRate, r.measured.bitRate, 0.01, k);
});
