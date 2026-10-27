// Shared checks of a script.json against its evidence, used by the fl05 and fs05 tests.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {candidates, leftoverNumberWords, captionNumbers, evidenceNumbers} from '../fixture/speak.mjs';

export const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
export const loadScript = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const totalWords = (script) => script.scenes.reduce((a, s) => a + words(s.narration), 0);
// Total film length: 0.6 s of lead, the speech, and the tail (end card seconds + 0.5, as tools/build-timeline.mjs computes it).
export const estimate = (script, wordsPerMinute) => 0.6 + (totalWords(script) / wordsPerMinute) * 60 + ((script.endCard ? (script.endCard.seconds ?? 10) : 1.5) + 0.5);

// Register the script tests. `t` is the test wrapper, `getEv` returns the evidence, `limits` = {words:[min,max], scenes:[min,max], seconds:[min,max]}.
export function scriptTests(t, {script, facts, idioms, getEv, limits, fullTitleMax = 74, bounds = []}) {
  t('script: word count, scene count and fullTitle length are inside the limits', () => {
    const w = totalWords(script);
    assert.ok(w >= limits.words[0] && w <= limits.words[1], `${w} words`);
    assert.ok(script.scenes.length >= limits.scenes[0] && script.scenes.length <= limits.scenes[1], `${script.scenes.length} scenes`);
    assert.ok(script.fullTitle.length <= fullTitleMax, `${script.fullTitle.length} chars`);
  });
  t('script: the duration estimate (148 words a minute, and the engine rate of 2.55 words a second) is inside the limits', () => {
    for (const wpm of [148, 2.55 * 60]) {
      const s = estimate(script, wpm);
      assert.ok(s >= limits.seconds[0] && s <= limits.seconds[1], `${wpm} wpm gives ${s.toFixed(1)} s`);
    }
  });
  t('script: no em dash anywhere, no digits in the narration, no uppercase flag spellings in captions', () => {
    const all = JSON.stringify(script);
    assert.ok(!all.includes(String.fromCharCode(0x2014)), 'em dash');
    for (const s of script.scenes) {
      assert.ok(!/\d/.test(s.narration.replaceAll('MP4', '')), `digits in narration of ${s.id}`);
      for (const c of s.captions) assert.ok(!/(^|\s)-[A-Z]/.test(c), `uppercase flag in ${s.id}: ${c}`);
    }
  });
  t('script: scene ids are unique and every scene has narration and at least one caption', () => {
    assert.equal(new Set(script.scenes.map((s) => s.id)).size, script.scenes.length);
    for (const s of script.scenes) { assert.ok(s.narration.length > 20); assert.ok(s.captions.length >= 1); }
    assert.ok(script.scenes.some((s) => s.id === script.hero.scene), 'hero scene exists');
  });
  const exactOnly = (name, fn) => t(name, () => { const ev = getEv(); if (ev.build !== 'v6') return; fn(ev); });
  exactOnly('script: every number the narration speaks is read from the evidence, and the spoken form is right (exact numbers, ffmpeg 6.1.1)', (ev) => {
    const list = facts(ev);
    for (const f of list) {
      const scene = script.scenes.find((s) => s.id === f.scene);
      assert.ok(scene, `scene ${f.scene}`);
      const ok = candidates(f.tpl, f.nums).map((x) => x.toLowerCase());
      const text = scene.narration.toLowerCase();
      assert.ok(ok.some((x) => text.includes(x)), `${f.scene}: "${f.tpl}" with ${JSON.stringify(f.nums)} is not in the narration (wanted one of ${ok.slice(0, 2).join(' | ')})`);
      if ('holds' in f) assert.ok(f.holds, `${f.scene}: relation "${f.tpl}" does not hold in the evidence`);
    }
  });
  exactOnly('script: no spoken number is left uncovered by an evidence fact or a named idiom', (ev) => {
    const list = facts(ev);
    for (const s of script.scenes) {
      const covered = [...idioms];
      for (const f of list.filter((x) => x.scene === s.id)) covered.push(...candidates(f.tpl, f.nums));
      const left = leftoverNumberWords(s.narration, covered);
      assert.deepEqual(left, [], `${s.id}: uncovered number words ${left.join(' ')}`);
    }
  });
  exactOnly('script: every number on screen (captions, thumbnail) is a number the evidence holds', (ev) => {
    const known = evidenceNumbers(ev); for (const b of bounds) known.add(String(b)); // bounds: thresholds the evidence is shown to stay under
    const check = (text, where) => { for (const n of captionNumbers(text)) assert.ok(known.has(n) || known.has(String(+n)), `${where}: ${n} is not in the evidence`); };
    for (const s of script.scenes) for (const c of s.captions) {
      // list markers "1." to "4." in the cheat sheet are our own numbering
      check(s.id === 'sheet' ? c.replace(/^\d\.\s/, '') : c, s.id);
    }
    check(script.thumb.number, 'thumb');
    check(script.fullTitle.replace(/\b4 Checks\b/, ''), 'fullTitle');
  });
}
