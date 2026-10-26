import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, ABSENT_R1, ABSENT_R2, DEFAULT_GAIN_DB, CHANNELS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff27-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const lv = (way, tone, side) => ev.runs[way].levels[tone][side];
// a tone is at level `db` when BOTH readers see it there; absent when BOTH readers see it below their floors
const at = (way, tone, side, db, msg = '') => { const s = lv(way, tone, side); near(s.r1, db, 0.05, `${way} ${tone} ${side} reader 1 ${msg}`); near(s.r2, db, 0.05, `${way} ${tone} ${side} reader 2 ${msg}`); };
const absent = (way, tone, side) => { const s = lv(way, tone, side); assert.ok(s.r1 < ABSENT_R1, `${way} ${tone} ${side} reader 1 sees ${s.r1}`); assert.ok(s.r2 < ABSENT_R2, `${way} ${tone} ${side} reader 2 sees ${s.r2}`); };
const OWN = {FL: 'L', FR: 'R', BL: 'L', BR: 'R'};
const other = (side) => (side === 'L' ? 'R' : 'L');

t('control: a stereo source through -ac 2 comes out byte for byte identical', () => {
  assert.equal(ev.stereoControl.byteIdentical, true);
});

t('control: the source tones read 0 dB against themselves, and every output has 2 channels', () => {
  assert.equal(CHANNELS.length, 6);
  for (const w of Object.values(ev.runs)) assert.equal(w.outChannels, 2);
});

t('control: pan=stereo|FL=0.5*FL|FR=0.5*FR gives exactly -6.02 dB on FL and FR, and nothing else, on both readers', () => {
  at('pan_half', 'FL', 'L', -6.02); at('pan_half', 'FR', 'R', -6.02);
  for (const tone of ['FC', 'LFE', 'BL', 'BR']) for (const side of ['L', 'R']) absent('pan_half', tone, side);
  absent('pan_half', 'FL', 'R'); absent('pan_half', 'FR', 'L');
});

t('control: pan=stereo|FL=LFE|FR=LFE makes the 50 Hz LFE tone read 0.00 dB in both outputs, so both readers can see a low tone', () => {
  at('pan_lfe', 'LFE', 'L', 0); at('pan_lfe', 'LFE', 'R', 0);
});

t('plain -ac 2: front left and front right each land on their own side at -7.66 dB (the matrix is scaled by 1 / 2.414)', () => {
  near(DEFAULT_GAIN_DB, -7.66, 0.005, 'computed');
  at('ac2', 'FL', 'L', -7.66); at('ac2', 'FR', 'R', -7.66);
  absent('ac2', 'FL', 'R'); absent('ac2', 'FR', 'L');
});

t('plain -ac 2: the center channel (dialogue) lands in both outputs at -10.67 dB', () => {
  at('ac2', 'FC', 'L', -10.67); at('ac2', 'FC', 'R', -10.67);
});

t('plain -ac 2: each surround lands on its own side at -10.67 dB and not at all on the other side', () => {
  at('ac2', 'BL', 'L', -10.67); at('ac2', 'BR', 'R', -10.67);
  absent('ac2', 'BL', 'R'); absent('ac2', 'BR', 'L');
});

t('plain -ac 2: the LFE tone is dropped, absent from both outputs on both readers', () => {
  absent('ac2', 'LFE', 'L'); absent('ac2', 'LFE', 'R');
});

t('plain -ac 2: the center is 3.01 dB below the front channels, and 10.67 dB below its own source level', () => {
  const d = lv('ac2', 'FL', 'L').r2 - lv('ac2', 'FC', 'L').r2;
  near(d, 3.01, 0.05, 'FL minus FC (reader 2)');
  near(lv('ac2', 'FL', 'L').r1 - lv('ac2', 'FC', 'L').r1, 3.01, 0.05, 'FL minus FC (reader 1)');
  near(lv('ac2', 'FC', 'L').r1, -10.67, 0.05, 'FC against source');
});

t('pan with the same coefficients (FL + 0.707*FC + 0.707*BL) is not scaled: front 0.00 dB, center and surround -3.01 dB, LFE still dropped', () => {
  at('pan_itu', 'FL', 'L', 0); at('pan_itu', 'FR', 'R', 0);
  at('pan_itu', 'FC', 'L', -3.01); at('pan_itu', 'FC', 'R', -3.01);
  at('pan_itu', 'BL', 'L', -3.01); at('pan_itu', 'BR', 'R', -3.01);
  absent('pan_itu', 'LFE', 'L'); absent('pan_itu', 'LFE', 'R');
});

t('the gap between plain -ac 2 and that pan is the same 7.66 dB on every channel that is present', () => {
  for (const [tone, side] of [['FL', 'L'], ['FR', 'R'], ['FC', 'L'], ['FC', 'R'], ['BL', 'L'], ['BR', 'R']]) {
    near(lv('pan_itu', tone, side).r2 - lv('ac2', tone, side).r2, 7.66, 0.05, `${tone} ${side} reader 2`);
    near(lv('pan_itu', tone, side).r1 - lv('ac2', tone, side).r1, 7.66, 0.05, `${tone} ${side} reader 1`);
  }
});

t('aresample=rematrix_maxval=3 removes the scaling: every level matches the pan, within 0.05 dB on both readers', () => {
  for (const tone of ['FL', 'FR', 'FC', 'BL', 'BR']) for (const side of ['L', 'R']) {
    const a = lv('maxval', tone, side), b = lv('pan_itu', tone, side);
    if (b.r2 > ABSENT_R2) { near(a.r2, b.r2, 0.05, `${tone} ${side} r2`); near(a.r1, b.r1, 0.05, `${tone} ${side} r1`); } else absent('maxval', tone, side);
  }
  absent('maxval', 'LFE', 'L'); absent('maxval', 'LFE', 'R');
});

t('aresample=lfe_mix_level=1 brings the LFE in at -12.90 dB in both outputs, and pushes front left down to -9.89 dB (2.23 dB below plain -ac 2)', () => {
  at('lfe1', 'LFE', 'L', -12.9); at('lfe1', 'LFE', 'R', -12.9);
  at('lfe1', 'FC', 'L', -12.9); at('lfe1', 'BL', 'L', -12.9);
  at('lfe1', 'FL', 'L', -9.89);
  near(lv('lfe1', 'FL', 'L').r2 - lv('ac2', 'FL', 'L').r2, -2.23, 0.05, 'front left change');
});

t('a custom pan does exactly what its coefficients say: 0.5 is -6.02 dB, 0.7 is -3.10 dB, 0.3 is -10.46 dB, and the LFE reaches both sides', () => {
  const db = (g) => 20 * Math.log10(g);
  at('pan_mix', 'FL', 'L', db(0.5)); at('pan_mix', 'FR', 'R', db(0.5));
  at('pan_mix', 'FC', 'L', db(0.7)); at('pan_mix', 'FC', 'R', db(0.7));
  at('pan_mix', 'BL', 'L', db(0.3)); at('pan_mix', 'BR', 'R', db(0.3));
  at('pan_mix', 'LFE', 'L', db(0.5)); at('pan_mix', 'LFE', 'R', db(0.5));
  absent('pan_mix', 'BL', 'R'); absent('pan_mix', 'BR', 'L');
});

t('why the default is scaled: full-scale-ish sound in FL, FC and BL peaks at -1.94 dB with -ac 2, but the unscaled pan clips (peak 0 dB, clipped samples)', () => {
  const c = ev.clip;
  near(c.ac2.astatsPeakDb, -1.94, 0.05, 'ac2 astats'); near(c.ac2.rawPeakDb, -1.94, 0.05, 'ac2 raw'); assert.equal(c.ac2.clippedSamples, 0);
  near(c.pan_itu.astatsPeakDb, 0, 0.05, 'pan astats'); near(c.pan_itu.rawPeakDb, 0, 0.05, 'pan raw'); assert.ok(c.pan_itu.clippedSamples > 0);
});

t('in 32-bit float the same pan peaks at +5.72 dB, which is 0.8 times 2.414, on both readers', () => {
  near(ev.clip.expectedUnclippedDb, 5.72, 0.005, 'computed');
  near(ev.clip.pan_itu_float.astatsPeakDb, 5.72, 0.05, 'astats'); near(ev.clip.pan_itu_float.rawPeakDb, 5.72, 0.05, 'raw');
});

t('the two readers agree within 0.05 dB on every tone that is present, and both call the others absent', () => {
  let present = 0, gone = 0;
  for (const [way, r] of Object.entries(ev.runs)) for (const [tone, s] of Object.entries(r.levels)) for (const side of ['L', 'R']) {
    const v = s[side];
    if (v.r2 > ABSENT_R2) { present++; near(v.r1, v.r2, 0.05, `${way} ${tone} ${side}`); } else { gone++; assert.ok(v.r1 < ABSENT_R1, `${way} ${tone} ${side}: reader 1 ${v.r1} but reader 2 ${v.r2}`); }
  }
  assert.ok(present >= 30 && gone >= 40, `${present} present, ${gone} absent`);
});
