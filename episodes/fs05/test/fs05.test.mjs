import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';
import {shortFacts} from '../fixture/facts.mjs';
import {IDIOMS} from '../../fl05/fixture/facts.mjs';
import {scriptTests, loadScript, words, totalWords} from '../../fl05/test/support.mjs';

const hasX265 = () => (spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {encoding: 'utf8'}).stdout ?? '').includes('libx265');
const ok = have('ffmpeg') && have('ffprobe') && hasX265();
let ev;
before(async () => { if (ok) ev = await runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs05-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg, ffprobe or libx265 not available'}, fn);

const script = loadScript(new URL('../script.json', import.meta.url));
const long = loadScript(new URL('../../fl05/script.json', import.meta.url));

t('the short reuses the evidence of the long film: same runExperiment, ffmpeg version recorded, all four source claims and the composite are present', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version/);
  for (const k of ['ff02', 'ff03', 'ff09', 'ff31']) assert.ok(ev.sources[k], k);
  for (const k of ['naive264', 'strict264', 'recipe264', 'naive265', 'recipe265']) assert.ok(ev.composite.cases[k], k);
});
t('the recipe the short ends on holds in the evidence: recipe264 is High, yuv420p, even size, moov first on two readers; the naive command is 4:4:4, odd and moov last', () => {
  const r = ev.composite.cases.recipe264, n = ev.composite.cases.naive264;
  assert.equal(r.probe.profile, 'High'); assert.equal(r.entry.chromaFormatIdc, 1); assert.equal(r.probe.width % 2, 0); assert.equal(r.probe.height % 2, 0); assert.equal(r.order[1], 'moov'); assert.equal(r.traceOrder[1], 'moov');
  assert.equal(n.probe.pixFmt, 'yuv444p'); assert.equal(n.entry.chromaFormatIdc, 3); assert.equal(n.probe.width % 2, 1); assert.equal(n.order.at(-1), 'moov');
});
scriptTests(t, {script, facts: shortFacts, idioms: IDIOMS, getEv: () => ev, limits: {words: [410, 440], scenes: [9, 12], seconds: [165, 178]}});
t('short: vertical-safe copy: every caption is at most 40 characters, and the short never speaks a number the long film does not', () => {
  for (const s of script.scenes) for (const c of s.captions) assert.ok(c.length <= 40, `${s.id}: ${c.length} chars: ${c}`);
  assert.ok(totalWords(script) < totalWords(long));
  assert.equal(script.series, long.series); assert.equal(script.kicker, 'Short 05'); assert.ok(script.fullTitle.length <= 74);
  assert.ok(script.thumb.label.length <= 28);
});
t('short: no scene narration is copied from the long film (own wording), and every scene has real narration', () => {
  const longNarr = new Set(long.scenes.map((s) => s.narration));
  for (const s of script.scenes) assert.ok(!longNarr.has(s.narration), s.id);
  assert.ok(script.scenes.every((s) => words(s.narration) > 20));
});
