import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {have} from '../../../tools/ff.mjs';
import {runExperiment} from '../fixture/experiment.mjs';

const ok = have('ffmpeg') && have('ffprobe');
let ev;
before(() => { if (ok) ev = runExperiment(fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff08-'))); });
const t = (name, fn) => test(name, {skip: ok ? false : 'ffmpeg/ffprobe not on PATH'}, fn);

t('fixture: each source file is 2.0 s by its container, with encoder priming marked as skip samples on the first packet', () => {
  for (const f of [ev.a, ev.b]) { assert.ok(Math.abs(f.containerSeconds - 2) < 0.002, `${f.containerSeconds}`); assert.ok(f.firstPacketSkipSamples > 0); }
});

t('a single file decodes to more samples than the audio asked for, by exactly its end padding, because the decoder drops the priming but not the padding', () => {
  const f = ev.a;
  assert.equal(f.decodedSamples, f.packets * 1024 - f.firstPacketSkipSamples);
  assert.equal(f.decodedSamples - ev.source.validSamplesEach, ev.accounting.paddingPerFile);
  assert.ok(ev.accounting.paddingPerFile > 0 && ev.accounting.paddingPerFile < 1024);
});

t('the last packet is short: it carries only the valid part of the final frame', () => {
  assert.ok(ev.a.lastPacketDuration < 1024);
  assert.equal(ev.a.lastPacketDuration + ev.accounting.paddingPerFile, 1024);
});

t('the -c copy join has the packets of both files and no skip samples at all', () => {
  assert.equal(ev.join.packets, ev.a.packets + ev.b.packets);
  assert.equal(ev.join.firstPacketSkipSamples, 0);
});

t('the join decodes more than the two files decoded one after the other, by exactly the two priming blocks', () => {
  assert.equal(ev.accounting.joinMinusSeparateDecodes, ev.a.firstPacketSkipSamples + ev.b.firstPacketSkipSamples);
});

t('the numbers add up: the join decodes extra samples equal to priming plus padding of both files', () => {
  const x = ev.accounting;
  assert.equal(x.joinMinusValid, 2 * (x.primingPerFile + x.paddingPerFile));
  assert.ok(ev.join.decodedSeconds > 4);
});

t('the container is wrong by one priming block: its duration is 4 s plus 1024 samples', () => {
  assert.ok(Math.abs(ev.accounting.containerExtraSamples - ev.accounting.primingPerFile) <= 2, `${ev.accounting.containerExtraSamples}`);
});
