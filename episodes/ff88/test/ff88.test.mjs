import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, decodePng, encodePng, rampAlpha, rgbDiff, uvDiff, fullUV, mOf, buildOf, key, probeCenter, PROBES, KEYS, KEY, SIMS, BLENDS, W, H, NPIX, NZ} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff88-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const R = (f, s, b) => ev.runs[key(f, s, b)];
const PID = (id) => PROBES.findIndex((p) => p.id === id);
const FIRST = (f, id) => SIMS.find((s) => R(f, s, 0).probe[PID(id)] === 0) ?? Infinity; // first similarity (blend 0) that keys a probe
const KEYED_LUMA = ['key', 'bright16', 'bright40', 'dark16', 'dark20'];

t('the helpers behave: the PNG decoder reads a PNG written by an independent encoder, the ramp and the distances have the right ends, the fixture geometry, build detection', () => {
  const px = Buffer.alloc(4 * 3 * 4); for (let i = 0; i < 12; i++) { px[i * 4] = i * 20; px[i * 4 + 1] = 255 - i; px[i * 4 + 2] = (i * 37) & 255; px[i * 4 + 3] = i * 21; }
  const back = decodePng(encodePng(4, 3, px)); assert.equal(back.w, 4); assert.equal(back.h, 3); assert.ok(back.data.equals(px));
  assert.equal(rampAlpha(0.5, 0.1, 0), 255); assert.equal(rampAlpha(0.05, 0.1, 0), 0); assert.equal(rampAlpha(0.1, 0.1, 0.2), 0); assert.equal(Math.round(rampAlpha(0.2, 0.1, 0.2)), 128); assert.equal(rampAlpha(0.9, 0.1, 0.2), 255);
  assert.equal(rgbDiff([255, 255, 255], [0, 0, 0]), 1); assert.equal(rgbDiff(KEY, KEY), 0); assert.ok(Math.abs(uvDiff(255, 255) - 1) < 1e-12); assert.deepEqual(fullUV([128, 128, 128]).map(Math.round), [128, 128]);
  assert.equal(mOf(47.5, 35.5), 1); assert.equal(mOf(0, 0), 0); assert.equal(PROBES.length, 24); assert.equal(probeCenter(0), 9 * W + 8); assert.equal(probeCenter(23), 63 * W + 88);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the cards are what the fixture promises: 96x72, the soft card has 3888 pure green, 1628 edge and 1396 pure subject pixels, the noisy card 5712 green with noise of at most 24, 600 orange and 600 lime', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  const c = ev.cards; assert.equal(c.frames.length, 4); c.frames.forEach((f) => assert.equal(f.length, NPIX * 3));
  let bg = 0, edge = 0, sub = 0; for (let i = 0; i < NPIX; i++) { const m = c.softMatte[i]; if (m === 0) bg++; else if (m === 1) sub++; else edge++; }
  assert.deepEqual([bg, edge, sub], [3888, 1628, 1396]);
  const k = [0, 0, 0, 0]; let maxNz = 0;
  for (let i = 0; i < NPIX; i++) { k[c.noisyKind[i]]++; if (!c.noisyKind[i]) for (let ch = 0; ch < 3; ch++) maxNz = Math.max(maxNz, Math.abs(c.noisy[i * 3 + ch] - KEY[ch])); }
  assert.deepEqual([k[0], k[2], k[3]], [5712, 600, 600]); assert.ok(maxNz <= NZ && maxNz >= NZ - 2, `noise reaches ${maxNz}`);
  c.flat.forEach((v, i) => assert.equal(v, KEY[i % 3]));
  assert.equal(Object.keys(ev.runs).length, 4 * BLENDS.length * SIMS.length); assert.equal(Object.keys(ev.runs).length, 176);
});

t('the two readers agree: the alpha plane from alphaextract and the alpha of the PNG decoded in Node are identical in every one of the 176 runs, on all four cards', () => {
  assert.equal(ev.agree.runs, 176); assert.equal(ev.agree.mismatches, 0);
  for (const r of Object.values(ev.runs)) assert.equal(r.rawEqualsPng, true, `${r.name} ${r.sim} ${r.blend}`);
});

t('the formulas are right: colorkey equals the RGB distance model at every pixel of all four cards in all 44 runs (at most 1 level off, exactly 0 in 43 of them on 6.1.1); chromakey equals the 3x3 mean U,V model on the interior in all 88 runs of the 4:4:4 variants', () => {
  const ck = Object.values(ev.runs).filter((r) => r.name === 'colorkey'); assert.equal(ck.length, 44);
  ck.forEach((r) => assert.ok(r.modelDev <= 1, `colorkey ${r.sim} ${r.blend} off by ${r.modelDev}`));
  if (isV6()) assert.ok(ck.filter((r) => r.modelDev === 0).length >= 43);
  const ch = Object.values(ev.runs).filter((r) => r.name === 'chroma444' || r.name === 'chromayuv'); assert.equal(ch.length, 88);
  ch.forEach((r) => assert.ok(r.modelDev <= 1, `${r.name} ${r.sim} ${r.blend} off by ${r.modelDev}`));
  if (isV6()) ch.forEach((r) => assert.equal(r.modelDev, 0));
});

t('control: a card of exactly the key colour is keyed by colorkey in all 44 runs (alpha 0 everywhere) and by every filter once the similarity is 0.1 or more; a card of another colour is not keyed (the orange block stays 255 at similarity 0.1 in every filter)', () => {
  for (const r of Object.values(ev.runs).filter((x) => x.name === 'colorkey')) { assert.equal(r.flat.min, 0, key(r.name, r.sim, r.blend)); assert.equal(r.flat.max, 0); }
  for (const name of ['colorkey', 'chroma444', 'chroma420', 'chromayuv']) for (const b of BLENDS) { const r = R(name, 0.1, b); assert.equal(r.flat.max, 0, `${name} blend ${b}`); }
  for (const name of ['colorkey', 'chroma444', 'chroma420', 'chromayuv']) assert.equal(R(name, 0.1, 0).probe[PID('orange')], 255, name);
});

t('what similarity measures, part 1: chromakey ignores brightness. The key and the key moved by +16, +40, -16 and -20 on every channel have the same alpha in all 44 runs of chromakey on 4:4:4, and the same first keyed similarity', () => {
  for (const name of ['chroma444', 'chromayuv']) for (const b of BLENDS) for (const s of SIMS) {
    const p = R(name, s, b).probe, ref = p[PID('key')];
    for (const id of KEYED_LUMA) assert.equal(p[PID(id)], ref, `${name} ${s} ${b} ${id}`);
  }
  const f = KEYED_LUMA.map((id) => FIRST('chroma444', id)); assert.equal(new Set(f).size, 1, JSON.stringify(f));
});

t('what similarity measures, part 2: colorkey measures the RGB distance, so brightness counts. The first similarity that keys key+16 is above the key itself, and key+40 needs at least 0.157 (40 over 255), checked on the grid; the order follows the offset', () => {
  assert.ok(FIRST('colorkey', 'key') <= 0.01);
  assert.ok(FIRST('colorkey', 'bright16') >= 16 / 255); assert.ok(FIRST('colorkey', 'bright16') < 0.1);
  assert.ok(FIRST('colorkey', 'bright40') >= 40 / 255); assert.ok(FIRST('colorkey', 'bright40') <= 0.3);
  assert.ok(FIRST('colorkey', 'bright40') > FIRST('colorkey', 'bright16'));
  assert.ok(FIRST('colorkey', 'dark16') > FIRST('colorkey', 'key'));
  assert.ok(FIRST('colorkey', 'bright40') > FIRST('chroma444', 'bright40'), 'for a brighter green colorkey needs more than chromakey');
  if (isV6()) { assert.equal(FIRST('colorkey', 'bright16'), 0.075); assert.equal(FIRST('colorkey', 'bright40'), 0.2); assert.equal(FIRST('chroma444', 'bright40'), 0.03); }
});

t('similarity only ever removes: for blend 0 the probes keyed at a similarity stay keyed at every larger one, and the number of edge pixels kept never goes up, in colorkey and in chromakey', () => {
  for (const name of ['colorkey', 'chroma444', 'chroma420', 'chromayuv']) {
    for (let i = 0; i < PROBES.length; i++) { let keyed = false; for (const s of SIMS) { const a = R(name, s, 0).probe[i]; if (keyed) assert.equal(a, 0, `${name} ${PROBES[i].id} ${s}`); if (a === 0) keyed = true; } }
    const kept = SIMS.map((s) => R(name, s, 0).soft.edgeKept); kept.forEach((v, i) => { if (i) assert.ok(v <= kept[i - 1], `${name} ${kept}`); });
    const fr = SIMS.map((s) => R(name, s, 0).soft.fringe); fr.forEach((v, i) => { if (i) assert.ok(v <= fr[i - 1], `${name} fringe ${fr}`); });
  }
});

t('the key color is not at distance zero for chromakey (6.1.1): the card of exactly 14B43C has alpha 255 everywhere at the default similarity 0.01 and at 0.02, and 0 from 0.03; colorkey keys it at every similarity. The pixel U,V (99,66) and the key U,V (95,58) are 8.9 apart', () => {
  const flat = (name) => SIMS.map((s) => R(name, s, 0).flat.at);
  assert.deepEqual(flat('colorkey'), SIMS.map(() => 0));
  assert.equal(R('chroma444', 0.1, 0).flat.at, 0); assert.equal(R('chromayuv', 0.01, 0).flat.at, 0, 'the key given in yuv is at distance 0 on every build');
  assert.deepEqual([ev.keyYuv.u, ev.keyYuv.v], isV6() ? [99, 66] : [ev.keyYuv.u, ev.keyYuv.v]);
  if (isV6()) {
    assert.deepEqual(flat('chroma444'), [255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]); assert.deepEqual(flat('chroma420'), [255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(flat('chromayuv'), SIMS.map(() => 0)); assert.deepEqual(ev.keyFull, [95, 58]);
    assert.equal(R('chroma444', 0.01, 0).soft.levels, 1, 'nothing keyed anywhere in the soft card at the default'); assert.equal(R('chroma444', 0.01, 0).noisy.bgOpaque, 5712);
  }
});

t('the offset is not only the green card: six key colors, a flat card of exactly each. colorkey: alpha 0 for all six on every build. chromakey on 6.1.1: a distance of 6, 11, 6, 10 and 1 levels (out of 255) for the five colored keys and 0 for gray, matching the model (key converted with the full range matrix) within 1; yuv=1 gives 0 for all six', () => {
  assert.equal(ev.keys.length, 6);
  for (const k of ev.keys) {
    assert.equal(k.colorTiny, 0, k.id); assert.equal(k.yuvTiny, 0, `${k.id} with the key given in yuv`); assert.equal(k.colorAt001, 0); assert.equal(k.yuvAt001, 0);
    assert.ok(k.chromaTiny >= 0);
  }
  const g = ev.keys.find((k) => k.id === 'gray'); assert.equal(g.chromaTiny, 0); assert.deepEqual(g.pixelUV, [128, 128]);
  if (isV6()) {
    assert.deepEqual(ev.keys.map((k) => k.chromaTiny), [6, 11, 6, 10, 1, 0]);
    ev.keys.forEach((k) => assert.ok(Math.abs(k.chromaTiny - k.modelAlpha) <= 1, `${k.id} ${k.chromaTiny} vs ${k.modelAlpha}`));
    assert.deepEqual(ev.keys.map((k) => k.chromaAt[0]), [255, 255, 255, 255, 0, 0], 'at the default 0.01 four of the six key cards survive whole');
  }
});

t('the soft edge at blend 0 has at most 2 alpha levels in every filter and every similarity (nothing between 0 and 255); with blend 0.1 the number of levels is above 20 in colorkey and in chromakey at similarity 0.1, and blend 0.5 gives more levels than blend 0.1 in colorkey', () => {
  for (const name of ['colorkey', 'chroma444', 'chroma420', 'chromayuv']) for (const s of SIMS) assert.ok(R(name, s, 0).soft.levels <= 2, `${name} ${s}`);
  assert.ok(R('colorkey', 0.1, 0.1).soft.levels > 20); assert.ok(R('chroma444', 0.1, 0.1).soft.levels > 20);
  assert.ok(R('colorkey', 0.01, 0.5).soft.levels > R('colorkey', 0.01, 0.1).soft.levels);
  if (isV6()) { assert.equal(R('colorkey', 0.1, 0.1).soft.levels, 29); assert.equal(R('chroma444', 0.1, 0.1).soft.levels, 60); }
});

t('how many edge pixels survive: the edge is 1628 pixels. At similarity 0.1 and blend 0 colorkey keeps a majority of them fully opaque, and a large part of those are more than half green (the fringe); the fringe is gone only at similarity 0.3 (colorkey) or 0.2 (chromakey), where fewer edge pixels survive', () => {
  const c = R('colorkey', 0.1, 0).soft, h = R('chroma444', 0.1, 0).soft;
  assert.equal(c.edge, 1628); assert.ok(c.edgeKept > 814 && c.edgeKept === c.edgeOpaque); assert.ok(c.fringe > 300); assert.ok(h.fringe > 100);
  assert.ok(R('colorkey', 0.3, 0).soft.fringe === 0 && R('colorkey', 0.2, 0).soft.fringe > 0);
  assert.ok(R('colorkey', 0.3, 0).soft.edgeKept < c.edgeKept);
  assert.ok(R('chroma444', 0.3, 0).soft.fringe === 0);
  for (const name of ['colorkey', 'chroma444']) for (const s of SIMS.filter((x) => x <= 0.2)) assert.equal(R(name, s, 0).soft.subLost, 0, `${name} ${s} keeps the subject`);
  if (isV6()) {
    assert.deepEqual([c.edgeKept, c.fringe], [1236, 504]); assert.deepEqual([h.edgeKept, h.fringe], [1116, 384]);
    assert.equal(R('colorkey', 0.3, 0).soft.edgeKept, 556); assert.equal(R('chroma444', 0.2, 0).soft.fringe, 0);
  }
});

t('chromakey on 4:2:0 input behaves like 4:4:4 at this card: the edge pixels kept differ by under 5 percent and the flat key card is also kept at the default similarity (6.1.1)', () => {
  for (const s of SIMS) { const a = R('chroma444', s, 0).soft.edgeKept, b = R('chroma420', s, 0).soft.edgeKept; assert.ok(Math.abs(a - b) <= 0.05 * 1628, `${s}: ${a} vs ${b}`); }
  if (isV6()) assert.equal(R('chroma420', 0.01, 0).flat.at, 255);
});

t('the matte can be recovered: colorkey with similarity near 0 and blend equal to the distance between subject and key follows the true mixing fraction (more than 100 alpha levels, mean error under 2 of 255, subject kept, no pixel of the background kept); no setting of the sweep does better than that', () => {
  const m = ev.matched.colorkey;
  assert.ok(m.soft.levels > 100); assert.ok(m.soft.mae < 2); assert.equal(m.soft.subLost, 0); assert.equal(m.soft.bgKept, 0); assert.equal(m.soft.fringe, 0); assert.ok(m.blend > 0.4 && m.blend < 0.6);
  const best = Math.min(...Object.values(ev.runs).filter((r) => r.name === 'colorkey').map((r) => r.soft.mae)); assert.ok(m.soft.mae < best, `${m.soft.mae} vs ${best}`);
  if (isV6()) { assert.equal(m.soft.levels, 127); assert.equal(m.blend, 0.4883); assert.equal(m.orangeAlphaAtBlend1, 124); assert.ok(ev.matched.chroma444.soft.mae > 5); assert.equal(ev.matched.chroma444.soft.bgKept, 3888); }
});

t('noise: at the default similarity and blend nothing useful is keyed on the noisy card (colorkey leaves at least 99 percent of the 5712 background pixels opaque, chromakey all of them); in the sweep colorkey has clean settings (no speck, no subject lost) and chromakey has none', () => {
  const d1 = R('colorkey', 0.01, 0).noisy, d2 = R('chroma444', 0.01, 0).noisy;
  assert.ok(d1.bgOpaque >= 0.99 * 5712); assert.ok(d2.bgOpaque >= 0.99 * 5712);
  assert.equal(R('colorkey', 0.1, 0).noisy.bgOpaque, 0); assert.equal(R('colorkey', 0.1, 0).noisy.orangeLost + R('colorkey', 0.1, 0).noisy.limeLost, 0);
  assert.ok(ev.cleanSettings.colorkey >= 10);
  assert.ok(R('colorkey', 0.4, 0).noisy.limeLost === 600 && R('colorkey', 0.3, 0).noisy.limeLost === 0, 'the window ends where the lime is reached');
  if (isV6()) {
    assert.equal(d1.bgOpaque, 5699); assert.equal(d2.bgOpaque, 5712); assert.equal(ev.cleanSettings.colorkey, 22);
    for (const n of ['chroma444', 'chroma420', 'chromayuv']) assert.equal(ev.cleanSettings[n], 0, n);
    assert.equal(R('chroma444', 0.1, 0).noisy.bgOpaque, 69); assert.equal(R('chroma444', 0.15, 0).noisy.bgOpaque, 0); assert.equal(R('chroma444', 0.15, 0).noisy.limeLost, 52);
    assert.deepEqual(ev.windows.colorkey, ['SSSSSCCCCLL', 'SSSCCCCCLLL', 'CCCCCCCCLLL', 'CCCCCLLLLLL']);
  }
});

t('the profile through the soft edge: the ideal matte rises from 0 to 255 over 10 pixels and colorkey with the matched blend follows it within 2 levels, while blend 0 is a step', () => {
  const p = ev.profiles, ideal = p.ideal;
  assert.equal(ideal[0], 0); assert.equal(ideal[ideal.length - 1], 255); ideal.forEach((v, i) => { if (i) assert.ok(v >= ideal[i - 1]); });
  p['ck_matched'].forEach((v, i) => assert.ok(Math.abs(v - ideal[i]) <= 2, `column ${i}: ${v} vs ${ideal[i]}`));
  assert.ok(new Set(p['ck_0.1_0']).size <= 2); assert.ok(new Set(p['ck_0.1_0.1']).size > 2);
  const step = p['ck_0.1_0'].findIndex((v) => v === 255); assert.ok(step >= 0 && ideal[step] < 128, 'the step happens before the ideal matte reaches one half');
});

t('known negatives for the readers: an untouched card reads as all 255 (chromakey at the default on the soft card gives one level), and a fully keyed card reads as all 0, so the readers can tell no key from full key', () => {
  assert.equal(R('colorkey', 0.5, 0).flat.max, 0); assert.equal(R('colorkey', 0.5, 0).soft.levels, 1);
  assert.ok(R('colorkey', 0.01, 0).soft.levels >= 1 && R('colorkey', 0.01, 0).noisy.bgOpaque > 5000);
  if (isV6()) assert.equal(R('chroma444', 0.01, 0).soft.levels, 1);
});
