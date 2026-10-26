import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cases, commandOf, expectedSamples, gridErrorMs, buildOf, SR, SRC_SAMPLES, CLICK_EVERY, CLICKS, GUARD_S} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff66-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (id) => { assert.ok(ev.runs[id], `no case ${id}`); return ev.runs[id]; };
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);
const SINGLES = [0.5, 0.8, 1, 1.5, 2, 2.5, 4, 10, 100];
const MUSIC = [0.5, 0.8, 1.5, 2, 2.5, 4]; // factors with long enough output for the pitch readers

t('the helpers behave: expected sample counts, build detection, the grid error, and every command text carries a hard -t', () => {
  assert.equal(expectedSamples(0.5), 384000); assert.equal(expectedSamples(2.5), 76800); assert.equal(expectedSamples(100), 1920);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
  assert.equal(gridErrorMs([0, 2400, 4800], 1), 50); assert.equal(gridErrorMs([0, 4800, 9600], 1), 0);
  for (const c of cases()) assert.match(commandOf(c), / -t 30 -f s16le -$/, `time bounded: ${c.id}`);
  assert.equal(GUARD_S, 30); assert.equal(SRC_SAMPLES, 4 * SR); assert.equal(CLICKS, 40);
});

t('ffmpeg -version is recorded, and the sources are what the fixture promises: 192000 samples of tone, and a click train of 192000 samples with exactly 40 clicks at samples 0, 4800, 9600 and so on', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.sources.toneSamples, 192000); assert.equal(ev.sources.clickSamples, 192000);
  assert.deepEqual(ev.sources.clickPos, Array.from({length: 40}, (_, k) => k * CLICK_EVERY));
});

t('control: with no tempo filter (anull) the readers give back the source exactly: 192000 samples, the same md5, 40 click events at the source positions, a 1000 Hz tone', () => {
  const r = R('anull');
  assert.equal(r.samples, 192000); assert.equal(r.samplesProbe, 192000); assert.equal(r.identical, true); assert.equal(r.clickFirstDiff, -1);
  assert.equal(r.clickEvents, 40); assert.equal(r.clickEventsSd, 40); assert.deepEqual(r.clickPos, ev.sources.clickPos); near(r.tone.zcHz, 1000, 0.5);
});

t('the range on this build: one atempo takes 0.5 to 100 (0.5, 0.8, 1, 1.5, 2, 2.5, 4, 10 and 100 are accepted, so there is no 2.0 ceiling), and 0.25, 0.4, 100.5 and 200 are refused with "out of range [0.5 - 100]", with no output at all', () => {
  for (const f of [0.5, 0.8, 1, 1.5, 2]) assert.equal(R(`t${f}`).accepted, true, `${f}`);
  if (isV6()) {
    for (const f of SINGLES) assert.equal(R(`t${f}`).accepted, true, `${f}`);
    for (const f of [0.25, 0.4, 100.5, 200]) {
      const r = R(`t${f}`);
      assert.equal(r.accepted, false, `${f}`); assert.match(r.message, /out of range \[0\.5 - 100\]/, `${f}`); assert.equal(r.samples, undefined);
    }
  }
});

t('chains reach what one filter will not: atempo=0.5,atempo=0.8 (0.4) and 0.5,0.5 (0.25) are accepted and give about 480000 and 768000 samples; 2,2 (4) gives 48048, 2,1.25 (2.5) gives the same 76800 as atempo=2.5', () => {
  const a = R('c0.5x0.8'), b = R('c0.5x0.5'), c = R('c2x2'), d = R('c2x1.25');
  for (const r of [a, b, c, d]) { assert.equal(r.accepted, true, r.id); near(r.samples, r.expected, 4096, r.id); }
  assert.ok(a.samples > R('t0.5').samples && b.samples > a.samples);
  near(c.samples, R('t4').samples, 1024); near(d.samples, R('t2.5').samples, 1024);
  if (isV6()) { assert.equal(a.samples, 478464); assert.equal(b.samples, 764784); assert.equal(c.samples, 48048); assert.equal(d.samples, 76800); assert.equal(R('t2.5').samples, 76800); }
});

t('a chain whose product is above 100 is accepted but not honest: atempo=100,atempo=2 gives an empty output (0 samples) on 6.1.1, and atempo=100 alone gives 1024 samples for 1920 expected', () => {
  const a = R('c100x2');
  assert.equal(a.accepted, true); assert.ok(a.samples < 1920);
  if (isV6()) { assert.equal(a.samples, 0); assert.equal(R('t100').samples, 1024); assert.equal(R('c10x10').samples, 1024); }
  assert.ok(R('t100').samples < 0.7 * R('t100').expected);
});

t('output length: for 0.5 to 4 it is within 2048 samples (43 ms) of the 192000 / factor ideal, and it falls as the factor rises; on 6.1.1 the counts are 382896, 239616, 191952, 128016, 95952, 76800, 47856, 18432 and 1024', () => {
  const ids = [0.5, 0.8, 1, 1.5, 2, 2.5, 4, 10, 100];
  for (const f of [0.5, 0.8, 1, 1.5, 2, 2.5, 4]) near(R(`t${f}`).samples, expectedSamples(f), 2048, `${f}`);
  for (let i = 1; i < ids.length; i++) assert.ok(R(`t${ids[i]}`).samples < R(`t${ids[i - 1]}`).samples, `${ids[i]}`);
  if (isV6()) assert.deepEqual(ids.map((f) => R(`t${f}`).samples), [382896, 239616, 191952, 128016, 95952, 76800, 47856, 18432, 1024]);
});

t('the two length readers agree: the raw sample count on a pipe equals ffprobe duration_ts of the wav the same filter wrote, for every accepted case that is not empty', () => {
  let n = 0;
  for (const r of Object.values(ev.runs)) {
    if (!r.accepted || r.samples === 0) continue;
    assert.equal(r.samplesProbe, r.samples, r.id); n++;
  }
  assert.ok(n >= 17);
});

t('pitch stays: the tone is still 1000 Hz at 0.5, 0.8, 1.5, 2, 2.5 and 4 (zero crossings within 5 Hz, 998.77 to 999.87 on 6.1.1), the Goertzel magnitude at 1000 Hz is more than 100 times that at 1000 x factor and 1000 / factor, and the same for the chains', () => {
  const ids = [...MUSIC.map((f) => `t${f}`), 'c0.5x0.8', 'c0.5x0.5', 'c2x2', 'c2x1.25'];
  for (const id of ids) {
    const r = R(id), x = r.tone;
    near(x.zcHz, 1000, 5, id); assert.ok(x.g1000 > 1000, `${id} g1000 ${x.g1000}`);
    assert.ok(x.g1000 > 100 * Math.max(1, x.gFast ?? 0), `${id} fast ${x.gFast}`); assert.ok(x.g1000 > 100 * Math.max(1, x.gSlow), `${id} slow ${x.gSlow}`);
  }
  if (isV6()) { near(R('t0.5').tone.zcHz, 999.87, 0.01); near(R('t4').tone.zcHz, 998.77, 0.01); }
});

t('known positive for the pitch readers: changing speed by resampling (asetrate then aresample) does move the tone, to 500 Hz at 0.5, 2000 Hz at 2 and 4000 Hz at 4, with the same sample counts as atempo asks for (384000, 96000, 48000), and the 1000 Hz magnitude falls to under 1 percent', () => {
  for (const [id, hz] of [['r0.5', 500], ['r2', 2000], ['r4', 4000]]) {
    const r = R(id);
    near(r.tone.zcHz, hz, hz * 0.01, id); assert.ok(r.tone.g1000 < 0.01 * R('anull').tone.g1000, id); assert.ok(r.tone.gFast > 1000 || r.tone.gSlow > 1000, id);
    near(r.samples, r.expected, isV6() ? 0 : 2048, id);
  }
  if (isV6()) assert.equal(R('r2').samples, 96000);
});

t('the clicks do not survive atempo: 40 clicks become 122 events at 0.5, 70 at 0.8, 55 at 1 (not a bypass), 31 at 2, 26 at 2.5, 13 at 4, 5 at 10 and 1 at 100 on 6.1.1; slower than 1 gives more than 40, 2 and above gives fewer', () => {
  for (const f of [0.5, 0.8]) assert.ok(R(`t${f}`).clickEvents > CLICKS, `${f}`);
  for (const f of [2, 2.5, 4, 10, 100]) assert.ok(R(`t${f}`).clickEvents < CLICKS, `${f}`);
  assert.ok(R('t0.5').clickEvents > 2 * CLICKS);
  assert.ok(R('t0.5').clickEvents > R('t0.8').clickEvents && R('t2').clickEvents > R('t4').clickEvents);
  if (isV6()) assert.deepEqual([0.5, 0.8, 1, 1.5, 2, 2.5, 4, 10, 100].map((f) => R(`t${f}`).clickEvents), [122, 70, 55, 40, 31, 26, 13, 5, 1]);
});

t('known positive for the click readers: the resampled outputs keep all 40 clicks (40 events in both readers) on the ideal grid, 4800 / factor samples apart, within 10 samples (0.2 ms), while atempo puts events up to 58.7 ms (0.5), 18.7 ms (2) and 11.7 ms (4) off that grid', () => {
  for (const f of [0.5, 2, 4]) {
    const r = R(`r${f}`);
    assert.equal(r.clickEvents, 40, `r${f}`); assert.equal(r.clickEventsSd, 40, `r${f}`); assert.ok(gridErrorMs(r.clickPos, f) < 10 / 48, `r${f} grid`);
  }
  assert.ok(gridErrorMs(R('t0.5').clickPos, 0.5) > 20); assert.ok(gridErrorMs(R('t2').clickPos, 2) > 10); assert.ok(gridErrorMs(R('t4').clickPos, 4) > 5);
  if (isV6()) { near(gridErrorMs(R('t0.5').clickPos, 0.5), 58.7, 0.1); near(gridErrorMs(R('t2').clickPos, 2), 18.7, 0.1); near(gridErrorMs(R('t4').clickPos, 4), 11.7, 0.1); }
});

t('atempo=1 is not a bypass on 6.1.1: it drops 48 samples (191952), changes the decoded md5, and turns 40 clicks into 55 events, while atempo=1.5 keeps the count (40) but still changes the md5', () => {
  const a = R('t1'), b = R('t1.5');
  assert.equal(b.identical, false);
  if (isV6()) { assert.equal(a.identical, false); assert.equal(a.samples, 191952); assert.equal(a.clickEvents, 55); assert.equal(b.clickEvents, 40); }
});

t('the two click readers agree: the Node scan and ffmpeg silencedetect count the same events for every single atempo and the resampled controls, and within 1 for the chains', () => {
  for (const r of Object.values(ev.runs)) {
    if (!r.accepted) continue;
    if (r.kind === 'chain' || r.id.startsWith('c')) near(r.clickEvents, r.clickEventsSd, 1, r.id); else assert.equal(r.clickEvents, r.clickEventsSd, r.id);
  }
});

t('the click itself is one sample of 29491 (bytes 33 73 in the wav), and at 0.5 the first events come back at other levels: some near full scale, some well under half', () => {
  assert.equal(ev.sources.clickValue, 29491); assert.deepEqual(ev.sources.clickBytes, [0x33, 0x73]); assert.equal(ev.sources.nonzero, 40);
  assert.equal(R('t0.5').clickPeaks.length, R('t0.5').clickEvents);
  const pk = R('t0.5').clickPeaks.slice(0, 10).map((e) => Math.abs(e.peak));
  assert.equal(pk.length, 10);
  assert.deepEqual(ev.sources.clickHex.map((r) => r.bytes.slice(0, 2)), [[0x33, 0x73], [0x33, 0x73]]);
  assert.equal(ev.sources.clickHex[1].off, 9600);
  assert.ok(pk[0] > 29000, 'the first click is kept');
  assert.ok(pk.some((v) => v < 16384), 'at least one copy is under half scale');
  assert.ok(pk.filter((v) => v > 28000).length >= 3, 'several copies stay near full scale');
  for (const id of ['anull', 'r0.5']) assert.ok(R(id).clickPeaks.every((e) => Math.abs(e.peak) > 29000), `${id}: every click stays at full level`);
});
