import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff12-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const KEYS = ['title', 'artist', 'comment', 'location', 'handler'];
const kept = (r, k) => r.seen[k].ffprobe && r.seen[k].bytes;
const gone = (r, k) => !r.seen[k].ffprobe && !r.seen[k].bytes;

t('control: the source carries every made-up tag, seen by both ffprobe and a byte search (so the detector can see them)', () => {
  for (const k of KEYS) assert.ok(kept(ev.source, k), k);
});

t('a plain re-encode keeps title, artist, comment, location and the custom handler name', () => {
  for (const k of KEYS) assert.ok(kept(ev.runs.plain, k), k);
});

t('-c copy keeps them too', () => {
  for (const k of KEYS) assert.ok(kept(ev.runs.copy, k), k);
});

t('-map_metadata -1 removes all five, confirmed by both readers, with a re-encode and with -c copy', () => {
  for (const r of [ev.runs.strip, ev.runs.strip_copy]) for (const k of KEYS) assert.ok(gone(r, k), k);
});

t('the two readers never disagree about a tag in any run', () => {
  for (const r of Object.values(ev.runs)) for (const k of KEYS) assert.equal(r.seen[k].ffprobe, r.seen[k].bytes, k);
});

t('even after -map_metadata -1 the file still names the tool that wrote it (an encoder tag starting with Lavf)', () => {
  assert.match(ev.runs.strip.encoderTag ?? '', /^Lavf/);
});

t('adding -fflags +bitexact drops that encoder tag from the format tags', () => {
  assert.equal(ev.runs.strip_bitexact.encoderTag, null);
  for (const k of KEYS) assert.ok(gone(ev.runs.strip_bitexact, k), k);
});
