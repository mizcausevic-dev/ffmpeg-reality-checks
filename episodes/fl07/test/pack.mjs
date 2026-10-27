// The checks that make a script, a Scenes.tsx and a distribution kit agree with the evidence. Used by fl07 and fs07 (the short adds no measurement of its own).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {sceneFacts, factsBlock, blockRe} from '../fixture/facts.mjs';
import {spokenNumbers, evidenceNumbers} from './numbers.mjs';

const EP = path.join(import.meta.dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const evA = () => readJson(path.join(EP, 'fl07', 'evidence-6.1.1.json'));
export const evB = () => readJson(path.join(EP, 'fl07', 'evidence-8.1.2.json'));
const SPEC = {fl07: {kind: 'long', words: [850, 1050], scenes: [14, 18], kicker: 'Deep dive 07'}, fs07: {kind: 'short', words: [410, 440], scenes: [9, 12], kicker: 'Short 07'}};

function known() {
  const k = evidenceNumbers(evA()); evidenceNumbers(evB(), k);
  const f = sceneFacts(evA(), evB());
  evidenceNumbers(f, k); k.add(Number(f.a.svt)); k.add(Number(f.b.svt));
  return k;
}
export function packTests(id) {
  const spec = SPEC[id], dir = path.join(EP, id);
  const script = readJson(path.join(dir, 'script.json'));
  test(`${id} script: ${spec.kind} film, phosphor palette, ${spec.scenes.join(' to ')} scenes, ${spec.words.join(' to ')} words, titles and labels within limits, no em dash, lowercase flags`, () => {
    assert.equal(script.kind, spec.kind); assert.equal(script.palette, 'phosphor'); assert.equal(script.kicker, spec.kicker);
    const n = script.scenes.length; assert.ok(n >= spec.scenes[0] && n <= spec.scenes[1], `scenes ${n}`);
    assert.equal(new Set(script.scenes.map((s) => s.id)).size, n);
    const words = script.scenes.reduce((s, x) => s + x.narration.split(/\s+/).filter(Boolean).length, 0);
    assert.ok(words >= spec.words[0] && words <= spec.words[1], `words ${words}`);
    assert.ok(script.fullTitle.length <= 74 && script.thumb.label.length <= 28 && ['red', 'cyan', 'amber', 'green'].includes(script.thumb.color));
    for (const s of script.scenes) { assert.ok(s.captions.length >= 1 && s.captions.every((c) => c.length <= 48), `${s.id} captions`); }
    if (spec.kind === 'short') assert.ok(script.endCard.line && script.endCard.seconds);
    const all = JSON.stringify(script);
    assert.ok(!/[—–]/.test(all), 'no em or en dash');
    assert.ok(!/ -[A-Z]/.test(all.replace(/-[A-Z][a-z]+ /g, '')), 'flags are lowercase');
  });
  test(`${id} script: every number spoken in the narration, and every number in a caption, is a number in the 6.1.1 or 8.1.2 evidence (or derived from it in facts.mjs)`, () => {
    const k = known(), bad = [];
    for (const s of script.scenes) {
      for (const n of spokenNumbers(s.narration)) if (!k.has(n.value)) bad.push(`${s.id} spoken "${n.words}" = ${n.value}`);
      for (const c of s.captions) {
        const stripped = c.replace(/\b\d+\.\d+\.\d+\b/g, ' ').replace(/\b(?:SVT|ffmpeg) \d+\.\d+\b/g, ' ').replace(/AV1|-crf|-b:v|-g/g, ' ');
        for (const m of stripped.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g)) if (!k.has(Number(m[0]))) bad.push(`${s.id} caption "${c}" has ${m[0]}`);
      }
    }
    assert.deepEqual(bad, []);
  });
  test(`${id} script: build names are spoken (6.1.1 and 8.1.2) and the 8.1.2 SVT-AV1 bitrate error is in the story`, () => {
    const all = script.scenes.map((s) => s.narration).join(' ').toLowerCase();
    assert.match(all, /six point one point one/); assert.match(all, /eight point one point two/); assert.match(all, /target bitrate only supported|refuses/);
  });
  const sceneFile = path.join(dir, 'video', 'Scenes.tsx');
  test(`${id} video/Scenes.tsx: one scene per script id, and the generated E block equals the block built from the two evidence files (no hand-edited or stale on-screen numbers)`, { skip: fs.existsSync(sceneFile) ? false : 'Scenes.tsx not written yet' }, () => {
    const src = fs.readFileSync(sceneFile, 'utf8');
    assert.ok(blockRe.test(src), 'no E:start / E:end block');
    assert.equal(src.match(blockRe)[0], factsBlock(sceneFacts(evA(), evB())), 'run: node episodes/fl07/fixture/gen-facts.mjs');
    const ids = (/export const scenes[^=]*=\s*\{([\s\S]*?)\};/.exec(src) ?? [])[1] ?? '';
    const keys = [...ids.matchAll(/(\w+):\s*\w+/g)].map((m) => m[1]);
    assert.deepEqual([...keys].sort(), script.scenes.map((s) => s.id).sort());
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\/ E:start[\s\S]*?\/\/ E:end/, '')), 'no hex colors: use C.*');
    assert.ok(!/[—–]/.test(src), 'no em or en dash');
  });
  const dist = path.join(dir, 'content', 'distribution.md');
  test(`${id} distribution kit: numbers are in the evidence; titles at most 60, pinned comment at most 300, 15 tags; no em dash`, { skip: fs.existsSync(dist) ? false : 'distribution.md not written yet' }, () => {
    const md = fs.readFileSync(dist, 'utf8'), k = known();
    const body = md.replace(/<!-- chapters:start -->[\s\S]*?<!-- chapters:end -->/, '').replace(/^# .*$/m, '').replace(/ffmpeg \d+\.\d+\.\d+|\b\d+\.\d+\.\d+\b|SVT-AV1 \d+\.\d+|AV1|github\.com\S+|^\d+\. /gm, ' ');
    const bad = [...body.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g)].map((m) => Number(m[0])).filter((n) => !k.has(n));
    assert.deepEqual([...new Set(bad)], [], 'numbers not in the evidence');
    const titles = [...md.matchAll(/^\d\. `(.*?)` :/gm)].map((m) => m[1]);
    assert.equal(titles.length, 4); for (const x of titles) assert.ok(x.length <= 60, x);
    assert.ok(md.split('### Pinned comment (≤ 300 chars)\n\n')[1].trim().length <= 300);
    assert.equal(md.split('### Tags (15)\n\n')[1].split('\n')[0].split(', ').length, 15);
    assert.ok(!/[—–]/.test(md), 'no em or en dash');
    if (spec.kind === 'short') assert.ok(md.split('### Description\n\n')[1].split('\n### Tags')[0].trim().endsWith('#Shorts'), 'short description ends with #Shorts');
  });
}
