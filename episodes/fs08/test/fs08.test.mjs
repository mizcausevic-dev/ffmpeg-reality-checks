import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
// fs08 adds no measurement of its own: it imports the fl08 fixture and re-runs it, so both cuts share one set of evidence.
import {runExperiment} from '../../fl08/fixture/experiment.mjs';
import {sceneFacts, factsBlock, blockRe} from '../../fl08/fixture/facts.mjs';
import {readJson, knownNumbers, checkScript, checkKit} from '../../fl08/test/numbers08.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
const script = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'script.json'), 'utf8'));
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fs08-')); ev = runExperiment(dir); } });
after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const words = (s) => s.trim().split(/\s+/).length;
const total = () => script.scenes.reduce((a, s) => a + words(s.narration), 0);
const R = () => ev.range.cases;

t('every number spoken in the narration, and every number in a caption, is a number in the fl08 evidence (this run, evidence.json or evidence-v8.json)', () => {
  assert.deepEqual(checkScript(script, knownNumbers(ev)), []);
});

t('the headline numbers the short speaks are what the evidence says (exact on ffmpeg 6.1.1; on another build only the relations are asserted)', () => {
  const F = R().full_tv.rgb, P = R().full_pc.rgb;
  assert.ok(P.distinct > F.distinct, 'tv tag collapses levels that pc keeps');
  assert.ok(R().hi1_tv.signalstats.ymax > 235 && R().lo1_tv.signalstats.ymin < 16, 'the single outlier samples');
  assert.equal(R().hi1_tv.signalstats.yPerFrame.filter(([, mx]) => mx > 235).length, 1, 'one frame of three');
  assert.ok(R().cbfull_tv.raw.umax > 235 && R().cbfull_tv.raw.ymax <= 235, 'chroma outside while luma is inside');
  if (ev.build === 'v6') {
    assert.deepEqual([F.distinct, F.columnsAtZero, F.columnsAt255, P.distinct], [220, 17, 21, 256]);
    assert.equal(R().hi1_tv.signalstats.ymax, 236); assert.equal(R().lo1_tv.signalstats.ymin, 15);
    assert.equal(R().cbfull_tv.raw.umax, 254); assert.equal(R().cbfull_tv.raw.umin, 0);
    assert.equal(ev.colordetect.exists, false); assert.equal(ev.colordetect.probe.status, 8); assert.equal(ev.colordetect.probe.noSuchFilter, true);
  }
});

test('length: 9 to 12 scenes and 410 to 440 words of narration', () => {
  assert.ok(script.scenes.length >= 9 && script.scenes.length <= 12, `${script.scenes.length} scenes`);
  assert.ok(total() >= 410 && total() <= 440, `${total()} words`);
});

test('duration estimate: 150 to 179.9 s at 2.79 words a second with a 5 s lead and the end card', () => {
  const est = total() / 2.79 + 5 + (script.endCard?.seconds ?? 10) + 0.5;
  assert.ok(est >= 150 && est < 180, `estimate ${est.toFixed(1)} s`);
});

test('format rules: no em or en dash, flags lowercase, title limits, kicker, vertical short with an end card line', () => {
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all)); assert.ok(!/ -[A-Z]/.test(all.replace(/-[A-Z][a-z]+ /g, '')));
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28);
  assert.equal(script.kicker, 'Short 08'); assert.equal(script.series, 'FFmpeg Reality Checks'); assert.equal(script.kind, 'short'); assert.equal(script.format, 'vertical');
  assert.equal(script.palette, 'riso'); assert.ok(script.endCard.line);
  assert.ok(/dash color underscore range/.test(all), 'the option is spelled out for the voice');
  for (const s of script.scenes) assert.ok(s.chapter && s.captions.length >= 1, s.id);
});

test('the short says which build each build-dependent claim is from', () => {
  const by = Object.fromEntries(script.scenes.map((s) => [s.id, s.narration.toLowerCase()]));
  assert.match(by.tag, /six point one point one/); assert.match(by.consequence, /six point one point one/);
  assert.match(by.option, /six point one point one[\s\S]*eight point one point two/); assert.match(by.missing, /six point one point one/);
  assert.match(by.full, /eight point one point two/); assert.match(by.close, /six point one point one and eight point one point two/);
});

test('distribution kit: numbers come from the evidence; 4 titles of at most 60 characters, pinned comment of at most 300, 15 tags, the description ends with #Shorts, no em dash', () => {
  const md = fs.readFileSync(path.join(import.meta.dirname, '..', 'content', 'distribution.md'), 'utf8');
  assert.deepEqual(checkKit(md, knownNumbers()), []);
  const titles = [...md.matchAll(/^\d\. `(.*?)` :/gm)].map((m) => m[1]);
  assert.equal(titles.length, 4); for (const x of titles) assert.ok(x.length <= 60, x);
  assert.ok(md.split('### Pinned comment (≤ 300 chars)\n\n')[1].trim().length <= 300);
  assert.equal(md.split('### Tags (15)\n\n')[1].split('\n')[0].split(', ').length, 15);
  assert.ok(!/[\u2014\u2013]/.test(md));
  assert.ok(md.split('### Description\n\n')[1].split('\n### Tags')[0].trim().endsWith('#Shorts'));
});

test('video/Scenes.tsx: the generated E block equals the block built from evidence.json and evidence-v8.json (no hand-edited or stale on-screen numbers)', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'video', 'Scenes.tsx'), 'utf8');
  assert.ok(blockRe.test(src), 'no E:start / E:end block');
  assert.equal(src.match(blockRe)[0], factsBlock(sceneFacts(readJson('evidence.json'), readJson('evidence-v8.json'))), 'run: node episodes/fl08/fixture/gen-facts.mjs');
});
