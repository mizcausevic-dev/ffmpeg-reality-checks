// Phase B checks: the scene files are wired to the evidence and to the scripts. No ffmpeg needed, only out/fl02/evidence.json.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {blockOf, START, END} from '../video/sync-evidence.mjs';
import {pickEvidence} from '../video/evidence-pick.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const evFile = path.join(root, 'out', 'fl02', 'evidence.json');
const have = fs.existsSync(evFile);
const t = (name, fn) => test(name, {skip: have ? false : 'out/fl02/evidence.json missing (run episodes/fl02/fixture/run.mjs)'}, fn);
const ev = have ? JSON.parse(fs.readFileSync(evFile, 'utf8')) : null;
const rd = (...p) => fs.readFileSync(path.join(root, 'episodes', ...p), 'utf8');
const ids = {fl02: 'fl02', fs02: 'fs02'};
const mapKeys = (src) => {
  const m = src.match(/export const scenes[^=]*=\s*\{([\s\S]*?)\};\s*$/m);
  assert.ok(m, 'scenes map');
  return [...m[1].matchAll(/^\s*([a-z0-9]+):|[,{]\s*([a-z0-9]+):/gm)].map((x) => x[1] ?? x[2]);
};

for (const id of Object.keys(ids)) {
  t(`${id}: the embedded EVIDENCE block equals a fresh pick from evidence.json (run sync-evidence.mjs after the fixture)`, () => {
    const src = rd(id, 'video', 'Scenes.tsx');
    const a = src.indexOf(START.slice(0, 20)), b = src.indexOf(END);
    assert.ok(a >= 0 && b > a, 'markers');
    assert.equal(src.slice(a, b + END.length), blockOf(ev));
  });
  t(`${id}: script.json has palette phosphor and the right kind`, () => {
    const s = JSON.parse(rd(id, 'script.json'));
    assert.equal(s.palette, 'phosphor');
    assert.equal(s.kind, id === 'fl02' ? 'long' : 'short');
    if (id === 'fs02') assert.ok(s.endCard.line && s.endCard.line.length <= 40, 'endCard.line');
  });
  t(`${id}: one scene component per script scene id, none extra`, () => {
    const s = JSON.parse(rd(id, 'script.json'));
    const keys = mapKeys(rd(id, 'video', 'Scenes.tsx'));
    assert.deepEqual([...keys].sort(), s.scenes.map((x) => x.id).sort());
  });
  t(`${id}: scene files have no em dash, no emoji, no glow`, () => {
    const src = rd(id, 'video', 'Scenes.tsx').replace(/\/\* EVIDENCE:start[\s\S]*?EVIDENCE:end \*\//, '');
    assert.ok(!/—/.test(src), 'em dash');
    assert.ok(!/\p{Extended_Pictographic}/u.test(src), 'emoji');
    assert.ok(!/glow|textShadow|boxShadow/i.test(src), 'glow or shadow');
  });
}

t('index files use the right engine entry points', () => {
  assert.match(rd('fl02', 'video', 'index.tsx'), /makeEpisode\(timeline, scenes, 'SYNTHETIC TEST CLIP'\)/);
  assert.match(rd('fs02', 'video', 'index.tsx'), /makeVerticalEpisode\(timeline, scenes, 'SYNTHETIC TEST CLIP', \{guides: false\}\)/);
  assert.ok(Number(JSON.parse(rd('fl02', 'script.json')).n) !== Number(JSON.parse(rd('fs02', 'script.json')).n));
});

t('the seam diagrams reconcile with the measurements they are drawn from', () => {
  const E = pickEvidence(ev);
  assert.equal(E.copy.seam, 2 * E.clickEarly + E.aac.padding + E.aac.priming, 'copy: 100 + 888 + 1024 + 100');
  assert.equal(E.notrim.seam, 2 * E.clickEarly + E.aac.padding, 're-encode without trim: 100 + 888 + 100');
  assert.equal(E.ctl.seam, 2 * E.clickEarly);
  assert.equal(E.rec.seam, E.ctl.seam);
  assert.equal(E.aac.extra, 2 * (E.aac.priming + E.aac.padding));
  assert.equal(E.mp3.rawShift, E.mp3.delay + E.mp3.decExtra);
  assert.equal(E.opus.late, E.opus.pre);
});
