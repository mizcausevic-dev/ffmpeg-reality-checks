import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have, lines} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff01-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);

t('fixture: 500 unique frames, keyframes exactly every 5 s', () => {
  assert.equal(ev.source.frames, 500);
  assert.equal(ev.source.uniqueFrames, 500, 'every frame needs a unique md5 or frame matching is meaningless');
  assert.deepEqual(ev.source.keyframes, [0, 5, 10, 15]);
});

t('known-positive control: the frame lookup finds frame 0 and rejects an unknown md5', () => {
  assert.equal(ev.frameLookup(ev.srcMd5[0]), 0);
  assert.equal(ev.frameLookup(ev.srcMd5[499]), 499);
  assert.equal(ev.frameLookup('0'.repeat(32)), -1);
});

t('re-encoding is frame accurate: starts on the first frame at or after 7.5 s', () => {
  const v = ev.variants.input_seek_reencode;
  assert.equal(v.firstSourceFrame, ev.request.expectedFirstFrame);
  assert.ok(Math.abs(v.decodedFrames - ev.request.expectedFrames) <= 1);
});

t('-ss BEFORE -i with -c copy: right start, but the file hides a long pre-roll', () => {
  const v = ev.variants.input_seek_copy;
  assert.equal(v.firstSourceFrame, ev.request.expectedFirstFrame, 'decoded start matches the request');
  assert.ok(Math.abs(v.decodedFrames - ev.request.expectedFrames) <= 1);
  assert.ok(v.packets - v.decodedFrames >= 50, `expected a hidden pre-roll of about 62 packets, got ${v.packets - v.decodedFrames}`);
  assert.ok(v.firstPacketPts < 0, 'pre-roll packets carry negative timestamps that an edit list hides');
});

t('-ss AFTER -i with -c copy: starts at the NEXT keyframe and the clip is far shorter than asked', () => {
  const v = ev.variants.output_seek_copy;
  assert.equal(v.firstSourceTime, 10, 'first keyframe after 7.5 s');
  assert.ok(v.decodedSeconds < 1, `asked for ${ev.request.clipSeconds} s, got ${v.decodedSeconds} s`);
  assert.ok(v.firstSourceTime > ev.request.seekSeconds, 'starts later than requested');
});

test('output parsing tolerates Windows CRLF line endings and the trailing comma ffprobe 8 prints', () => {
  assert.deepEqual(lines('0.000000,\r\n5.000000\r\n10.000000\r\n'), ['0.000000', '5.000000', '10.000000']);
  assert.deepEqual(lines('0.000000,\n5.000000\n').map(Number), [0, 5]);
});
