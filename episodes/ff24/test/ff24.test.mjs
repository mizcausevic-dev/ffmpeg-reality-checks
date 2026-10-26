import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff24-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const R = (k) => ev.runs[k];
const blank = (x) => x === '' || x === null;
const noTitles = (r) => assert.deepEqual(r.scan, {global: false, chapter1: false, chapter2: false});

t('control: the source has the global title and both chapter titles, seen by all three readers', () => {
  assert.equal(ev.source.probe.length, 2); assert.deepEqual(ev.source.probe.map((c) => c.start), [0, 2]);
  assert.deepEqual(ev.source.scan, {global: true, chapter1: true, chapter2: true});
  const p = R('plain'); assert.equal(p.probe.length, 2); assert.equal(p.exported.count, 2); assert.equal(p.exported.globalTitle, 'Secret Global Title'); assert.deepEqual(p.scan, {global: true, chapter1: true, chapter2: true});
});

t('-map_metadata -1 removes every title string but KEEPS the two chapter markers (same start times, blank titles)', () => {
  const r = R('meta_off');
  assert.equal(r.probe.length, 2); assert.equal(r.exported.count, 2); assert.deepEqual(r.probe.map((c) => c.start), [0, 2]);
  assert.ok(r.probe.every((c) => blank(c.title)) && r.exported.titles.every(blank)); assert.equal(r.exported.globalTitle, null); noTitles(r);
});

t('-map_chapters -1 removes the chapters but KEEPS the global title', () => {
  const r = R('chapters_off');
  assert.equal(r.probe.length, 0); assert.equal(r.exported.count, 0); assert.equal(r.exported.globalTitle, 'Secret Global Title');
  assert.equal(r.scan.global, true); assert.equal(r.scan.chapter1, false);
});

t('both flags together leave no chapters and no titles', () => {
  const r = R('both_off'); assert.equal(r.probe.length, 0); assert.equal(r.exported.count, 0); assert.equal(r.exported.globalTitle, null); noTitles(r);
});

t('a re-encode with -map_metadata -1 behaves the same as -c copy: two blank chapters remain', () => {
  const r = R('meta_off_encode'); assert.equal(r.probe.length, 2); assert.ok(r.probe.every((c) => blank(c.title))); noTitles(r);
});

t('Matroska output with -map_metadata -1 also keeps two chapters, with no titles', () => {
  const r = R('meta_off_mkv'); assert.equal(r.probe.length, 2); assert.ok(r.probe.every((c) => blank(c.title))); noTitles(r);
});

t('the two chapter readers (ffprobe and the ffmetadata export) agree on the chapter count for every output', () => {
  for (const [k, r] of Object.entries(ev.runs)) assert.equal(r.probe.length, r.exported.count, k);
});
