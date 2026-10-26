import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff14-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg not on PATH'}, fn);
const each = (fn) => { for (const [name, s] of Object.entries(ev.sources)) fn(name, s, s.variants); };

t('controls: a source compared with itself is infinite PSNR, and a 4-color palette scores below every other variant on PSNR, and below the palette variants on SSIM (so both detectors can move)', () => {
  each((name, s, v) => {
    assert.equal(s.control.psnr, Infinity, name);
    assert.equal(v.four.colors, 4, name);
    for (const k of ['default', 'palette', 'nodither']) assert.ok(v.four.psnr < v[k].psnr - 5, `${name} ${k} psnr`);
    for (const k of ['palette', 'nodither']) assert.ok(v.four.ssim < v[k].ssim - 0.4, `${name} ${k} ssim`);
  });
});

t('both sources really hold thousands of colors, far more than a GIF frame can show', () => {
  each((name, s) => assert.ok(s.sourceColors > 4000, `${name}: ${s.sourceColors}`));
});

t('the default GIF (no palette step) is clearly worse than palettegen+paletteuse: at least 5 dB more PSNR, in both sources', () => {
  each((name, s, v) => assert.ok(v.palette.psnr - v.default.psnr >= 5, `${name}: ${v.palette.psnr} vs ${v.default.psnr}`));
});

t('SSIM agrees with PSNR: the default GIF is below 0.9, the palette GIF above 0.95, in both sources', () => {
  each((name, s, v) => { assert.ok(v.default.ssim < 0.9, `${name} default ${v.default.ssim}`); assert.ok(v.palette.ssim > 0.95, `${name} palette ${v.palette.ssim}`); });
});

t('a palette built from the clip uses more of the 256 colors than the default GIF does', () => {
  each((name, s, v) => assert.ok(v.palette.colors > v.default.colors, `${name}: ${v.palette.colors} vs ${v.default.colors}`));
});

t('dither=none scores higher than the default dithering on both metrics and makes a smaller file, in both sources', () => {
  each((name, s, v) => {
    assert.ok(v.nodither.psnr > v.palette.psnr, `${name} psnr`);
    assert.ok(v.nodither.bytes < v.palette.bytes, `${name} bytes`);
  });
});
