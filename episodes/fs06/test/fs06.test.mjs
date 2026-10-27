// Checks for the fs06 Short: the script, the scene file and the numbers it speaks are tied to the fl06 evidence (two builds). No ffmpeg needed.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneData, dataBlock, dataRe} from '../../fl06/fixture/scene-data.mjs';
import {rd, json, unknownNumbers, wordCount, durations, mmss, mapKeys, spokenNumbers} from '../../fl06/test/helpers.mjs';

const script = json('fs06', 'script.json');
const long = json('fl06', 'script.json');

test('fs06: script.json is a short on the newsprint palette, Short 06, with an end card line and a hero scene that exists', () => {
  assert.equal(script.kind, 'short'); assert.equal(script.palette, 'newsprint'); assert.equal(script.series, 'FFmpeg Reality Checks');
  assert.equal(script.tag, 'Short 06'); assert.equal(script.kicker, 'Short 06');
  assert.ok(script.endCard.seconds > 0 && script.endCard.line && script.endCard.line.length <= 40, 'endCard.line');
  assert.ok(script.scenes.some((s) => s.id === script.hero.scene));
  assert.notEqual(script.n, long.n);
});

test('fs06: 9 to 12 scenes, 410 to 440 words, two captions per scene, unique ids, every id is also a fl06 scene id', () => {
  assert.ok(script.scenes.length >= 9 && script.scenes.length <= 12, `${script.scenes.length}`);
  const w = wordCount(script); assert.ok(w >= 410 && w <= 440, `${w} words`);
  for (const s of script.scenes) assert.equal(s.captions.length, 2, s.id);
  assert.equal(new Set(script.scenes.map((s) => s.id)).size, script.scenes.length);
  const L = new Set(long.scenes.map((s) => s.id));
  assert.deepEqual(script.scenes.map((s) => s.id).filter((i) => !L.has(i)), []);
});

test('fs06: the estimated length is inside the 150 to 179.9 s Shorts gate (words at 148 per minute and the engine estimate, with lead and end card)', () => {
  const d = durations(script);
  assert.ok(d.total148 >= 155 && d.total148 < 179, `${mmss(d.total148)} at 148 wpm`);
  assert.ok(d.engine >= 155 && d.engine < 179, `${mmss(d.engine)} by the engine estimate`);
});

test('fs06: no em or en dash, no uppercase flags, fullTitle at most 74 characters, thumb label at most 28, flags spoken letter by letter, caption bar fits (64 characters)', () => {
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all)); assert.ok(!/\s-[A-Z]{2,}\b/.test(all));
  assert.ok(script.fullTitle.length <= 74); assert.ok(script.thumb.label.length <= 28);
  assert.ok(script.scenes.map((s) => s.narration).join(' ').toLowerCase().includes('dash p r e d'));
  for (const s of script.scenes) for (const c of s.captions) assert.ok(c.length <= 64, c);
});

test('fs06: every number spoken or captioned (above ten) is in the evidence of the two builds or the derived scene data', () => {
  assert.deepEqual(unknownNumbers(script), []);
});

test('fs06: every number the short speaks above ten is also spoken in the long film (one set of results, two cuts)', () => {
  const spoken = (s) => new Set(s.scenes.flatMap((x) => spokenNumbers(x.narration)));
  const L = spoken(long), missing = [...spoken(script)].filter((n) => n > 10 && !L.has(n));
  assert.deepEqual(missing, []);
});

test('fs06: video/Scenes.tsx has one scene per script scene id, uses makeVerticalEpisode, and has no em dash, emoji or glow', () => {
  const src = rd('fs06', 'video', 'Scenes.tsx');
  assert.deepEqual(mapKeys(src).sort(), script.scenes.map((s) => s.id).sort());
  assert.match(rd('fs06', 'video', 'index.tsx'), /makeVerticalEpisode\(timeline, scenes, 'SYNTHETIC TEST CLIP', \{guides: false\}\)/);
  const code = src.replace(dataRe, '');
  assert.ok(!/\u2014/.test(code)); assert.ok(!/\p{Extended_Pictographic}/u.test(code)); assert.ok(!/glow/i.test(code));
});

test('fs06: the generated DATA block in video/Scenes.tsx equals the block built from the two evidence files (run: node episodes/fl06/fixture/gen-scene-data.mjs)', () => {
  const m = rd('fs06', 'video', 'Scenes.tsx').match(dataRe);
  assert.ok(m, 'no DATA block');
  assert.equal(m[0], dataBlock(sceneData()));
});

test('fs06: the on-screen numbers are the measured ones (30324 and 26482 bytes, 135338 to 2229, 166220 to 101688, 4346 to 6581, 24081 to 42956, 96 files, 0 byte matches)', () => {
  const d = sceneData();
  assert.deepEqual([d.sizes.testsrc2.a.default, d.sizes.testsrc2.b.default], [30324, 26482]);
  assert.deepEqual([d.sizes.smooth_gradient.a.default, d.sizes.smooth_gradient.b.default], [135338, 2229]);
  assert.deepEqual([d.sizes.noisy_field.a.default, d.sizes.noisy_field.b.default], [166220, 101688]);
  assert.deepEqual([d.sizes.flat.a.default, d.sizes.flat.b.default], [4346, 6581]);
  assert.deepEqual([d.sizes.four_colour_noise.a.default, d.sizes.four_colour_noise.b.default], [24081, 42956]);
  assert.deepEqual([d.sizes.testsrc2.a.none, d.sizes.testsrc2.b.none], [30324, 31461]);
  assert.equal(d.cross.explicitTotal, 96); assert.equal(d.cross.explicitSameBytes, 0);
  assert.deepEqual([d.sizes.testsrc2.histA, d.sizes.testsrc2.histB], [[360, 0, 0, 0, 0], [0, 1, 0, 0, 359]]);
});

test('fs06: distribution.md is the short kit (chapters, #Shorts on its own line, link to the full film)', () => {
  const md = rd('fs06', 'content', 'distribution.md');
  assert.ok(/<!-- chapters:start -->\n00:00 /.test(md));
  const desc = md.split('### Description\n\n')[1].split('\n### Tags')[0];
  assert.ok(/\n#Shorts\n/.test(desc), '#Shorts on its own line, as in the fs02 kit');
  assert.ok(/full film/i.test(desc), 'points to the full film');
});
