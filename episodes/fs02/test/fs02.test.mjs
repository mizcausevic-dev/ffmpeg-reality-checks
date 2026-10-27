import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {have} from '../../../tools/ff.mjs';
import {loadEvidence} from '../fixture/experiment.mjs';
import {unknownNumbers, durations, wordCount, mmss, spokenNumbers} from '../../fl02/test/helpers.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = loadEvidence(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const here = path.dirname(fileURLToPath(import.meta.url));
const script = JSON.parse(fs.readFileSync(path.join(here, '..', 'script.json'), 'utf8'));
const long = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'fl02', 'script.json'), 'utf8'));

t('fs02 shares fl02 evidence: the ffmpeg version is recorded and the recipe, copy and no-trim cases are present', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const k of ['recipe', 'copy', 'notrim', 'control']) assert.ok(ev.recipe[k], k);
});

t('script: 9 to 12 scenes, 410 to 440 words, two captions per scene', () => {
  assert.ok(script.scenes.length >= 9 && script.scenes.length <= 12, `${script.scenes.length}`);
  const w = wordCount(script); assert.ok(w >= 410 && w <= 440, `${w} words`);
  for (const s of script.scenes) assert.equal(s.captions.length, 2, s.id);
  assert.equal(new Set(script.scenes.map((s) => s.id)).size, script.scenes.length);
});

t('script: the estimated length is 2:45 to 2:58 (words at 148 per minute plus lead and tail; and the engine word-rate estimate), under the 3:00 Shorts limit', () => {
  const d = durations(script);
  assert.ok(d.total148 >= 165 && d.total148 <= 178, `${mmss(d.total148)} at 148 wpm`);
  assert.ok(d.engine >= 165 && d.engine <= 178, `${mmss(d.engine)} by the engine estimate`);
  assert.ok(d.total148 < 180);
});

t('script: every number spoken or captioned (above ten) is in the fl02 evidence', () => {
  assert.deepEqual(unknownNumbers(script, ev), []);
});

t('script: every number the short speaks that is above ten is also spoken in the long film (one set of results, two cuts)', () => {
  const spoken = (s) => new Set(s.scenes.flatMap((x) => spokenNumbers(x.narration)));
  const L = spoken(long), missing = [...spoken(script)].filter((n) => n > 10 && !L.has(n));
  assert.deepEqual(missing, []);
});

t('script: no em or en dashes, no uppercase flags, fullTitle at most 74 characters, thumb label at most 28, same thumbnail number as fl02, Short kicker, hero scene exists', () => {
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all)); assert.ok(!/\s-[A-Z]{2,}\b/.test(all));
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28); assert.equal(script.kicker, 'Short 02'); assert.equal(script.thumb.number, long.thumb.number);
  assert.ok(script.scenes.some((s) => s.id === script.hero.scene)); assert.equal(script.series, 'FFmpeg Reality Checks');
});

t('script: the measured values the short leans on hold in this evidence (seam 2112 copy, 1088 untrimmed, 200 recipe on 6.1.1; relations elsewhere)', () => {
  const r = ev.recipe, v6 = /version 6\./.test(ev.ffmpeg);
  assert.ok(r.copy.seamGap > r.recipe.seamGap + 1900); assert.ok(Math.abs(r.recipe.seamGap - 200) <= 2);
  if (v6) { assert.equal(r.copy.seamGap, 2112); assert.equal(r.notrim.seamGap, 1088); assert.equal(r.recipe.seamGap, 200); assert.equal(r.recipe.sampleCount, 174); assert.equal(r.recipe.editMs, 4000); }
});
