// Episode 60 fixture: "The subtitles filter will not open my file: which path characters break it?"
// Synthetic input only: a gray lavfi frame (480x270) and small .srt files written here. ffmpeg is started WITHOUT a shell (spawnSync with an argument list),
// so the only layers between the string and the file name are the two layers inside ffmpeg (filtergraph level, then option level).
// A second set of runs goes through /bin/sh to show the shell as a third layer.
// Every file holds one cue (00:00:00,000 to 00:00:02,000) with its own text, so the burned pixels name the file that was opened.
// Decoy files without the special characters ("ab.srt" next to "a\b.srt", "its.srt" next to "it's.srt") hold different text:
// if the filter opens the wrong file without an error, the pixels say so.
// Readers (each case is classified twice, independently):
//   reader 1  raw decoded gray frame in Node, compared byte for byte with the no-subtitle control frame and with the reference frame (same file, safe name)
//   reader 2  ffmpeg framemd5 of the same frame, compared with the control hash and the reference hash
// Classes: right (pixels equal the reference: the intended file was burned), wrong (burned, but another file), none (identical to the control: nothing burned), error (ffmpeg stopped).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 480, H = 270;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// level 1 = the option level (the string of one filter), level 2 = the filtergraph level (the whole -vf string)
export const esc1 = (p) => p.replace(/[\\':]/g, (m) => '\\' + m);
export const esc1eq = (p) => p.replace(/[\\':=]/g, (m) => '\\' + m);
export const esc2 = (p) => p.replace(/[\\'\[\],;]/g, (m) => '\\' + m);
export const quote = (p) => "'" + p.replace(/'/g, "'\\''") + "'";
export const STRATS = {
  raw: {label: 'none', make: (p) => 'subtitles=' + p},
  one: {label: 'one level', make: (p) => 'subtitles=' + esc1(p)},
  two: {label: 'two levels', make: (p) => 'subtitles=' + esc2(esc1(p))},
  quoted: {label: 'quotes', make: (p) => 'subtitles=' + quote(p)},
  quotedOne: {label: 'quotes + one level', make: (p) => 'subtitles=' + quote(esc1(p))},
  twoEq: {label: 'two levels, equals escaped too', make: (p) => 'subtitles=' + esc2(esc1eq(p))},
};
export const STRAT_IDS = Object.keys(STRATS);

// the paths under test (relative to the fixture folder); the first is the known positive
export const PATHS = [
  {id: 'plain', rel: 'sub.srt', what: 'plain name'},
  {id: 'space', rel: 'my subs.srt', what: 'space'},
  {id: 'colon', rel: 'a:b.srt', what: 'colon'},
  {id: 'apos', rel: "it's.srt", what: 'apostrophe'},
  {id: 'bracket', rel: 'a[1].srt', what: 'square brackets'},
  {id: 'comma', rel: 'a,b.srt', what: 'comma'},
  {id: 'backslash', rel: 'a\\b.srt', what: 'backslash'},
  {id: 'semicolon', rel: 'a;b.srt', what: 'semicolon'},
  {id: 'equals', rel: 'a=b.srt', what: 'equals sign'},
  {id: 'dirspace', rel: 'dir with space/sub.srt', what: 'space in a folder'},
  {id: 'dircolon', rel: 'C:/sub.srt', what: 'folder named C: (the look of a Windows drive; a Linux folder here)'},
  {id: 'dirapos', rel: "dir's/sub.srt", what: 'apostrophe in a folder'},
];
export const KINDS = ['rel', 'dot', 'abs'];
export const DECOYS = [{rel: 'ab.srt', text: 'DECOY AB'}, {rel: 'its.srt', text: 'DECOY ITS'}, {rel: 'dirs/sub.srt', text: 'DECOY DIRS'}];

const textOf = (i) => `FILE NUMBER ${String(i + 1).padStart(2, '0')}`;
const cue = (text) => `1\n00:00:00,000 --> 00:00:02,000\n${text}\n`;

const ffm = (args, opts = {}) => spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-y', ...args], {maxBuffer: 1 << 26, timeout: 30000, ...opts});
const SRC = `color=c=gray:s=${W}x${H}:r=5:d=2`;
const md5 = (b) => createHash('md5').update(b).digest('hex');

export function makeFixture(dir) {
  fs.mkdirSync(dir, {recursive: true});
  PATHS.forEach((p, i) => {
    const full = path.join(dir, p.rel);
    fs.mkdirSync(path.dirname(full), {recursive: true});
    fs.writeFileSync(full, cue(textOf(i)));
  });
  for (const d of DECOYS) { fs.mkdirSync(path.dirname(path.join(dir, d.rel)), {recursive: true}); fs.writeFileSync(path.join(dir, d.rel), cue(d.text)); }
  // reference copies with a safe name: the pixels the intended file must give
  PATHS.forEach((p, i) => fs.writeFileSync(path.join(dir, `ref${i}.srt`), cue(textOf(i))));
  return dir;
}

const rawFrame = (vf, cwd) => {
  const args = ['-f', 'lavfi', '-i', SRC, ...(vf ? ['-vf', vf] : []), '-frames:v', '1', '-pix_fmt', 'gray', '-f', 'rawvideo', '-'];
  const r = ffm(args, {cwd});
  return {status: r.status, stdout: r.stdout, stderr: String(r.stderr)};
};
const hashFrame = (vf, cwd) => {
  const args = ['-f', 'lavfi', '-i', SRC, ...(vf ? ['-vf', vf] : []), '-frames:v', '1', '-pix_fmt', 'gray', '-f', 'framemd5', '-'];
  const r = ffm(args, {cwd});
  const line = String(r.stdout).split(/\r?\n/).filter((l) => l && !l.startsWith('#')).pop() ?? '';
  return {status: r.status, md5: r.status === 0 ? line.split(',').pop().trim() : null};
};
const firstError = (s) => (s.split(/\r?\n/).map((l) => l.replace(/\[[^\]]*@ 0x[0-9a-f]+\]\s*/g, '').trim()).filter(Boolean)[0] ?? '');
const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

export function runExperiment(dir) {
  makeFixture(dir);
  const ev = {ffmpeg: ffmpegVersion(), libass: null, w: W, h: H, texts: PATHS.map((p, i) => textOf(i))};
  try {
    const l = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).stdout;
    ev.libassEnabled = /--enable-libass/.test(l);
  } catch { ev.libassEnabled = null; }
  try { ev.libass = spawnSync('dpkg-query', ['-W', '-f', '${Package} ${Version}', 'libass9'], {encoding: 'utf8'}).stdout.trim() || null; } catch { ev.libass = null; }

  // controls
  const ctrl = rawFrame(null, dir); const ctrlH = hashFrame(null, dir);
  ev.control = {status: ctrl.status, md5: ctrlH.md5, rawMd5: md5(ctrl.stdout), bytes: ctrl.stdout.length};
  const refs = PATHS.map((p, i) => ({raw: rawFrame(`subtitles=ref${i}.srt`, dir), h: hashFrame(`subtitles=ref${i}.srt`, dir)}));
  ev.references = refs.map((r, i) => ({id: PATHS[i].id, status: r.raw.status, md5: r.h.md5, burned: r.raw.status === 0 ? diffCount(r.raw.stdout, ctrl.stdout) : null}));
  ev.decoys = DECOYS.map((d) => {
    const name = d.rel; const r = rawFrame(`subtitles=${name}`, dir); const h = hashFrame(`subtitles=${name}`, dir);
    return {rel: name, status: r.status, md5: h.md5, burned: diffCount(r.stdout, ctrl.stdout)};
  });

  const classify = (res, hres, i) => {
    if (res.status !== 0) return {a: 'error', b: 'error'};
    const ref = refs[i];
    const a = res.stdout.equals(ctrl.stdout) ? 'none' : res.stdout.equals(ref.raw.stdout) ? 'right' : 'wrong';
    const b = hres.md5 === ctrlH.md5 ? 'none' : hres.md5 === ref.h.md5 ? 'right' : 'wrong';
    return {a, b};
  };

  ev.cases = [];
  PATHS.forEach((p, i) => {
    for (const kind of KINDS) {
      const P = kind === 'rel' ? p.rel : kind === 'dot' ? './' + p.rel : path.join(dir, p.rel);
      for (const s of STRAT_IDS) {
        const vf = STRATS[s].make(P);
        const res = rawFrame(vf, dir); const hres = hashFrame(vf, dir);
        const {a, b} = classify(res, hres, i);
        ev.cases.push({path: p.id, kind, strat: s, vf: vf.split(dir).join('/tmp/fx'), status: res.status, error: res.status === 0 ? '' : firstError(res.stderr),
          classA: a, classB: b, burned: res.status === 0 ? diffCount(res.stdout, ctrl.stdout) : null, md5: hres.md5});
      }
    }
  });

  // the shell as a third layer: the same two-level string typed three ways
  // POSIX only: a Windows PC has no /bin/sh, and cmd.exe quotes differently, so there the shell layer is skipped (ev.shellSkipped) and the other layers are unaffected
  ev.shell = [];
  ev.shellSkipped = !(process.platform !== 'win32' && fs.existsSync('/bin/sh'));
  const shellIds = ev.shellSkipped ? [] : ['colon', 'apos'];
  for (const id of shellIds) {
    const i = PATHS.findIndex((p) => p.id === id); const p = PATHS[i];
    const two = STRATS.two.make(path.join(dir, p.rel)).slice('subtitles='.length);
    for (const how of ['bare', 'double', 'single']) {
      const arg = how === 'bare' ? `subtitles=${two}` : how === 'double' ? `"subtitles=${two}"` : quote(`subtitles=${two}`);
      const cmd = `ffmpeg -v error -nostdin -y -f lavfi -i "${SRC}" -vf ${arg} -frames:v 1 -pix_fmt gray -f rawvideo -`;
      const r = spawnSync('/bin/sh', ['-c', cmd], {cwd: dir, maxBuffer: 1 << 26, timeout: 30000});
      const cls = r.status !== 0 ? 'error' : Buffer.from(r.stdout).equals(ctrl.stdout) ? 'none' : Buffer.from(r.stdout).equals(refs[i].raw.stdout) ? 'right' : 'wrong';
      const hcmd = cmd.replace('-f rawvideo -', '-f framemd5 -');
      const h = spawnSync('/bin/sh', ['-c', hcmd], {cwd: dir, maxBuffer: 1 << 26, timeout: 30000});
      const line = String(h.stdout).split(/\r?\n/).filter((l) => l && !l.startsWith('#')).pop() ?? '';
      const hm = h.status === 0 ? line.split(',').pop().trim() : null;
      const clsB = h.status !== 0 ? 'error' : hm === ctrlH.md5 ? 'none' : hm === refs[i].h.md5 ? 'right' : 'wrong';
      ev.shell.push({path: id, how, typed: arg.split(dir).join('/tmp/fx'), classA: cls, classB: clsB, error: r.status === 0 ? '' : firstError(String(r.stderr))});
    }
  }

  // why a relative name with a colon fails even when escaped: ffprobe (a third tool) reads "a:" as a protocol name
  const probe = (name) => {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=format_name', '-of', 'csv=p=0', name], {cwd: dir, encoding: 'utf8', timeout: 20000});
    return {status: r.status, format: r.status === 0 ? r.stdout.trim() : '', error: r.status === 0 ? '' : firstError(r.stderr)};
  };
  ev.protocol = {bare: probe('a:b.srt'), dot: probe('./a:b.srt'), file: probe('file:a:b.srt')};

  // negative control for "wrong": take the lookalike files away and the same strings stop opening anything
  for (const d of DECOYS) fs.rmSync(path.join(dir, d.rel), {force: true});
  ev.noDecoy = ['apos', 'backslash', 'dirapos'].map((id) => {
    const p = PATHS.find((q) => q.id === id);
    const vf = STRATS.raw.make(p.rel);
    const r = rawFrame(vf, dir); const h = hashFrame(vf, dir);
    return {path: id, status: r.status, statusB: h.status, error: r.status === 0 ? '' : firstError(r.stderr), burned: r.status === 0 ? diffCount(r.stdout, ctrl.stdout) : null};
  });
  return ev;
}

export const cell = (ev, pathId, kind, strat) => ev.cases.find((c) => c.path === pathId && c.kind === kind && c.strat === strat);
export const rowOf = (ev, pathId, kind) => Object.fromEntries(STRAT_IDS.map((s) => [s, cell(ev, pathId, kind, s).classA]));
