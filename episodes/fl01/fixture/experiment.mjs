// Deep dive 01 fixture: "Cutting: where does my cut really start, and where does it end?"
// The five source films are re-run live (their own fixture functions are imported, nothing is copied):
//   ff01  -ss before or after -i, with -c copy         ff23  -ss with -to, and where each goes
//   ff21  -g 100 is a maximum, scene cuts add keyframes   ff32  -sseof, copy and re-encode, container end
//   ff15  -shortest with -c copy
// New here: the "recipe" check. One fresh coded clip (frame N carries its own number in the pixels), the recommended
// commands run on it, and the result read two independent ways:
//   reader 1  frame md5 of every decoded frame, matched back to the source
//   reader 2  the frame number decoded from the pixels (Y byte and Cb byte), see ff32
// plus ffprobe packet counts, to see the hidden pre-roll that a copy can carry.
// Controls: the naive command (-ss after -i with -c copy) must FAIL the same check, and a reference cut built by frame
// number with the select filter must PASS it. Synthetic input only. Disk use is kept small: every sub-experiment is
// deleted once its numbers are read.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion, keyframeTimes} from '../../../tools/ff.mjs';
import {runExperiment as run01} from '../../ff01/fixture/experiment.mjs';
import {runExperiment as run15, declared, decoded} from '../../ff15/fixture/experiment.mjs';
import {runExperiment as run21} from '../../ff21/fixture/experiment.mjs';
import {runExperiment as run23} from '../../ff23/fixture/experiment.mjs';
import {runExperiment as run32, readOutput, frameMd5} from '../../ff32/fixture/experiment.mjs';

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// the cut we ask for in the recipe: 3 s starting at 7.5 s, on a 20 s clip at 30 fps (7.5 s is exactly frame 225)
export const ASK = {fps: 30, seconds: 20, frames: 600, start: 7.5, length: 3, startFrame: 225, wantFrames: 90, gopSeconds: 5};
export const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
export const FORCED_AT = [7.5, 10.5]; // keyframes forced at the cut points (start and end of the asked-for clip)
export const WANT = range(ASK.startFrame, ASK.startFrame + ASK.wantFrames - 1);

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const X264 = ['-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p'];

// name -> {command shown on screen, input file, args before -i, args after -i}
export const RECIPE_CASES = {
  reencode:            {command: 'ffmpeg -ss 7.5 -i in.mp4 -t 3 -c:v libx264 -crf 0 out.mp4', src: 'grid',     pre: ['-ss', '7.5'], post: ['-t', '3', ...X264]},
  naive_copy:          {command: 'ffmpeg -i in.mp4 -ss 7.5 -t 3 -c copy out.mp4',            src: 'grid',     pre: [],             post: ['-ss', '7.5', '-t', '3', '-c', 'copy']},
  copy_on_grid:        {command: 'ffmpeg -ss 7.5 -i in.mp4 -t 3 -c copy out.mp4',            src: 'grid',     pre: ['-ss', '7.5'], post: ['-t', '3', '-c', 'copy']},
  copy_prepared:       {command: 'ffmpeg -ss 7.5 -i in.mp4 -t 3 -c copy out.mp4',            src: 'prepared', pre: ['-ss', '7.5'], post: ['-t', '3', '-c', 'copy']},
  copy_prepared_after: {command: 'ffmpeg -i in.mp4 -ss 7.5 -t 3 -c copy out.mp4',            src: 'prepared', pre: [],             post: ['-ss', '7.5', '-t', '3', '-c', 'copy']},
};

// the cut is right when BOTH readers name exactly the wanted source frames
export function verdict(r) {
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const md5 = same(r.byMd5, WANT), code = same(r.byCode, WANT);
  return {md5, code, exact: md5 && code, hiddenPackets: r.packets - r.decodedFrames};
}

export function recipe(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const secs = ASK.seconds;
  ff(['-f', 'lavfi', '-i', `color=c=gray:s=64x64:r=${ASK.fps}:d=${secs},format=yuv420p,geq=lum='mod(N,256)':cb='128+floor(N/256)*20':cr=128`, '-c:v', 'ffv1', 'base.mkv'], dir);
  const g = String(ASK.fps * ASK.gopSeconds);
  // grid: a keyframe every 5 s, nothing else (the ff01 situation). prepared: the same plus keyframes forced at the cut points 7.5 s and 10.5 s.
  ff(['-i', 'base.mkv', ...X264, '-g', g, '-keyint_min', g, '-sc_threshold', '0', 'grid.mp4'], dir);
  ff(['-i', 'base.mkv', ...X264, '-g', g, '-sc_threshold', '0', '-force_key_frames', FORCED_AT.join(','), 'prepared.mp4'], dir);
  // reference built by frame number, not by time: the known-good control
  ff(['-i', 'base.mkv', '-vf', `select=between(n\\,${WANT[0]}\\,${WANT[WANT.length - 1]}),setpts=N/(${ASK.fps}*TB)`, '-c:v', 'ffv1', 'reference.mkv'], dir);
  const srcMd5 = frameMd5(path.join(dir, 'base.mkv'));
  const frameOf = (f) => keyframeTimes(path.join(dir, f)).map((t) => Math.round(t * ASK.fps));
  const out = {
    source: {frames: srcMd5.length, unique: new Set(srcMd5).size, fps: ASK.fps, seconds: secs, ask: {start: ASK.start, length: ASK.length, startFrame: ASK.startFrame, frames: ASK.wantFrames}, forcedAt: FORCED_AT,
      keyframes: {grid: frameOf('grid.mp4'), prepared: frameOf('prepared.mp4')},
      md5Same: {grid: JSON.stringify(frameMd5(path.join(dir, 'grid.mp4'))) === JSON.stringify(srcMd5), prepared: JSON.stringify(frameMd5(path.join(dir, 'prepared.mp4'))) === JSON.stringify(srcMd5)}},
    control: {reference: {...readOutput(path.join(dir, 'reference.mkv'), srcMd5)}},
    runs: {},
  };
  out.control.reference.verdict = verdict(out.control.reference);
  for (const [name, c] of Object.entries(RECIPE_CASES)) {
    ff([...c.pre, '-i', `${c.src}.mp4`, ...c.post, `out_${name}.mp4`], dir);
    const r = readOutput(path.join(dir, `out_${name}.mp4`), srcMd5);
    out.runs[name] = {command: c.command, source: c.src, ...r, verdict: verdict(r)};
  }
  // the end of a cut: video 5 s (125 frames) with a 3 s tone, -shortest against an explicit -t 3, both with -c copy
  ff(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', 'video5s.mp4'], dir);
  ff(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:a', 'aac', 'tone3s.m4a'], dir);
  out.ends = {};
  for (const [name, c] of Object.entries({
    shortest: {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c copy -shortest out.mp4', args: ['-c', 'copy', '-shortest']},
    t3:       {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c copy -t 3 out.mp4',      args: ['-c', 'copy', '-t', '3']},
    t3_enc:   {command: 'ffmpeg -i video5s.mp4 -i tone3s.m4a -c:v libx264 -c:a aac -t 3 out.mp4', args: ['-c:v', 'libx264', '-c:a', 'aac', '-t', '3']},
  })) {
    ff(['-i', 'video5s.mp4', '-i', 'tone3s.m4a', ...c.args, `end_${name}.mp4`], dir);
    const f = path.join(dir, `end_${name}.mp4`), d = declared(f);
    out.ends[name] = {command: c.command, declared: d, decoded: decoded(f, d, dir)};
  }
  return out;
}

// one sub-experiment in its own folder, deleted after its numbers are read
const once = (dir, name, fn) => { const d = path.join(dir, name); try { return fn(d); } finally { fs.rmSync(d, {recursive: true, force: true}); } };

export function runAll(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const version = ffmpegVersion();
  const ff01 = once(dir, 'ff01', (d) => { const {frameLookup, srcMd5, ...ev} = run01(d); return {...ev, lookup: {first: frameLookup(srcMd5[0]), last: frameLookup(srcMd5[srcMd5.length - 1]), unknown: frameLookup('0'.repeat(32))}}; });
  const ff15 = once(dir, 'ff15', run15);
  const ff21 = once(dir, 'ff21', run21);
  const ff23 = once(dir, 'ff23', run23);
  const ff32 = once(dir, 'ff32', run32);
  const rec = once(dir, 'recipe', recipe);
  return {ffmpeg: version, build: buildOf(version), sources: {ff01, ff15, ff21, ff23, ff32}, recipe: rec};
}
