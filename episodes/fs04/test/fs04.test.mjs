import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, RECIPE, sceneNumbers} from '../fixture/experiment.mjs';
import {EV_RE} from '../../fl04/fixture/inject-ev.mjs';
import {spokenNumbers, digitNumbers, evidenceNumbers, STRUCTURAL} from '../../fl04/test/spoken.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs04-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const script = JSON.parse(fs.readFileSync(path.join(here, '..', 'script.json'), 'utf8'));
const long = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'fl04', 'script.json'), 'utf8'));
const words = script.scenes.reduce((n, s) => n + s.narration.split(/\s+/).length, 0);

t('script shape: 9 to 12 scenes, 410 to 440 words, estimated 2:45 to 2:58 at 148 words a minute (under the 3:00 Shorts limit), title within 74 characters, no em dashes', () => {
  const sec = words / 148 * 60;
  assert.ok(script.scenes.length >= 9 && script.scenes.length <= 12, `${script.scenes.length} scenes`);
  assert.ok(words >= 410 && words <= 440, `${words} words`); assert.ok(sec >= 165 && sec <= 178, `${sec} s`);
  assert.ok(script.fullTitle.length <= 74); assert.equal(script.kicker, 'Short 04'); assert.equal(script.palette, 'swiss'); assert.equal(script.kind, 'short'); assert.equal(script.series, 'FFmpeg Reality Checks');
  assert.ok(script.thumb.label.length <= 28); assert.ok(script.scenes.every((s) => s.id && s.chapter && s.narration && s.captions.length >= 1));
  assert.ok(!/[—–]/.test(JSON.stringify(script)), 'no em or en dashes');
  assert.ok(!/-[A-Z]/.test(script.scenes.flatMap((s) => s.captions).join(' ')), 'flags lowercase');
});

t('every number spoken or shown is in the evidence (the fl04 evidence, run live here) or in a command, or is a small structural count', () => {
  const first = ev.ff25.runs.s25_near, derived = [first.byMd5[0] / first.fps];
  const allowed = evidenceNumbers(ev, Object.values(RECIPE).map((c) => c.command), derived), bad = [];
  for (const s of script.scenes) {
    for (const n of spokenNumbers(s.narration)) {
      if (typeof n === 'string') { if (n !== '6.1.1') bad.push(`${s.id}: version ${n}`); continue; }
      if (!allowed.has(n) && !STRUCTURAL.has(n)) bad.push(`${s.id}: spoken ${n}`);
    }
    for (const n of s.captions.flatMap(digitNumbers)) if (!allowed.has(n) && !STRUCTURAL.has(n)) bad.push(`${s.id}: caption ${n}`);
  }
  assert.deepEqual(bad, []);
});

t('same numbers as the long film: every measured number in the short is also spoken in the long film', () => {
  const longNums = new Set(long.scenes.flatMap((s) => spokenNumbers(s.narration)).filter((n) => typeof n === 'number'));
  const shortNums = script.scenes.flatMap((s) => spokenNumbers(s.narration)).filter((n) => typeof n === 'number' && !STRUCTURAL.has(n));
  assert.deepEqual(shortNums.filter((n) => !longNums.has(n)), []);
});

t('the key claims of the short hold in the live evidence: 900 frames vs 450 timestamps (6.1.1), the recipe gives 900 and 900, -r 10 gives 22 frames, fps=1 first frame at 0.48 s, picture 5.07 s vs audio 10.0 s, 355 frames in the loop', () => {
  assert.equal(ev.build, 'v6');
  assert.equal(ev.recipe.runs.passthrough.video.framesDecoded, 900); assert.equal(ev.recipe.runs.passthrough.stamps.packets.distinct, 450);
  assert.equal(ev.recipe.runs.recipe.video.framesDecoded, 900); assert.equal(ev.recipe.runs.recipe.stamps.decoded.distinct, 900);
  assert.equal(ev.ff16.runs.after.inside.framesDecoded, 22); assert.equal(ev.ff25.runs.s25_near.byMd5[0], 12);
  assert.ok(Math.abs(ev.ff29.runs.video.video.endPackets - 5.066) < 0.02); assert.ok(Math.abs(ev.ff29.runs.video.audio.endPackets - 10) < 0.05);
  assert.equal(ev.ff33.runs['short-enc'].video.framesDecoded, 355);
});

t('vertical safe zone planning: no scene has more than two caption lines, so the bottom 420 px and the right 140 px stay free', () => {
  assert.ok(script.scenes.every((s) => s.captions.length <= 2));
});

// ---------- the distribution kit ----------
t('distribution kit: every number in the description, limits and pinned comment is in the evidence, in a command, or a small structural count; title options and tags within limits; 8.1.2 only for the published results', () => {
  const md = fs.readFileSync(path.join(here, '..', 'content', 'distribution.md'), 'utf8');
  const first = ev.ff25.runs.s25_near, derived = [first.byMd5[0] / first.fps];
  const allowed = evidenceNumbers(ev, Object.values(RECIPE).map((c) => c.command), derived);
  const body = md.split(/\r?\n/).filter((l) => !l.startsWith('#') && !/^\d\d:\d\d /.test(l) && !/^1\. |^\d\. `/.test(l) || /^\d\. [A-Z]/.test(l))
    .join('\n').replace(/episodes? \d+( and \d+)?/gi, ' ').replace(/episodes\/f[ls]\d+/g, ' ');
  const bad = digitNumbers(body).filter((n) => !allowed.has(n) && !STRUCTURAL.has(n));
  assert.deepEqual(bad, []);
  const titles = [...md.matchAll(/^\d\. `(.+?)` :/gm)].map((m) => m[1]);
  assert.ok(titles.length >= 3 && titles.every((x) => x.length <= 60), titles.map((x) => x.length).join(','));
  const tags = md.split('### Tags (15)')[1].split('###')[0].trim().split(', '); assert.equal(tags.length, 15);
  const pinned = md.split('### Pinned comment')[1].split(/\r?\n/).slice(1).join('\n').trim(); assert.ok(pinned.length <= 300, `${pinned.length} chars`);
  assert.ok(!/[\u2014\u2013]/.test(md), 'no em or en dashes');
  assert.ok(md.includes('<!-- chapters:start -->') && md.includes('<!-- chapters:end -->'));
  assert.ok(pinned.includes('6.1.1') && !pinned.includes('8.1.2'));
  for (const m of md.matchAll(/[^.\n]*8\.1\.2[^.\n]*/g)) assert.ok(/published|PC|episodes 5 and 33|not been run|Not tested|marked|Statements/i.test(m[0]), `unmarked 8.1.2 statement: ${m[0]}`);
});

t('video/Scenes.tsx: the EV block is exactly sceneNumbers(evidence)', () => {
  const src = fs.readFileSync(path.join(here, '..', 'video', 'Scenes.tsx'), 'utf8');
  const m = src.match(EV_RE); assert.ok(m, 'EV markers');
  assert.deepEqual(JSON.parse(m[1]), JSON.parse(JSON.stringify(sceneNumbers(ev))));
});
