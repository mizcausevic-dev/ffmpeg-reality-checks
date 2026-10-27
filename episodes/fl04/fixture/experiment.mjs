// Deep dive 04 fixture: "I changed the frame rate, the speed or the length. How many frames and how many seconds do I really get?"
// Five chapters, each re-run live from the fixture of its own film (relative imports, nothing is copied):
//   ff05  variable to constant frame rate     ff16  -r before and after -i     ff25  which frame fps=1 keeps
//   ff29  setpts speed change and the audio    ff33  -stream_loop length
// New here: one composite recipe, run on a fresh fixture and read by two independent readers, with two controls.
//   recipe  ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv
//   source  10 s, 30 fps, 300 frames that each carry their own code (frame code N = Y + 256 * ((Cb - 128) / 20)) and a 440 Hz sine, FFV1 + PCM in Matroska
//   readers reader 1: ffprobe (packet timestamps, container duration)   reader 2: a decode (frame md5, decoded frame code, decoded timestamps, decoded sample count, pitch)
//   controls four near misses, each one a known positive for one reader:
//     passthrough  the obvious fix from episode 29: all frames, but timestamps that repeat (the filter time base is 1/30 s)
//     rFlag        -r 60 after the input: one frame too many
//     noAtempo     picture sped up, audio not
//     defaultFps   no output rate named: half the frames
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion, packetPts} from '../../../tools/ff.mjs';
import {runExperiment as run05} from '../../ff05/fixture/experiment.mjs';
import {runExperiment as run16} from '../../ff16/fixture/experiment.mjs';
import {runExperiment as run25} from '../../ff25/fixture/experiment.mjs';
import {runExperiment as run29, readOutput, frameMd5} from '../../ff29/fixture/experiment.mjs';
import {runExperiment as run33, buildOf} from '../../ff33/fixture/experiment.mjs';

export {buildOf};
const SIZE = 64, RATE = 44100, PLAYS = 3, FRAMES = 300;
export const RECIPE = {
  recipe:      {command: 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv',                          args: ['-vf', 'setpts=0.5*PTS,fps=60', '-af', 'atempo=2']},
  passthrough: {command: 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS -af atempo=2 -fps_mode passthrough out.mkv',          args: ['-vf', 'setpts=0.5*PTS', '-af', 'atempo=2', '-fps_mode', 'passthrough']},
  rFlag:       {command: 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS -af atempo=2 -r 60 out.mkv',                            args: ['-vf', 'setpts=0.5*PTS', '-af', 'atempo=2', '-r', '60']},
  noAtempo:    {command: 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS,fps=60 out.mkv',                                         args: ['-vf', 'setpts=0.5*PTS,fps=60']},
  defaultFps:  {command: 'ffmpeg -stream_loop 2 -i src.mkv -vf setpts=0.5*PTS -af atempo=2 out.mkv',                                  args: ['-vf', 'setpts=0.5*PTS', '-af', 'atempo=2']},
};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };
const range = (n) => [...Array(n).keys()];
const round3 = (x) => Math.round(x * 1000) / 1000;

// reader 2 for time: pts of every decoded frame (framemd5, in the stream time base)
function decodedPts(file) {
  const out = run('ffmpeg', ['-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'framemd5', '-an', '-']);
  const tb = out.split(/\r?\n/).find((l) => l.startsWith('#tb 0:')).match(/(\d+)\/(\d+)/);
  return out.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => Number(l.split(',')[1]) * Number(tb[1]) / Number(tb[2]));
}
const gapsMs = (pts) => pts.slice(1).map((t, i) => (t - pts[i]) * 1000);
const stamps = (pts) => { const g = gapsMs(pts); return {distinct: new Set(pts.map((t) => Math.round(t * 1000))).size, repeats: g.filter((x) => Math.abs(x) < 0.5).length, minGapMs: round3(Math.min(...g)), maxGapMs: round3(Math.max(...g)), firstMs: pts.slice(0, 24).map((t) => Math.round(t * 1000))}; };

export function runRecipe(dir) {
  fs.mkdirSync(dir, {recursive: true});
  ff(['-f', 'lavfi', '-i', `color=c=gray:s=${SIZE}x${SIZE}:r=30:d=10,format=yuv420p,geq=lum='mod(N,256)':cb='128+floor(N/256)*20':cr=128`,
      '-f', 'lavfi', '-i', `sine=f=440:r=${RATE}:d=10`, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', 'src.mkv'], dir);
  const srcMd5 = frameMd5(path.join(dir, 'src.mkv'));
  const out = {source: {fps: 30, seconds: 10, frames: srcMd5.length, unique: new Set(srcMd5).size, sineHz: 440, plays: PLAYS}, runs: {}};
  for (const [name, c] of Object.entries(RECIPE)) {
    ff(['-stream_loop', String(PLAYS - 1), '-i', 'src.mkv', ...c.args, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', `${name}.mkv`], dir);
    const f = path.join(dir, `${name}.mkv`), r = readOutput(f, srcMd5);
    out.runs[name] = {command: c.command, ...r, stamps: {packets: stamps(packetPts(f)), decoded: stamps(decodedPts(f))}};
  }
  return out;
}

// each stage writes its own sub folder; the results are plain data, so the folder is removed right after the stage (the lossless clips add up) unless keep is true
export function runExperiment(dir, {keep = false} = {}) {
  fs.mkdirSync(dir, {recursive: true});
  const v = ffmpegVersion();
  const stage = (name, fn) => { const d = path.join(dir, name), r = fn(d); if (!keep) fs.rmSync(d, {recursive: true, force: true}); return r; };
  return {
    ffmpeg: v, build: buildOf(v),
    ff05: stage('ff05', run05),
    ff16: stage('ff16', run16),
    ff25: stage('ff25', run25),
    ff29: stage('ff29', run29),
    ff33: stage('ff33', run33),
    recipe: stage('recipe', runRecipe),
    // statements about ffmpeg 8.1.2 that this container cannot run: copied from the published rows, checked against SERIES_OUTLINE.md by the test
    otherBuild: {build: '8.1.2', measuredHere: false, from: 'SERIES_OUTLINE.md rows 05 and 33 (PC runs)', ff05DefaultFrames: 93, ff05CfrFrames: 151, ff33ShortAudioFrames: 359, ff33ShortAudioSeconds: 11.97},
  };
}

// The numbers the scenes draw (Scenes.tsx of fl04 and fs04 carry this object between EV markers; the tests compare it with the evidence).
const r2 = (x) => Math.round(x * 100) / 100, r1 = (x) => Math.round(x * 10) / 10;
export function sceneNumbers(ev) {
  const R = ev.recipe.runs, v5 = ev.ff05.variants, f16 = ev.ff16.runs, f25 = ev.ff25.runs, f29 = ev.ff29.runs, f33 = ev.ff33.runs;
  // the clip of episode 5 keeps frame n of 150 unless n % 4 == 2 or 60 <= n <= 85 (the SELECT rule of its fixture)
  const vfrKept = range(150).filter((n) => !(n % 4 === 2) && !(n >= 60 && n <= 85));
  return {
    build: ev.build === 'v6' ? '6.1.1' : ev.ffmpeg,
    hook: {recipeMs: R.recipe.stamps.packets.firstMs, passMs: R.passthrough.stamps.packets.firstMs, frames: R.recipe.video.framesDecoded, distinctRecipe: R.recipe.stamps.packets.distinct, distinctPass: R.passthrough.stamps.packets.distinct},
    vfr: {frames: ev.ff05.source.frames, seconds: Math.round(ev.ff05.source.duration), gapsMs: ev.ff05.source.distinctGapsMs, avgFps: r1(ev.ff05.source.avgFps), baseFps: 30, kept: vfrKept, slots: 150},
    cfr: {source: ev.ff05.source.frames, passthrough: v5.passthrough.frames, def: {frames: v5.default.frames, dups: v5.default.duplicatesByCounter}, cfr30: {frames: v5.cfr_30.frames, dups: v5.cfr_30.duplicatesByCounter}, cfr25: {frames: v5.cfr_25.frames, dups: v5.cfr_25.duplicatesByCounter}, cfr60: {frames: v5.cfr_60.frames, dups: v5.cfr_60.duplicatesByCounter}, distinct: v5.default.uniqueFrames, publishedDefault: ev.otherBuild.ff05DefaultFrames},
    rflag: {srcFrames: ev.ff16.source.frames, srcSec: ev.ff16.source.seconds, after: {frames: f16.after.inside.framesDecoded, sec: r1(f16.after.declared.duration)}, fps: {frames: f16.fps_filter.inside.framesDecoded, sec: r1(f16.fps_filter.declared.duration)}, before: {frames: f16.before.inside.framesDecoded, sec: r1(f16.before.declared.duration)}, copy: {fps: f16.before_copy.declared.fps, sec: r1(f16.before_copy.declared.duration)}},
    fps1: {near: f25.s25_near.byMd5.slice(0, 5), up: f25.s25_up.byMd5.slice(0, 3), firstAt: r2(f25.s25_near.byMd5[0] / f25.s25_near.fps), fps: 25, s60: f25.s60_to_24.byMd5.slice(0, 6), s60Out: f25.s60_to_24.byMd5.length},
    setpts: {picture: r2(f29.video.video.endPackets), audio: r1(f29.video.audio.endPackets), container: r1(f29.video.container), kept: f29.video.video.framesDecoded, of: ev.ff29.source.frames, keptFirst: f29.video.byMd5.slice(0, 9), sec: ev.ff29.source.seconds},
    atempo: {audio: Math.round(f29.tempo.audio.endDecoded), picture: r2(f29.tempo.video.endPackets), hz: f29.tempo.pitch.goertzel, rateAudio: Math.round(f29.rate.audio.endDecoded), rateHz: f29.rate.pitch.goertzel},
    loop: {eq: {frames: f33['eq-enc'].video.framesDecoded, sec: Math.round(f33['eq-enc'].container)}, short: {frames: f33['short-enc'].video.framesDecoded, sec: r2(f33['short-enc'].video.endPackets), heads: f33['short-enc'].video.missingAtStart, audioSec: 3.9}, published: {frames: ev.otherBuild.ff33ShortAudioFrames, sec: ev.otherBuild.ff33ShortAudioSeconds, heads: [0, 0, 1]}, plays: 3, playSec: 4},
    loop2: {longAudio: {audioSec: 4.1, sec: r1(f33['long-enc'].container), hole: r2(f33['long-enc'].video.gaps[0].gap), holes: f33['long-enc'].video.gaps.length}, copy: {frames: f33['short-copy'].video.framesDecoded, hole: r1(f33['short-copy'].audio.gaps[0].gap), holes: f33['short-copy'].audio.gaps.length, soundSec: r1(f33['short-copy'].audio.endDecoded)}},
    recipe: {frames: R.recipe.video.framesDecoded, distinct: R.recipe.stamps.packets.distinct, gapMin: R.recipe.stamps.packets.minGapMs, gapMax: R.recipe.stamps.packets.maxGapMs, sec: Math.round(R.recipe.container), hz: R.recipe.pitch.goertzel, plays: ev.recipe.source.plays, srcFrames: ev.recipe.source.frames},
    controls: {rFlag: {frames: R.rFlag.video.framesDecoded, first: R.rFlag.byMd5.slice(0, 3)}, noAtempo: {audio: Math.round(R.noAtempo.audio.endDecoded), picture: Math.round(R.noAtempo.video.endDecoded)}, defaultFps: {frames: R.defaultFps.video.framesDecoded, first: R.defaultFps.byMd5.slice(0, 8)}},
  };
}
