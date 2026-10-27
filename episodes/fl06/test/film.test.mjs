// Phase B checks for the fl06 film and its distribution kit: the script, the numbers it speaks, the generated DATA block in the scene file and
// the distribution text are all tied to the two saved evidence files. No ffmpeg needed.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneData, dataBlock, dataRe} from '../fixture/scene-data.mjs';
import {rd, json, knownNumbers, unknownNumbers, wordCount, durations, mmss, mapKeys, spokenNumbers, ev6, ev8, BUILD_PHRASES} from './helpers.mjs';

const script = json('fl06', 'script.json');
const short = json('fs06', 'script.json');

test('film: script.json is the long film on the newsprint palette with the Deep dive 06 tag and a hero scene that exists', () => {
  assert.equal(script.kind, 'long'); assert.equal(script.palette, 'newsprint'); assert.equal(script.series, 'FFmpeg Reality Checks');
  assert.equal(script.tag, 'Deep dive 06'); assert.equal(script.kicker, 'Deep dive 06');
  assert.deepEqual(script.endCard, {});
  assert.ok(script.scenes.some((s) => s.id === script.hero.scene));
  assert.ok(script.thumb.number && script.thumb.label && script.thumb.color);
});

test('film: 14 to 18 scenes, 850 to 1050 words, two captions per scene, unique ids, at most 74 characters in fullTitle and 28 in the thumb label', () => {
  assert.ok(script.scenes.length >= 14 && script.scenes.length <= 18, `${script.scenes.length} scenes`);
  const w = wordCount(script); assert.ok(w >= 850 && w <= 1050, `${w} words`);
  for (const s of script.scenes) assert.equal(s.captions.length, 2, s.id);
  assert.equal(new Set(script.scenes.map((s) => s.id)).size, script.scenes.length);
  assert.ok(script.fullTitle.length <= 74, script.fullTitle); assert.ok(script.thumb.label.length <= 28);
  assert.equal(new Set(script.scenes.map((s) => s.chapter)).size, script.scenes.length, 'chapter names are unique');
});

test('film: the estimated length is inside the 330 to 440 s duration gate (words at 148 per minute, and the engine estimate)', () => {
  const d = durations(script);
  assert.ok(d.total148 >= 340 && d.total148 <= 435, `${mmss(d.total148)} at 148 wpm`);
  assert.ok(d.engine >= 340 && d.engine <= 435, `${mmss(d.engine)} by the engine estimate`);
});

test('film: no em or en dash, no uppercase flags, the flags are spoken letter by letter, the builds are spoken as six point one point one and eight point one point two', () => {
  const all = JSON.stringify(script);
  assert.ok(!/[\u2014\u2013]/.test(all)); assert.ok(!/\s-[A-Z]{2,}\b/.test(all));
  const spoken = script.scenes.map((s) => s.narration).join(' ').toLowerCase();
  assert.ok(spoken.includes('dash p r e d')); for (const p of BUILD_PHRASES) assert.ok(spoken.includes(p), p);
  assert.ok(!/-pred|ffmpeg 6\.1\.1|ffmpeg 8\.1\.2|\d/.test(script.scenes.map((s) => s.narration).join(' ')), 'narration is spelled out: no digits, no flags');
});

test('film: the build names in the narration and captions are the two builds of the evidence', () => {
  assert.match(ev6().versionHead[0], /version 6\.1\.1/); assert.match(ev8().versionHead[0], /version 8\.1\.2/);
  const d = sceneData(); assert.equal(d.builds.a.v, '6.1.1'); assert.equal(d.builds.b.v, '8.1.2');
});

test('film: every number spoken or captioned (above ten) is in the evidence of the two builds or in the scene data derived from it', () => {
  assert.deepEqual(unknownNumbers(script), []);
});

test('film: the headline numbers the film leans on are the measured ones (6.1.1 default none, 8.1.2 default paeth; gradient -98.4 %, flat +51.4 %, four-color noise +78.4 %; 0 of 96 byte matches)', () => {
  const d = sceneData();
  assert.equal(d.help.a.def, 'none'); assert.equal(d.help.b.def, 'paeth');
  assert.equal(d.sizes.smooth_gradient.pctDefault, -98.4); assert.equal(d.sizes.noisy_field.pctDefault, -38.8);
  assert.equal(d.sizes.flat.pctDefault, 51.4); assert.equal(d.sizes.four_colour_noise.pctDefault, 78.4);
  assert.equal(d.sizes.white_noise.a.default, d.sizes.white_noise.b.default);
  assert.equal(d.cross.files, 112); assert.equal(d.cross.allPixelsSame, true);
  assert.equal(d.cross.explicitSameBytes, 0); assert.equal(d.cross.explicitSameHistogram, d.cross.explicitTotal); assert.equal(d.cross.defaultSameBytes, 0);
  for (const k of Object.keys(d.sizes)) assert.deepEqual(d.sizes[k].histB.slice(0, 2).concat(d.sizes[k].histB.slice(2, 4)), [0, 1, 0, 0], `${k}: 8.1.2 row 0 is filter 1 and no sub/up/avg rows after`);
});

test('film: video/Scenes.tsx has one scene component per script scene id, the right engine entry point, and no em dash, emoji or glow', () => {
  const src = rd('fl06', 'video', 'Scenes.tsx');
  assert.deepEqual(mapKeys(src).sort(), script.scenes.map((s) => s.id).sort());
  assert.match(rd('fl06', 'video', 'index.tsx'), /makeEpisode\(timeline, scenes, 'SYNTHETIC TEST CLIP'\)/);
  const code = src.replace(dataRe, '');
  assert.ok(!/\u2014/.test(code), 'em dash'); assert.ok(!/\p{Extended_Pictographic}/u.test(code), 'emoji'); assert.ok(!/glow/i.test(code), 'glow');
});

test('film: the generated DATA block in video/Scenes.tsx equals the block built from the two evidence files (run: node episodes/fl06/fixture/gen-scene-data.mjs)', () => {
  const m = rd('fl06', 'video', 'Scenes.tsx').match(dataRe);
  assert.ok(m, 'no DATA-BEGIN / DATA-END block');
  assert.equal(m[0], dataBlock(sceneData()));
});

test('distribution (fl06, fs06): titles at most 60 characters, pinned comment at most 300, 15 tags, no em or en dash, every number is in the evidence or the scene data', () => {
  const known = knownNumbers();
  for (const id of ['fl06', 'fs06']) {
    const md = rd(id, 'content', 'distribution.md');
    const body = md.replace(/<!-- chapters:start -->[\s\S]*?<!-- chapters:end -->/, '').replace(/^#+ .*$/gm, '').replace(/\b\d+\.\d+\.\d+\b|github\.com\S+|gyan\.dev|^\d+\. /gm, ' ').replace(/\b\d+x\d+\b/g, ' ');
    const bad = [...body.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g)].map((x) => Number(x[0])).filter((n) => !(Number.isInteger(n) && n <= 10) && !known.has(n));
    assert.deepEqual([...new Set(bad)], [], `${id}: numbers not in the evidence`);
    const titles = [...md.matchAll(/^\d\. `(.*?)` :/gm)].map((x) => x[1]);
    assert.equal(titles.length, 4, id); for (const x of titles) assert.ok(x.length <= 60, `${x} (${x.length})`);
    assert.ok(md.split('### Pinned comment (≤ 300 chars)\n\n')[1].trim().length <= 300, `${id} pinned comment`);
    assert.equal(md.split('### Tags (15)\n\n')[1].split('\n')[0].split(', ').length, 15, `${id} tags`);
    assert.ok(!/[\u2014\u2013]/.test(md), `${id} dash`);
    assert.ok(/<!-- chapters:start -->\n00:00 /.test(md), `${id} chapters start at 00:00`);
  }
  const fsMd = rd('fs06', 'content', 'distribution.md');
  assert.ok(/\n#Shorts\n/.test(fsMd.split('### Description\n\n')[1].split('\n### Tags')[0]), 'the fs06 description carries #Shorts on its own line');
});

test('distribution (fl06): no claim about zlib as the cause; the second cause is stated as different builds', () => {
  const md = rd('fl06', 'content', 'distribution.md') + rd('fs06', 'content', 'distribution.md');
  assert.ok(!/because of zlib|caused by zlib|zlib version (changed|differs)/i.test(md));
  assert.ok(/not tested/i.test(md));
});

test('outline rows exist for fl06 and fs06 and name the builds and what was not tested', () => {
  for (const id of ['fl06', 'fs06']) {
    const r = rd(id, 'outline-row.md');
    assert.ok(r.startsWith(`| ${id} |`), id); assert.ok(r.includes('6.1.1') && r.includes('8.1.2'), id); assert.ok(/not tested/i.test(r), id);
    assert.ok(!/[\u2014\u2013]/.test(r), `${id} dash`);
  }
});

test('spoken-number parser: thousands, decimals and the build phrases (self-check)', () => {
  assert.deepEqual(spokenNumbers('thirty thousand three hundred twenty four bytes, ninety eight point four percent'), [30324, 98.4]);
  assert.deepEqual(spokenNumbers('on six point one point one it is one hundred twelve files'), [112]);
  assert.equal(knownNumbers().has(30324), true);
});
