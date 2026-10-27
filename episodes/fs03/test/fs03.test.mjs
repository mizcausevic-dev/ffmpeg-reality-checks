// Short 03: the 1080x1920 cut of fl03. It measures nothing new: the evidence is fl03's experiment, run live again here.
// The tests check that every number the short says is in that evidence (and exact on 6.1.1), that its length fits a Short, and that its copy is within the limits.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';
import {accountFor, checkClaim, captionNumbers, claimValues, readScript, evidenceNumbers, copyNumbers} from '../../fl03/fixture/claims.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs03-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const script = () => readScript('fs03');
const words = (s) => s.scenes.reduce((a, x) => a + x.narration.trim().split(/\s+/).length, 0);

t('the evidence is fl03\'s: ffmpeg -version is recorded and the six source experiments, the recipe and the label-only finding are all there', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const k of ['ff17', 'ff22', 'ff26', 'ff44', 'ff76', 'ff85', 'recipe', 'labelOnly']) assert.ok(ev[k], k);
});
t('script: 9 to 12 scenes, 410 to 440 words, kicker "Short 03", title of at most 74 characters, thumb, no em dashes, unique scene ids, hero scene exists', () => {
  const s = script(), w = words(s);
  assert.ok(s.scenes.length >= 9 && s.scenes.length <= 12, `${s.scenes.length} scenes`);
  assert.ok(w >= 410 && w <= 440, `${w} words`);
  assert.equal(s.kicker, 'Short 03'); assert.equal(s.series, 'FFmpeg Reality Checks'); assert.ok(s.fullTitle.length <= 74);
  assert.ok(s.thumb.number && s.thumb.label.length <= 28 && ['red', 'cyan', 'amber', 'green'].includes(s.thumb.color));
  assert.equal(new Set(s.scenes.map((x) => x.id)).size, s.scenes.length); assert.ok(s.scenes.some((x) => x.id === s.hero.scene));
  const all = JSON.stringify(s); assert.equal(all.includes('\u2014'), false); assert.equal(all.includes('\u2013'), false);
});
t('script: the estimate at 148 words a minute is 2:45 to 2:58 for the narration, and with the 0.6 s lead and the end card hold the Short stays under the 3:00 limit', () => {
  const s = script(), sec = (words(s) / 148) * 60;
  assert.ok(sec >= 165 && sec <= 178, `${sec.toFixed(1)} s`);
  const total = sec + 0.6 + (s.endCard.seconds ?? 10) + 0.5;
  assert.ok(total <= 178, `${total.toFixed(1)} s with the end card`);
  // the engine's own estimate (2.55 words a second) is shorter still
  assert.ok(words(s) / 2.55 + 0.6 + (s.endCard.seconds ?? 10) + 0.5 <= 180);
});
t('script: every number word in the narration is a claim read from the live evidence (exact on 6.1.1), a format or build label, or a structural count', (ctx) => {
  if (ev.build !== 'v6') { ctx.skip('exact spoken numbers are asserted on ffmpeg 6.1.1 only'); return; }
  let spoken = 0;
  for (const sc of script().scenes) {
    const {used, uncovered} = accountFor(sc.narration, sc.id);
    assert.deepEqual(uncovered, [], `${sc.id}: number words not accounted for`);
    for (const c of used) { spoken++; checkClaim(c, ev).forEach((x, i) => assert.ok(x.ok, `${sc.id}: "${c.phrase}" should be ${JSON.stringify(c.value)}, evidence ${i} gives ${JSON.stringify(x.got)}`)); }
  }
  assert.ok(spoken >= 20, `${spoken} measured numbers spoken`);
});
t('script: every digit in the captions is a measured value too', (ctx) => {
  if (ev.build !== 'v6') { ctx.skip('exact numbers are asserted on ffmpeg 6.1.1 only'); return; }
  const allowed = claimValues(); for (const n of [1, 2, 3, 6, 601, 709, 2020, 420, 444, 422]) allowed.add(n);
  for (const sc of script().scenes) for (const line of sc.captions) for (const n of captionNumbers(line)) assert.ok(allowed.has(n), `${sc.id}: "${line}" has ${n}`);
});
t('script: the idea chain is the one of fl03 (label or pixels): it names the recipe command and the three label-only commands', () => {
  const text = script().scenes.map((x) => x.narration).join(' ').toLowerCase();
  for (const phrase of ['scale with out color matrix equals bt seven oh nine and out range equals t v', 'dash colorspace', 'dash color range p c', 'colorspace filter with i all', 'f f probe', 'label', 'pixels']) assert.ok(text.includes(phrase), phrase);
  assert.equal(ev.labelOnly.rangeBsf && ev.labelOnly.transfer, true);
});
const root = new URL('../../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const section = (md, head) => { const m = new RegExp(`### ${head}[^\\n]*\\n\\n([\\s\\S]*?)(?=\\n### |$)`).exec(md); return m ? m[1].trim() : ''; };
t('copy: titles at most 60 characters, 15 tags, pinned comment at most 300 and naming 6.1.1, one line hook first, #Shorts last, every number in the evidence', () => {
  const md = read('fs03/content/distribution.md');
  const titles = [...section(md, 'Title options').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  assert.ok(titles.length >= 3 && titles.every((x) => x.length <= 60));
  assert.equal(section(md, 'Tags').split(',').length, 15);
  const pin = section(md, 'Pinned comment'); assert.ok(pin.length <= 300); assert.match(pin, /6\.1\.1/);
  const desc = section(md, 'Description'); assert.ok(desc.split('\n')[0].length < 200 && desc.trim().endsWith('#Shorts'));
  assert.equal(md.includes('\u2014'), false);
  const allowed = evidenceNumbers(ev);
  for (const text of [md, read('fs03/outline-row.md')]) for (const n of copyNumbers(text)) assert.ok(allowed.has(n), `${n} is not in the evidence`);
});
