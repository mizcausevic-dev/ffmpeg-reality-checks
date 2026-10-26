import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, typed, works, minBs, modelMin, caseOf, summary, buildOf, haveDrawtext, findFont, TARGETS} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && haveDrawtext() && !!findFont();
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff73-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg with drawtext (libfreetype) and a monospace font are needed'}, fn);
const C = (id) => caseOf(ev, id);
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const NAMES = Object.keys(TARGETS);

t('the helpers behave: typed() writes the backslashes where the grid says, the model gives the known minimums, build detection', () => {
  assert.equal(typed('percent', 'bare', 2), '100\\\\%');
  assert.equal(typed('percent', 'quoted', 0), "'100%'");
  assert.equal(typed('colon', 'quoted', 1), "'12\\:30'");
  assert.equal(typed('apostrophe', 'bare', 3), "it\\\\\\'s");
  assert.equal(typed('apostrophe', 'quoted', 1), "'it'\\''s'");
  assert.equal(typed('backslash', 'bare', 3), 'a\\\\\\b');
  assert.equal(modelMin('percent', 'normal', 'bare'), 4); assert.equal(modelMin('backslash', 'normal', 'bare'), 8); assert.equal(modelMin('backslash', 'none', 'quoted'), 2);
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, and the test bench is what the fixture promises: one monospace font, 24 px advance, 32 cells, 94 reference glyphs that no position confuses', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.glyphs, 94); assert.equal(ev.ambiguousPositions, 0);
  assert.equal(ev.cells, Math.floor(768 / ev.advance)); assert.ok(ev.advance >= 14 && ev.advance <= 30);
  assert.ok(ev.cases.length >= 140, 'the grid has run');
});

t('known positive for reader 2: 150 random strings through the clean route (textfile with expansion=none) decode back exactly; an untouched frame decodes to nothing with 0 ink pixels; it\'s and its are told apart', () => {
  assert.equal(ev.control.random.count, 150); assert.equal(ev.control.random.mismatches, 0, JSON.stringify(ev.control.random.sample));
  assert.equal(ev.control.untouchedDecodes, ''); assert.equal(ev.control.untouchedInk, 0);
  assert.deepEqual(ev.control.apostropheVsNone, ["it's", 'its']); assert.equal(ev.control.sameTextSameHash, true);
});

t('the two readers agree: wherever reader 2 can read the frame, the framemd5 of the frame equals the framemd5 of the clean-route render of the text it read (0 disagreements)', () => {
  const read = ev.cases.filter((c) => c.drawn !== null);
  assert.ok(read.length > 100);
  assert.deepEqual(read.filter((c) => c.agree !== true).map((c) => c.id), []);
  // a failed command draws nothing and has no frame to read
  for (const c of ev.cases.filter((x) => x.exit !== 0)) { assert.equal(c.drawn, null); assert.equal(c.md5, null); }
});

t('the clean route works for all four strings on any build: textfile with expansion=none draws 100%, 12:30, it\'s and a\\b exactly, and a frame hashes the same each time', () => {
  for (const n of NAMES) { const c = C(`file-none-${n}`); assert.equal(c.exit, 0); assert.equal(c.drawn, TARGETS[n].text, n); assert.equal(c.ok, true); assert.equal(c.agree, true); }
});

t('typed the obvious way (one quoted string, nothing escaped) the text is wrong: 100% draws a blank frame (0 ink pixels) with exit 0, it\'s loses its apostrophe, a\\b loses its backslash, 12:30 is not drawn as typed', () => {
  assert.equal(C('typed-percent').drawn, ''); assert.equal(C('typed-percent').ink, 0); assert.equal(C('typed-percent').exit, 0); assert.equal(C('typed-percent').blank, true);
  assert.equal(C('typed-apostrophe').drawn, 'its'); assert.equal(C('typed-backslash').drawn, 'ab');
  const col = C('typed-colon'); assert.notEqual(col.drawn, '12:30');
  // 6.1.1 draws a wrong frame and exits 0; 8.1.2 refuses the line (No option name near '30') and draws nothing
  if (isV6()) { assert.equal(col.exit, 0); assert.ok(col.ink > 0); } else { assert.notEqual(col.exit, 0); assert.match(col.warn, /No option name near/); assert.equal(col.drawn, null); }
  for (const n of NAMES) assert.equal(C(`typed-${n}`).ok, false, n);
  if (isV6()) assert.match(C('typed-percent').warn, /Stray %/);
});

t('the percent sign: one backslash does not fix it. Bare it needs 4, inside quotes 2; with expansion=none no backslash at all. A textfile alone does not help (expansion still on): the blank frame comes back', () => {
  for (const [style, min] of [['bare', 4], ['quoted', 2]]) {
    assert.equal(minBs(ev, 'grid', 'percent', style), min, style);
    for (let n = 0; n < min; n++) assert.equal(caseOf(ev, `grid-percent-${style}-${n}`).drawn, '', `${style} with ${n}`);
  }
  assert.equal(minBs(ev, 'none', 'percent', 'bare'), 0); assert.equal(minBs(ev, 'none', 'percent', 'quoted'), 0);
  assert.equal(C('file-normal-percent').drawn, ''); assert.equal(C('file-normal-percent').ink, 0); assert.equal(C('file-none-percent').drawn, '100%');
});

t('% starts a function: %{pts} draws a number, not text; \\%{pts} (escaped as above) draws %{pts}; an unknown function draws a blank frame with exit 0; braces alone are harmless', () => {
  assert.match(C('func-pts').drawn, /^0\.0+$/); assert.equal(C('func-literal').drawn, '%{pts}'); assert.equal(C('func-unknown').drawn, ''); assert.equal(C('func-unknown').exit, 0);
  assert.equal(C('braces').drawn, '{x} }');
  if (isV6()) assert.match(C('func-unknown').warn, /not known/);
});

t('the colon: bare 12:30 is cut at the colon and the 30 becomes the next option. The frame is byte for byte the frame of text=12:fontfile=30, and of the build default font (no fontfile at all), not the test font. Fix: 1 backslash inside quotes, 2 bare', () => {
  const m = ev.colonMechanism;
  if (isV6()) { assert.equal(m.bareMd5, m.asFontfileMd5); assert.equal(m.bareMd5, m.defaultFontMd5); assert.notEqual(m.bareMd5, m.testFontMd5); }
  else { assert.equal(m.bareMd5, null, '8.1.2 refuses the bare colon line, so there is no frame to compare'); assert.notEqual(C('grid-colon-bare-0').exit, 0); }
  assert.equal(minBs(ev, 'grid', 'colon', 'quoted'), 1); assert.equal(minBs(ev, 'grid', 'colon', 'bare'), 2);
  assert.equal(minBs(ev, 'none', 'colon', 'quoted'), 1, 'expansion=none does not change the colon');
  assert.equal(C('grid-colon-quoted-1').drawn, '12:30');
  assert.equal(C('grid-colon-bare-0').drawn, null, 'unreadable: another font, or no frame at all'); if (isV6()) assert.ok(C('grid-colon-bare-0').ink > 0);
});

t('the apostrophe needs 3 backslashes, bare or quoted, with expansion on or off; 0, 1 or 2 all lose the apostrophe, and an unclosed quote can swallow the next option into the text', () => {
  for (const [g, s] of [['grid', 'bare'], ['grid', 'quoted'], ['none', 'bare'], ['none', 'quoted']]) {
    assert.equal(minBs(ev, g, 'apostrophe', s), 3, `${g} ${s}`);
    // an apostrophe that is not escaped enough is a quote: it vanishes and (quoted style, expansion=none) may swallow the option that follows into the text
    for (let n = 0; n < 3; n++) { const d = caseOf(ev, `${g}-apostrophe-${s}-${n}`).drawn; assert.ok(d.startsWith('its') && d !== "it's", `${g} ${s} ${n}: ${d}`); }
  }
});

t('the backslash: to draw one, 8 backslashes bare or 4 in quotes; with expansion=none 4 bare or 2 in quotes. Fewer draws nothing for it (a\\b becomes ab)', () => {
  assert.equal(minBs(ev, 'grid', 'backslash', 'bare'), 8); assert.equal(minBs(ev, 'grid', 'backslash', 'quoted'), 4);
  assert.equal(minBs(ev, 'none', 'backslash', 'bare'), 4); assert.equal(minBs(ev, 'none', 'backslash', 'quoted'), 2);
  for (let n = 0; n < 8; n++) assert.notEqual(caseOf(ev, `grid-backslash-bare-${n}`).drawn, 'a\\b', `bare ${n}`);
  assert.equal(C('file-normal-backslash').drawn, 'ab'); assert.equal(C('file-none-backslash').drawn, 'a\\b');
});

t('the rule: each of the three parsers (filter graph, option list, drawtext expansion) removes one level of backslash. The closed form reproduces all 16 measured minimums (4 strings x bare/quoted x expansion on/off)', () => {
  let n = 0;
  for (const tg of NAMES) for (const [g, exp] of [['grid', 'normal'], ['none', 'none']]) for (const style of ['bare', 'quoted']) {
    assert.equal(minBs(ev, g, tg, style), modelMin(tg, exp, style), `${tg} ${exp} ${style}`); n++;
  }
  assert.equal(n, 16);
});

t('halving: quoting halves the backslashes the filter graph parser needs (percent 4 to 2, colon 2 to 1, backslash 8 to 4), and expansion=none halves what the drawtext layer needs (backslash 8 to 4, 4 to 2)', () => {
  const m = (g, t2, s) => minBs(ev, g, t2, s);
  for (const tg of ['percent', 'colon', 'backslash']) assert.equal(m('grid', tg, 'bare'), 2 * m('grid', tg, 'quoted'), tg);
  assert.equal(m('grid', 'backslash', 'bare'), 2 * m('none', 'backslash', 'bare')); assert.equal(m('grid', 'backslash', 'quoted'), 2 * m('none', 'backslash', 'quoted'));
});

t('the comma belongs to the filter graph: a bare comma ends the filter (nonzero exit, nothing drawn); an escaped comma draws a,b', () => {
  const bare = C('comma-bare'); assert.notEqual(bare.exit, 0); assert.equal(bare.drawn, null); assert.equal(bare.md5, null);
  assert.equal(C('comma-escaped').drawn, 'a,b'); assert.equal(C('comma-escaped').exit, 0);
});

t('the blank frame is silent: every blank frame (percent without its escape, unknown function) has exit 0, and a warning on stderr is the only sign', () => {
  const blanks = ev.cases.filter((c) => c.blank);
  assert.ok(blanks.length >= 10);
  for (const c of blanks) assert.equal(c.exit, 0, c.id);
  if (isV6()) for (const c of blanks) assert.ok(c.warn.length > 0, `${c.id} has a warning`);
});
