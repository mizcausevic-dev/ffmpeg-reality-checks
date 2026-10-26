import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment, TONES} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff10-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (hz, want) => Math.abs(hz - want) <= 3; // zero-crossing count over 1 s is good to about 1 Hz
const audioTypes = (s) => s.streams.filter((x) => x.type === 'audio');

t('the source holds one video and two audio streams, a 440 Hz main track and an 880 Hz commentary track, measured by pitch', () => {
  assert.deepEqual(ev.source.streams.map((s) => s.type), ['video', 'audio', 'audio']);
  assert.ok(near(ev.source.pitches[0], TONES.main), `${ev.source.pitches}`);
  assert.ok(near(ev.source.pitches[1], TONES.commentary), `${ev.source.pitches}`);
});

t('no -map: the output has exactly one audio track, with the same count from ffprobe and the output file read back', () => {
  const r = ev.runs.no_map;
  assert.equal(r.audioCount, 1);
  assert.equal(r.pitches.length, 1);
});

t('no -map: the one audio track kept is the first, the 440 Hz one; the 880 Hz commentary is gone', () => {
  const r = ev.runs.no_map;
  assert.ok(near(r.pitches[0], TONES.main), `${r.pitches}`);
  assert.ok(!r.pitches.some((p) => near(p, TONES.commentary)));
});

t('-c copy changes nothing about which streams are chosen: still one audio track', () => {
  assert.equal(ev.runs.no_map_copy.audioCount, 1);
  assert.ok(near(ev.runs.no_map_copy.pitches[0], TONES.main));
});

t('-map 0 keeps everything: one video and two audio tracks, both tones present', () => {
  const r = ev.runs.map_all;
  assert.deepEqual(r.streams.map((s) => s.type), ['video', 'audio', 'audio']);
  assert.ok(near(r.pitches[0], TONES.main));
  assert.ok(near(r.pitches[1], TONES.commentary));
});

t('-map 0:v -map 0:a:1 keeps the second track on purpose: one audio track, the 880 Hz one', () => {
  const r = ev.runs.map_second;
  assert.equal(r.audioCount, 1);
  assert.ok(near(r.pitches[0], TONES.commentary), `${r.pitches}`);
});

t('the documented rule is "the stream with the most channels", but with a stereo second track the first, mono track is still kept: the default flag outranks channel count', () => {
  assert.deepEqual(audioTypes(ev.source2).map((s) => s.channels), [1, 2]);
  assert.deepEqual(audioTypes(ev.source2).map((s) => s.isDefault), [true, false]);
  const r = ev.runs.no_map_more_channels;
  assert.deepEqual(r.channels, [1]);
  assert.ok(near(r.pitches[0], TONES.main), `${r.pitches}`);
});

t('moving the default flag to the stereo track changes the winner: now the 880 Hz stereo track is kept', () => {
  assert.deepEqual(audioTypes(ev.source3).map((s) => s.isDefault), [false, true]);
  const r = ev.runs.no_map_flag_moved;
  assert.deepEqual(r.channels, [2]);
  assert.ok(near(r.pitches[0], TONES.commentary), `${r.pitches}`);
});
