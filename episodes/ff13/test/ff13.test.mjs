import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff13-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);

t('control: an untagged clip is shown as recorded, so the detector can tell "not turned" from "turned"', () => {
  assert.equal(ev.controls.unrotated.stored.rotation, null);
  assert.equal(ev.controls.unrotated.shown.orientation, 'recorded');
});

t('the source holds the sideways pixels (320x180) with a rotation tag of 90, and a decoder shows it upright (180x320)', () => {
  assert.equal(ev.source.stored.size, '320x180');
  assert.equal(ev.source.stored.rotation, 90);
  assert.equal(ev.source.shown.size, '180x320');
  assert.equal(ev.source.shown.orientation, 'upright');
});

t('a plain re-encode turns the pixels for you: stored 180x320, no tag left, still shown upright', () => {
  const r = ev.runs.plain;
  assert.equal(r.stored.size, '180x320');
  assert.equal(r.stored.rotation, null);
  assert.equal(r.shown.orientation, 'upright');
});

t('-noautorotate keeps the pixels as recorded (320x180). Whether the tag is carried along depends on the build: 6.1.1 keeps it, 8.1.2 drops it', () => {
  const r = ev.runs.noautorot;
  assert.equal(r.stored.size, '320x180');
  if (r.stored.rotation === 90) assert.equal(r.shown.orientation, 'upright');       // tag carried: players still turn it
  else { assert.equal(r.stored.rotation, null); assert.equal(r.shown.orientation, 'recorded'); }  // tag dropped: it plays sideways
});

t('-c copy changes nothing: same stored size, same tag, shown upright', () => {
  const r = ev.runs.copy;
  assert.equal(r.stored.size, '320x180');
  assert.equal(r.stored.rotation, 90);
  assert.equal(r.shown.orientation, 'upright');
});

t('adding -vf transpose=1 on top of the automatic fix undoes it: no tag, stored 320x180, shown as recorded (sideways)', () => {
  const r = ev.runs.transpose;
  assert.equal(r.stored.rotation, null);
  assert.equal(r.stored.size, '320x180');
  assert.equal(r.shown.orientation, 'recorded');
});

t('turning the pixels by hand with -noautorotate: the result depends on whether the build carries the old tag. Carried (6.1.1): shown upside down. Dropped (8.1.2): shown upright', () => {
  const r = ev.runs.manual;
  assert.equal(r.stored.size, '180x320');
  if (r.stored.rotation === 90) assert.equal(r.shown.orientation, 'upsidedown');
  else { assert.equal(r.stored.rotation, null); assert.equal(r.shown.orientation, 'upright'); }
});

t('both runs that use -noautorotate behave the same way about the tag in one build (carried in both or dropped in both)', () => {
  assert.equal(ev.runs.noautorot.stored.rotation === 90, ev.runs.manual.stored.rotation === 90);
});

t('the two readers agree on every run: a stored 320x180 with no tag is shown 320x180, and a tag of 90 swaps the shown size', () => {
  for (const r of [ev.source, ...Object.values(ev.runs)]) {
    const [w, h] = r.stored.size.split('x');
    const swapped = r.stored.rotation === 90 || r.stored.rotation === -90;
    assert.equal(r.shown.size, swapped ? `${h}x${w}` : `${w}x${h}`);
  }
});
