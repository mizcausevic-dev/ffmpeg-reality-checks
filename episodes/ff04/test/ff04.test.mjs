import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff04-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const each = (fn) => { for (const [name, c] of Object.entries(ev.clips)) fn(name, c, Object.fromEntries(c.rows.map((r) => [r.preset, r]))); };

t('fixture: both references hold 250 frames, and the SSIM detector scores a file against itself as exactly 1', () => {
  each((name, c) => { assert.equal(c.refFrames, 250, name); assert.equal(c.ssimSelf, 1, name); });
});

t('every preset keeps all 250 frames and yuv420p, so only size, quality and time differ', () => {
  each((name, c) => { assert.equal(c.rows.length, 8); for (const r of c.rows) { assert.equal(r.frames, 250, `${name} ${r.preset}`); assert.equal(r.pixFmt, 'yuv420p'); } });
});

t('at the same CRF the quality barely moves: SSIM spread across all presets is under 0.02 and every score is above 0.97', () => {
  each((name, c) => { const s = c.rows.map((r) => r.ssim); assert.ok(Math.max(...s) - Math.min(...s) < 0.02, name); assert.ok(Math.min(...s) > 0.97, name); });
});

t('ultrafast is the largest file and the fastest encode, on both clips', () => {
  each((name, c, by) => {
    for (const r of c.rows) if (r.preset !== 'ultrafast') { assert.ok(by.ultrafast.bytes > r.bytes, `${name} bytes vs ${r.preset}`); assert.ok(by.ultrafast.ms < r.ms, `${name} time vs ${r.preset}`); }
  });
});

t('the time cost is real: slower takes at least 3 times as long as ultrafast, on both clips', () => {
  each((name, c, by) => assert.ok(by.slower.ms > 3 * by.ultrafast.ms, `${name}: ${by.slower.ms} vs ${by.ultrafast.ms}`));
});

t('size is not monotonic along the preset ladder: some slower preset gives a bigger file than a faster one, on both clips', () => {
  each((name, c) => {
    const b = c.rows.map((r) => r.bytes);
    let rose = false;
    for (let i = 1; i < b.length; i++) if (b[i] > b[i - 1]) rose = true;
    assert.ok(rose, `${name}: ${b.join(' > ')} never rises`);
  });
});

t('veryfast gives a smaller file than medium, on both clips', () => {
  each((name, c, by) => assert.ok(by.veryfast.bytes < by.medium.bytes, `${name}: ${by.veryfast.bytes} vs ${by.medium.bytes}`));
});
