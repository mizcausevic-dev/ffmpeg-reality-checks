import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, buildOf, grayOf, seenOfTv, tvOfFull, graphOf, NAMES, PATCHES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg');
let ev;
before(() => { if (ok) ev = runExperiment(); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg is needed'}, fn);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const P = (s, m) => ev.patches[s][m];
const R = (s, m) => ev.ramp[s][m];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tolerance ${tol})`);
const FOUR = ['red', 'green', 'blue', 'yellow'];
const seen = (s, m, n) => P(s, m).shown[n][0];
const raw = (s, m, n) => P(s, m).native[n][0];

t('the helpers behave: the Node formulas, the range maps, build detection, the graph strings', () => {
  assert.deepEqual(FOUR.map((n) => grayOf(PATCHES[n], '601')), [76, 150, 29, 226]);
  assert.deepEqual(FOUR.map((n) => grayOf(PATCHES[n], '709')), [54, 182, 18, 237]);
  assert.equal(seenOfTv(16), 0); assert.equal(seenOfTv(235), 255); assert.equal(tvOfFull(0), 16); assert.equal(tvOfFull(255), 235);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.equal(graphOf('rgb', 'hue'), 'hue=s=0'); assert.match(graphOf('hd', 'gray'), /bt709.*format=gray$/); assert.match(graphOf('rgb', 'ccm601'), /^colorchannelmixer=0\.299:0\.587:0\.114:0:0\.299/);
});

t('ffmpeg -version is recorded, every case ran, every output frame is flat, and the nine patches come back as nine frames', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  for (const s of Object.keys(ev.patches)) for (const [m, p] of Object.entries(ev.patches[s])) { assert.equal(p.error, undefined, `${s} ${m}`); assert.equal(p.frames, 9, `${s} ${m}`); assert.equal(p.allFlat, true, `${s} ${m}`); assert.equal(R(s, m).error, undefined, `${s} ${m} ramp`); }
});

t('known positive 1: with no filter the source is read back by both readers (rgb exactly; the yuv sources within 3 levels of the colour that was put in)', () => {
  for (const n of NAMES) { assert.deepEqual(P('rgb', 'none').native[n], PATCHES[n], n); assert.deepEqual(P('rgb', 'none').shown[n], PATCHES[n], n); }
  for (const s of ['sd', 'hd']) for (const n of NAMES) PATCHES[n].forEach((v, k) => near(P(s, 'none').shown[n][k], v, 3, `${s} ${n} channel ${k}`));
  assert.equal(P('sd', 'none').fmt, 'yuv420p'); assert.equal(P('hd', 'none').fmt, 'yuv420p');
  assert.notDeepEqual(P('sd', 'none').native.green, P('hd', 'none').native.green, 'the two matrices put different numbers in the file');
});

t('known positive 2: a gray with no colour in it is the same under every method (mid gray 128, white, black, within 1 on what a viewer sees)', () => {
  for (const s of ['rgb', 'sd', 'hd']) for (const m of ['gray', 'hue', 'ccm601', 'grayYuv']) {
    near(seen(s, m, 'gray'), 128, 1, `${s} ${m} gray`); near(seen(s, m, 'white'), 255, 1, `${s} ${m} white`); near(seen(s, m, 'black'), 0, 1, `${s} ${m} black`);
  }
});

t('known positive 3: the colour mixer does what its weights say: both weight sets match the Node formula on all nine patches within 1, and the two sets are 32 levels apart on green', () => {
  for (const [m, k] of [['ccm601', '601'], ['ccm709', '709']]) for (const n of NAMES) near(seen('rgb', m, n), grayOf(PATCHES[n], k), 1, `${m} ${n}`);
  assert.ok(Math.abs(seen('rgb', 'ccm601', 'green') - seen('rgb', 'ccm709', 'green')) >= 30);
  for (const n of NAMES) { const [a, b, c] = P('rgb', 'ccm601').shown[n]; assert.ok(a === b && b === c, `${n}: the mixer output is neutral`); }
});

t('the two readers agree on every case: what a viewer sees is the stored number mapped by the range (tv: (Y - 16) x 255 / 219, pc: as it is), within 1', () => {
  for (const s of Object.keys(ev.patches)) for (const m of ['gray', 'hue', 'ccm601', 'ccm709', 'grayYuv']) {
    const p = P(s, m);
    for (const n of NAMES) {
      const stored = p.native[n][0], sv = p.shown[n][0];
      near(sv, p.range === 'tv' ? seenOfTv(stored) : stored, 1, `${s} ${m} ${n} (${p.fmt}/${p.range})`);
    }
  }
});

t('format=gray stores full-range luma: from rgb it gives red 76, green 150, blue 29, yellow 226 (the BT.601 weights), and white 255, black 0', () => {
  assert.equal(P('rgb', 'gray').fmt, 'gray'); assert.equal(P('rgb', 'gray').range, 'pc');
  for (const n of NAMES) near(raw('rgb', 'gray', n), grayOf(PATCHES[n], '601'), 1, n);
  if (isV6()) { assert.deepEqual(FOUR.map((n) => raw('rgb', 'gray', n)), [76, 150, 29, 226]); assert.equal(raw('rgb', 'gray', 'white'), 255); assert.equal(raw('rgb', 'gray', 'black'), 0); }
});

t('hue=s=0 stores the luma in video range, so the numbers differ from gray (red 81, green 145, blue 41, yellow 210, white 235, black 16) but the picture does not: seen within 1 of gray for every patch and every source', () => {
  assert.equal(P('rgb', 'hue').range, 'tv');
  for (const s of ['rgb', 'sd', 'hd']) for (const n of NAMES) { near(seen(s, 'hue', n), seen(s, 'gray', n), 1, `${s} ${n} seen`); near(raw(s, 'hue', n), tvOfFull(raw(s, 'gray', n)), 1, `${s} ${n} stored`); }
  assert.ok(raw('rgb', 'gray', 'white') - raw('rgb', 'hue', 'white') >= 20 && raw('rgb', 'hue', 'black') - raw('rgb', 'gray', 'black') >= 15, 'white 255 against 235, black 0 against 16');
  if (isV6()) { assert.deepEqual(FOUR.map((n) => raw('rgb', 'hue', n)), [81, 145, 41, 210]); for (const k of [1, 2]) for (const n of NAMES) assert.equal(P('rgb', 'hue').native[n][k], 128, 'chroma is exactly neutral'); }
});

t('format=gray then format=yuv420p, what an encode to yuv420p sees, stores the same numbers as hue=s=0 within 1', () => {
  for (const s of ['rgb', 'sd', 'hd']) for (const n of NAMES) near(raw(s, 'grayYuv', n), raw(s, 'hue', n), 1, `${s} ${n}`);
  assert.equal(P('rgb', 'grayYuv').fmt, 'yuv420p');
});

t('the mixer follows its weights, not the file: on rgb and on a BT.601 source ccm601 matches gray within 1 (red 76, green 150), and on a BT.709 source gray and hue follow the file (red 55, green 183) while ccm601 stays at red 76, green 149', () => {
  for (const s of ['rgb', 'sd']) for (const n of NAMES) near(seen(s, 'ccm601', n), seen(s, 'gray', n), 1, `${s} ${n}`);
  for (const n of NAMES) near(seen('hd', 'gray', n), grayOf(PATCHES[n], '709'), 2, `hd gray ${n}`);
  for (const n of NAMES) near(seen('hd', 'ccm709', n), seen('hd', 'gray', n), 2, `hd ccm709 ${n}`);
  const gap = (n) => Math.abs(seen('hd', 'ccm601', n) - seen('hd', 'gray', n));
  assert.ok(gap('green') >= 30 && gap('red') >= 18 && gap('blue') >= 8 && gap('yellow') >= 9, `gaps ${FOUR.map(gap)}`);
  if (isV6()) { assert.deepEqual(FOUR.map((n) => seen('hd', 'gray', n)), [55, 183, 19, 236]); assert.deepEqual(FOUR.map((n) => seen('hd', 'ccm601', n)), [76, 149, 29, 225]); }
});

t('the BT.709 weights add up to white 254, not 255, on this build: one level lost at the top (the BT.601 set keeps 255)', () => {
  assert.equal(seen('rgb', 'ccm601', 'white'), 255);
  near(seen('rgb', 'ccm709', 'white'), 255, 1, 'white under 709');
  if (isV6()) { assert.equal(seen('rgb', 'ccm709', 'white'), 254); assert.equal(R('rgb', 'ccm709').shownMax, 254); }
});

t('the ramp 0 to 255: gray keeps all 256 levels from an rgb source; hue keeps 220 (the video range); the mixer is not an identity on gray and keeps about 194', () => {
  assert.equal(R('rgb', 'none').distinctShown, 256); assert.equal(R('rgb', 'gray').distinctShown, 256); assert.equal(R('rgb', 'gray').shownDev, 0);
  assert.equal(R('rgb', 'hue').nativeMin, 16); assert.equal(R('rgb', 'hue').nativeMax, 235); assert.equal(R('rgb', 'hue').distinctShown, 220);
  const c = R('rgb', 'ccm601'); assert.ok(c.distinctShown < R('rgb', 'hue').distinctShown && c.shownDev >= 1, `mixer ramp: ${c.distinctShown} levels, worst ${c.shownDev}`);
  for (const [s, m] of [['rgb', 'gray'], ['rgb', 'hue'], ['rgb', 'ccm601'], ['rgb', 'ccm709'], ['hd', 'gray'], ['hd', 'hue']]) { assert.equal(R(s, m).shownMono, true, `${s} ${m} shown ramp is monotone`); assert.equal(R(s, m).neutral, true, `${s} ${m} ramp is neutral`); }
  if (isV6()) { assert.equal(R('rgb', 'ccm601').distinctShown, 194); assert.equal(R('rgb', 'ccm709').distinctShown, 200); }
});

t('eq=saturation=0 is not neutral: it leaves chroma at 127, so the three channels a viewer sees differ by up to 4 levels, while hue=s=0 and format=gray differ by none', () => {
  assert.equal(P('rgb', 'hue').spread, 0); assert.equal(P('rgb', 'gray').spread, 0);
  assert.ok(P('rgb', 'eq').spread >= 2 && P('rgb', 'eq').spread <= 6, `spread ${P('rgb', 'eq').spread}`);
  if (isV6()) { for (const n of NAMES) assert.equal(P('rgb', 'eq').native[n][1], 127); }
  for (const n of NAMES) near(raw('rgb', 'eq', n), raw('rgb', 'hue', n), 0, `eq keeps the same luma as hue: ${n}`);
});

t('do they match: gray and hue agree on the picture but not on the numbers; gray and the usual 601 mixer agree on a BT.601 source but not on a BT.709 one, on picture and numbers alike', () => {
  const stored = (s, m, n) => raw(s, m, n);
  assert.ok(FOUR.some((n) => Math.abs(stored('rgb', 'gray', n) - stored('rgb', 'hue', n)) >= 4), 'the stored numbers of gray and hue differ');
  assert.ok(FOUR.every((n) => Math.abs(seen('rgb', 'gray', n) - seen('rgb', 'hue', n)) <= 1), 'the pictures match');
  assert.ok(FOUR.every((n) => Math.abs(seen('sd', 'gray', n) - seen('sd', 'ccm601', n)) <= 1), 'sd: gray and the 601 mixer match');
  assert.ok(FOUR.every((n) => Math.abs(seen('hd', 'gray', n) - seen('hd', 'ccm601', n)) >= 10), 'hd: they do not');
  assert.ok(FOUR.every((n) => Math.abs(stored('hd', 'gray', n) - stored('hd', 'ccm601', n)) >= 10), 'hd: not on the stored numbers either');
});
