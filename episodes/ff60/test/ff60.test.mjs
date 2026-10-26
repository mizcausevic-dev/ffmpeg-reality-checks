import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, cell, rowOf, esc1, esc2, quote, STRATS, STRAT_IDS, PATHS, KINDS, DECOYS, buildOf, W, H} from '../fixture/experiment.mjs';

// the 12 test paths hold characters (colon, backslash, quotes, brackets) that Windows file names cannot, so the grid needs a Linux or macOS file system
const ok = have('ffmpeg') && have('ffprobe') && process.platform !== 'win32';
let ev, dir;
before(() => { if (ok) { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff60-')); ev = runExperiment(dir); } });
test.after(() => { if (dir) fs.rmSync(dir, {recursive: true, force: true}); });
const hasLibass = () => ok && ev.libassEnabled === true;
const t = (name, fn) => test(name, {skip: !ok ? 'ffmpeg/ffprobe on PATH and a file system that allows : \\ \' [ ] in names are needed (not Windows)' : false}, (c) => {
  if (!hasLibass()) return c.skip('ffmpeg without libass: the subtitles filter does not exist, no finding');
  return fn(c);
});
const isV6 = () => buildOf(ev.ffmpeg) === 'v6';
const ids = (cls, strat, kind) => PATHS.filter((p) => cell(ev, p.id, kind, strat).classA === cls).map((p) => p.id);

t('the helpers behave: the two escaping levels, quoting, build detection', () => {
  assert.equal(esc1('a:b.srt'), 'a\\:b.srt');
  assert.equal(esc2(esc1('a:b.srt')), 'a\\\\:b.srt');
  assert.equal(esc2(esc1("it's.srt")), "it\\\\\\'s.srt");
  assert.equal(esc2('a[1].srt'), 'a\\[1\\].srt');
  assert.equal(quote("it's"), "'it'\\''s'");
  assert.equal(STRATS.quotedOne.make('a:b.srt'), "subtitles='a\\:b.srt'");
  assert.equal(STRATS.twoEq.make('a=b.srt'), 'subtitles=a\\\\=b.srt');
  assert.equal(buildOf('ffmpeg version 6.1.1-3ubuntu5'), 'v6'); assert.equal(buildOf('ffmpeg version 8.1.2-full_build'), 'v8');
});

t('ffmpeg -version is recorded, libass is in the build, and the grid is what the fixture promises: 12 paths x 3 spellings (relative, ./relative, absolute) x 6 ways of writing = 216 runs', () => {
  assert.match(ev.ffmpeg, /^ffmpeg version /);
  assert.equal(ev.libassEnabled, true);
  assert.equal(PATHS.length, 12); assert.equal(KINDS.length, 3); assert.equal(STRAT_IDS.length, 6);
  assert.equal(ev.cases.length, 216);
  assert.equal(ev.control.bytes, W * H);
});

t('controls: with no subtitles the frame is the same on every run; each of the 12 files burns pixels under a safe name (1000 or more), no two of them look alike, and the lookalike files differ from all of them', () => {
  assert.equal(ev.control.status, 0); assert.equal(ev.control.md5, ev.control.rawMd5);
  assert.equal(ev.references.length, 12);
  for (const r of ev.references) { assert.equal(r.status, 0, r.id); assert.ok(r.burned >= 1000, `${r.id} burned ${r.burned}`); assert.notEqual(r.md5, ev.control.md5, r.id); }
  assert.equal(new Set(ev.references.map((r) => r.md5)).size, 12);
  assert.equal(ev.decoys.length, DECOYS.length);
  for (const d of ev.decoys) { assert.equal(d.status, 0); assert.ok(d.burned >= 500, d.rel); assert.ok(!ev.references.some((r) => r.md5 === d.md5), `${d.rel} looks like a reference`); assert.notEqual(d.md5, ev.control.md5); }
});

t('known positive: the plain name, and a name with a space (also in a folder), burn the intended file under all 6 ways of writing and all 3 spellings', () => {
  for (const id of ['plain', 'space', 'dirspace']) for (const k of KINDS) for (const s of STRAT_IDS) assert.equal(cell(ev, id, k, s).classA, 'right', `${id} ${k} ${s}`);
});

t('the two readers agree on every one of the 216 runs: raw pixels in Node and the framemd5 of the same frame give the same class (right, wrong, none or error), and no run that opened a file burned nothing', () => {
  for (const c of ev.cases) { assert.equal(c.classA, c.classB, `${c.path} ${c.kind} ${c.strat}`); assert.notEqual(c.classA, 'none', `${c.path} ${c.kind} ${c.strat}`); }
  for (const c of ev.cases) if (c.classA === 'error') assert.notEqual(c.status, 0);
  for (const c of ev.cases) if (c.classA !== 'error') { assert.equal(c.status, 0); assert.ok(c.burned > 0); }
});

t('written as is (the raw string), for all three spellings: 3 paths work (plain, space, space in a folder), 6 stop with an error, 3 open the wrong file with no error', () => {
  for (const k of KINDS) {
    assert.deepEqual(ids('right', 'raw', k), ['plain', 'space', 'dirspace'], k);
    assert.deepEqual(ids('wrong', 'raw', k), ['apos', 'backslash', 'dirapos'], k);
    assert.deepEqual(ids('error', 'raw', k), ['colon', 'bracket', 'comma', 'semicolon', 'equals', 'dircolon'], k);
  }
});

t('wrong means the lookalike: with the apostrophe, backslash and folder-apostrophe names written as is, the frame is byte for byte what the lookalike files give (its.srt, ab.srt, dirs/sub.srt), exit status 0, no message', () => {
  const md5Of = (rel) => ev.decoys.find((d) => d.rel === rel).md5;
  for (const k of KINDS) {
    assert.equal(cell(ev, 'apos', k, 'raw').md5, md5Of('its.srt'), k); assert.equal(cell(ev, 'backslash', k, 'raw').md5, md5Of('ab.srt'), k); assert.equal(cell(ev, 'dirapos', k, 'raw').md5, md5Of('dirs/sub.srt'), k);
    for (const id of ['apos', 'backslash', 'dirapos']) { const c = cell(ev, id, k, 'raw'); assert.equal(c.status, 0); assert.equal(c.error, ''); }
  }
});

t('negative control for wrong: take the lookalike files away and the same three strings stop with an error that names the file you did not write', () => {
  const by = Object.fromEntries(ev.noDecoy.map((n) => [n.path, n]));
  for (const id of ['apos', 'backslash', 'dirapos']) assert.notEqual(by[id].status, 0, id);
  assert.match(by.apos.error, /Unable to open .*its\.srt$/); assert.match(by.backslash.error, /Unable to open .*ab\.srt$/); assert.match(by.dirapos.error, /Unable to open .*dirs\/sub\.srt$/);
});

t('the error text of each raw failure names the piece of the file name left over (the wording is ffmpeg 6.1.1; other builds may word it differently)', () => {
  const e = (id) => cell(ev, id, 'rel', 'raw').error;
  for (const id of ['colon', 'bracket', 'comma', 'semicolon', 'equals', 'dircolon']) assert.ok(e(id).length > 0, id);
  if (!isV6()) return;
  assert.match(e('colon'), /Unable to parse option value "b\.srt" as image size/);
  assert.match(e('bracket'), /Trailing garbage after a filter: \.srt/);
  assert.equal(e('comma'), "No such filter: 'b.srt'"); assert.equal(e('semicolon'), "No such filter: 'b.srt'");
  assert.match(e('equals'), /Error applying option 'a' to filter 'subtitles': Option not found/);
  assert.match(e('dircolon'), /Unable to parse option value "\/sub\.srt" as image size/);
});

t('one level of backslashes changes nothing: in all 36 rows (12 paths x 3 spellings) it gives the same class as the raw string, and the same pixels', () => {
  if (!isV6()) return;
  for (const p of PATHS) for (const k of KINDS) { assert.equal(cell(ev, p.id, k, 'one').classA, cell(ev, p.id, k, 'raw').classA, `${p.id} ${k}`); assert.equal(cell(ev, p.id, k, 'one').md5, cell(ev, p.id, k, 'raw').md5, `${p.id} ${k}`); }
});

t('quotes fix only the characters of the filtergraph level: brackets, comma and semicolon work in all three spellings; colon, apostrophe, backslash, equals, C: and the folder apostrophe still fail', () => {
  if (!isV6()) return;
  for (const k of KINDS) {
    assert.deepEqual(ids('right', 'quoted', k), ['plain', 'space', 'bracket', 'comma', 'semicolon', 'dirspace'], k);
    assert.deepEqual(ids('wrong', 'quoted', k), ['apos', 'backslash', 'dirapos'], k);
    assert.deepEqual(ids('error', 'quoted', k), ['colon', 'equals', 'dircolon'], k);
  }
});

t('two levels (esc1 then esc2) fix every path except the equals sign, and except a colon in a relative name: absolute and ./ spellings are right for 11 of 12, the plain relative spelling for 9 of 12', () => {
  if (!isV6()) return;
  for (const k of ['dot', 'abs']) assert.deepEqual(ids('error', 'two', k), ['equals'], k);
  assert.deepEqual(ids('error', 'two', 'rel'), ['colon', 'equals', 'dircolon']);
  for (const k of KINDS) assert.deepEqual(ids('wrong', 'two', k), [], k);
  for (const k of ['dot', 'abs']) assert.equal(ids('right', 'two', k).length, 11, k);
  assert.equal(ids('right', 'two', 'rel').length, 9);
});

t('with the equals sign escaped too (twoEq), and ./ in front of a relative name, all 12 paths are read as the intended file; quotes plus one level (quotedOne) do the same for the 11 that do not contain an equals sign', () => {
  if (!isV6()) return;
  for (const k of ['dot', 'abs']) assert.deepEqual(ids('right', 'twoEq', k), PATHS.map((p) => p.id), k);
  assert.deepEqual(ids('right', 'quotedOne', 'abs'), PATHS.map((p) => p.id).filter((i) => i !== 'equals'));
  assert.deepEqual(ids('error', 'twoEq', 'rel'), ['colon', 'dircolon']);
});

t('why the relative colon fails even when escaped: the error is Unable to open a:b.srt, ffprobe reads the bare name as a protocol, and ./ or file: in front of it opens the same file', () => {
  if (!isV6()) return;
  assert.equal(cell(ev, 'colon', 'rel', 'two').error, 'Unable to open a:b.srt');
  assert.notEqual(ev.protocol.bare.status, 0); assert.match(ev.protocol.bare.error, /Protocol not found/);
  assert.equal(ev.protocol.dot.status, 0); assert.equal(ev.protocol.dot.format, 'srt');
  assert.equal(ev.protocol.file.status, 0); assert.equal(ev.protocol.file.format, 'srt');
});

t('the shell is a third layer: the two-level string for a colon works only in single quotes, bare or double quotes lose a level and fail; the apostrophe string is the wrong file bare or in double quotes, and right with the close-quote trick', () => {
  if (!isV6() || ev.shellSkipped) return;
  const s = (id, how) => ev.shell.find((x) => x.path === id && x.how === how);
  assert.equal(s('colon', 'single').classA, 'right'); assert.equal(s('colon', 'bare').classA, 'error'); assert.equal(s('colon', 'double').classA, 'error');
  assert.equal(s('apos', 'single').classA, 'right'); assert.equal(s('apos', 'bare').classA, 'wrong'); assert.equal(s('apos', 'double').classA, 'wrong');
  for (const x of ev.shell) assert.equal(x.classA, x.classB, `${x.path} ${x.how}`);
});

t('known positive for the readers on a different build: whatever the build, a safe name is read as the intended file and the readers agree (this one is expected to hold on ffmpeg 8.1.2 too)', () => {
  assert.equal(rowOf(ev, 'plain', 'rel').raw, 'right'); assert.equal(rowOf(ev, 'space', 'abs').raw, 'right');
  for (const c of ev.cases) assert.equal(c.classA, c.classB);
});

t('the bars in the film: paths read as the intended file, out of 12 full paths: as is 3, one level 3, quotes 6, two levels 11, equals escaped too 12 (and 9 as a plain relative name, 11 with ./ in front)', () => {
  if (!isV6()) return;
  const n = (s, k) => ids('right', s, k).length;
  assert.deepEqual(['raw', 'one', 'quoted', 'quotedOne', 'two', 'twoEq'].map((s) => n(s, 'abs')), [3, 3, 6, 11, 11, 12]);
  assert.equal(n('two', 'rel'), 9); assert.equal(n('two', 'dot'), 11); assert.equal(n('twoEq', 'dot'), 12);
});

t('every number and message the film shows comes from this evidence: 216 runs, 129600 bytes, the control hash starts 26743289, safe names burn 1124 to 1163 pixels, and the error texts on screen', () => {
  assert.equal(ev.cases.length, 216); assert.equal(ev.control.bytes, 129600);
  assert.ok(ev.control.md5.startsWith('26743289'));
  const b = ev.references.map((r) => r.burned);
  if (isV6()) { assert.equal(Math.min(...b), 1124); assert.equal(Math.max(...b), 1163); }
  if (!isV6()) return;
  const e = (id, k, s) => cell(ev, id, k, s).error;
  assert.equal(e('colon', 'rel', 'raw'), 'Unable to parse option value "b.srt" as image size');
  assert.equal(e('colon', 'rel', 'one'), 'Unable to parse option value "b.srt" as image size');
  assert.equal(e('colon', 'rel', 'quoted'), 'Unable to parse option value "b.srt" as image size');
  assert.equal(e('bracket', 'rel', 'raw'), 'Trailing garbage after a filter: .srt');
  assert.equal(e('comma', 'rel', 'raw'), "No such filter: 'b.srt'");
  assert.equal(e('equals', 'rel', 'raw'), "Error applying option 'a' to filter 'subtitles': Option not found");
  assert.equal(e('dircolon', 'rel', 'raw'), 'Unable to parse option value "/sub.srt" as image size');
  assert.equal(e('colon', 'rel', 'two'), 'Unable to open a:b.srt');
  assert.equal(ev.noDecoy.find((x) => x.path === 'apos').error, 'Unable to open its.srt');
  assert.equal(cell(ev, 'bracket', 'rel', 'quoted').classA, 'right');
  assert.equal(cell(ev, 'equals', 'rel', 'twoEq').classA, 'right');
  assert.equal(cell(ev, 'colon', 'dot', 'two').classA, 'right');
});
