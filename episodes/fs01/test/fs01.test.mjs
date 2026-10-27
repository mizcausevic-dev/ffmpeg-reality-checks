import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
// fs01 adds no measurement of its own: it imports the fl01 fixture and re-runs it, so both cuts share one set of evidence.
import {runAll} from '../../fl01/fixture/experiment.mjs';
import {spokenNumbers, evidenceNumbers} from '../../fl01/test/numbers.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
const script = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'script.json'), 'utf8'));
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs01-')); ev = runAll(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const words = (s) => s.trim().split(/\s+/).length;
const total = () => script.scenes.reduce((a, s) => a + words(s.narration), 0);

t('every number spoken in the narration, and every number in a caption, is a number in the fl01 evidence', () => {
  const known = evidenceNumbers(ev), derived = [ev.sources.ff01.variants.input_seek_copy.packets - ev.sources.ff01.variants.input_seek_copy.decodedFrames];
  const bad = [];
  for (const sc of script.scenes) for (const n of spokenNumbers(sc.narration)) if (!known.has(n.value) && !derived.includes(n.value)) bad.push(`${sc.id}: "${n.words}" = ${n.value}`);
  for (const sc of script.scenes) for (const c of sc.captions) for (const m of c.replace(/ffmpeg 6\.1\.1/g, '').matchAll(/\d+(?:\.\d+)?/g)) if (!known.has(Number(m[0])) && !derived.includes(Number(m[0]))) bad.push(`${sc.id} caption: ${m[0]}`);
  assert.deepEqual(bad, []);
});

t('the headline numbers the short speaks are what the evidence says (exact on ffmpeg 6.1.1; on another build only the relations are asserted)', () => {
  const v = ev.sources.ff01.variants, r = ev.recipe.runs;
  assert.ok(v.output_seek_copy.decodedFrames < v.input_seek_copy.decodedFrames, 'seek after -i copy is far shorter');
  assert.ok(r.naive_copy.frames < r.reencode.frames && !r.naive_copy.verdict.exact && r.reencode.verdict.exact);
  assert.ok(r.copy_prepared.verdict.exact && r.copy_prepared.packets === r.copy_prepared.frames, 'prepared copy has no hidden packets');
  assert.ok(r.copy_on_grid.packets > r.copy_on_grid.frames, 'plain copy hides packets');
  assert.ok(ev.sources.ff32.runs.g100_copy.frames > ev.sources.ff32.runs.g100_enc.frames);
  if (ev.build === 'v6') {
    assert.equal(v.output_seek_copy.decodedFrames, 13); assert.equal(v.input_seek_copy.decodedFrames, 75); assert.equal(v.input_seek_copy.packets, 138);
    assert.equal(v.input_seek_reencode.decodedFrames, 74); assert.equal(r.naive_copy.frames, 15); assert.equal(r.naive_copy.first, 300);
    assert.equal(r.copy_on_grid.packets, 165); assert.equal(ev.recipe.ends.t3.decoded.videoFrames, 77); assert.equal(ev.recipe.ends.shortest.decoded.videoFrames, 73);
  }
});

test('length: 9 to 12 scenes and 410 to 440 words of narration', () => {
  assert.ok(script.scenes.length >= 9 && script.scenes.length <= 12, `${script.scenes.length} scenes`);
  assert.ok(total() >= 410 && total() <= 440, `${total()} words`);
});

test('duration estimate: 2:45 to 2:58 at 148 words a minute (0.6 s lead, end card tail included), and under 3:00 with the engine estimator (2.55 words a second)', () => {
  const tail = (script.endCard?.seconds ?? 10) + 0.5;
  const slow = total() / 148 * 60 + 0.6 + tail, engine = total() / 2.55 + 0.6 + tail;
  assert.ok(slow >= 165 && slow <= 178, `148 wpm estimate ${slow.toFixed(1)} s`);
  assert.ok(engine < 180, `engine estimate ${engine.toFixed(1)} s`);
});

test('format rules: no em or en dash, flags not uppercased, title limits, kicker', () => {
  assert.ok(!/[\u2014\u2013]/.test(JSON.stringify(script)));
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28);
  assert.equal(script.kicker, 'Short 01'); assert.equal(script.series, 'FFmpeg Reality Checks');
  for (const s of script.scenes) assert.ok(s.chapter && s.captions.length >= 1, s.id);
});

import {sceneFacts, factsBlock, blockRe} from '../../fl01/fixture/facts.mjs';
t('video/Scenes.tsx: the generated E block equals the block built from a fresh run of the fl01 fixture (no hand-edited or stale on-screen numbers)', () => {
  if (ev.build !== 'v6') return; // the on-screen numbers are the ffmpeg 6.1.1 numbers
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'video', 'Scenes.tsx'), 'utf8');
  assert.ok(blockRe.test(src), 'no E:start / E:end block');
  assert.equal(src.match(blockRe)[0], factsBlock(sceneFacts(ev)), 'run: node episodes/fl01/fixture/gen-facts.mjs');
});
