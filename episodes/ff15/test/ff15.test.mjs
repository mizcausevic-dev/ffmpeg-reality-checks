import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff15-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
// AAC decodes about 0.02 s more than it declares (encoder priming and padding, see episode 8), so audio is compared with a tolerance
const AAC = 0.05;

t('control: the sources are what we say: 125 video frames (5.0 s), tones of 3 and 8 seconds', () => {
  const r = ev.runs;
  assert.equal(r.short_audio_none.decoded.videoFrames, 125);
  near(r.short_audio_none.declared.audio, 3, 0.01, 'short tone');
  near(r.long_audio_none.declared.audio, 8, 0.01, 'long tone');
});

t('without -shortest and with shorter audio, the file runs as long as the video and the last 2 seconds have no sound', () => {
  const r = ev.runs.short_audio_none;
  near(r.declared.container, 5, 0.01, 'container'); near(r.declared.video, 5, 0.01, 'video'); near(r.declared.audio, 3, 0.01, 'audio');
  assert.equal(r.decoded.videoFrames, 125); near(r.decoded.audioSeconds, 3, AAC, 'decoded audio');
});

t('-shortest with -c copy ends the file at the audio length, but the video stops a little early (73 of 125 frames, 2.92 s)', () => {
  const r = ev.runs.short_audio_copy;
  near(r.declared.container, 3, 0.01, 'container');
  assert.equal(r.decoded.videoFrames, 73); near(r.decoded.videoSeconds, 2.92, 0.01, 'video');
  near(r.decoded.audioSeconds, 3, AAC, 'audio');
});

t('-shortest with a re-encode ends both at about 3 seconds (75 frames)', () => {
  const r = ev.runs.short_audio_encode;
  assert.equal(r.decoded.videoFrames, 75); near(r.declared.container, 3, 0.05, 'container');
  near(r.decoded.audioSeconds, 3, AAC, 'audio');
});

t('without -shortest and with longer audio, the file runs as long as the audio: the video ends at 5 seconds and 3 seconds of sound play over no picture', () => {
  const r = ev.runs.long_audio_none;
  near(r.declared.container, 8, 0.01, 'container'); near(r.declared.video, 5, 0.01, 'video');
  assert.equal(r.decoded.videoFrames, 125); near(r.decoded.audioSeconds, 8, AAC, 'audio');
});

t('-shortest with longer audio trims the audio to the video: 5 seconds, all 125 frames kept', () => {
  const r = ev.runs.long_audio_short;
  near(r.declared.container, 5, 0.01, 'container'); near(r.decoded.audioSeconds, 5, AAC, 'audio');
  assert.equal(r.decoded.videoFrames, 125);
});

t('the two readers agree on every run: declared stream durations match the decoded ones', () => {
  for (const [k, r] of Object.entries(ev.runs)) {
    near(r.declared.video, r.decoded.videoSeconds, 0.05, `${k} video`);
    near(r.declared.audio, r.decoded.audioSeconds, AAC, `${k} audio`);
  }
});
