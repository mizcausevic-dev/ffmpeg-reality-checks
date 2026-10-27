// Deep dive 03 fixture: "Why colors shift: is it the label, or the pixels?"
// It re-runs six existing fixtures live (no numbers are copied) and adds one new measurement, the recipe check:
//   ff17  matrix tag      (BT.601 pixels without a tag, a tag on the wrong pixels)
//   ff76  gray conversion (format=gray, hue=s=0, the mixer: who follows the file, who follows its own weights)
//   ff26  range           (16 to 235 against 0 to 255, and -color_range pc)
//   ff44  HDR to SDR      (100 nit white lands at 127, tags that survive, tags that are rewritten)
//   ff22  chroma          (yuv420p turns a one pixel red line purple)
//   ff85  bit depth       (10 bit to 8 bit: does format=yuv420p band, do the dither options matter)
// New here: the recipe. A fresh RGB card (red, green, blue, mid gray, black, white) is encoded with the recommended command and read back
// two independent ways, next to three controls:
//   recipe   scale=out_color_matrix=bt709:out_range=tv,format=yuv420p plus the three bt709 tags      (the recommendation)
//   plain    the default command, no tag, BT.601 pixels                                              (known positive for the label and pixel readers)
//   tagOnly  -colorspace bt709 on the default conversion                                             (a label that lies on 6.1.1)
//   full     -pix_fmt yuvj420p                                                                       (known positive for the range readers)
//   reader 1  ffprobe: the label (pix_fmt, color_space, color_primaries, color_transfer, color_range)
//   reader 2  the decoded RGB value at the center of each patch, read three ways (following the file, BT.601, BT.709), compared with the source
//   reader 3  the luma byte of the black and white patches: the raw plane in Node, and ffmpeg signalstats YMIN / YMAX on a crop (two range readers)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';
import {runExperiment as run17} from '../../ff17/fixture/experiment.mjs';
import {runExperiment as run22} from '../../ff22/fixture/experiment.mjs';
import {runExperiment as run26} from '../../ff26/fixture/experiment.mjs';
import {runExperiment as run44} from '../../ff44/fixture/experiment.mjs';
import {runExperiment as run76} from '../../ff76/fixture/experiment.mjs';
import {runExperiment as run85} from '../../ff85/fixture/experiment.mjs';

export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

// ---- the recipe fixture -------------------------------------------------------------------------------------------------------------
export const PATCHES = {red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255], gray: [128, 128, 128], black: [0, 0, 0], white: [255, 255, 255]};
export const PATCH_W = 200, H = 720;
const CENTER = Object.fromEntries(Object.keys(PATCHES).map((n, i) => [n, i * PATCH_W + PATCH_W / 2]));
const BT709_TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
export const RECIPE_COMMAND = 'ffmpeg -i in.png -vf scale=out_color_matrix=bt709:out_range=tv,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 out.mp4';
export const ENCODES = {
  recipe:  {command: RECIPE_COMMAND, vf: 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', args: BT709_TAGS},
  plain:   {command: 'ffmpeg -i in.png -c:v libx264 -pix_fmt yuv420p out.mp4', vf: 'format=yuv420p', args: []},
  tagOnly: {command: 'ffmpeg -i in.png -colorspace bt709 -c:v libx264 -pix_fmt yuv420p out.mp4', vf: 'format=yuv420p', args: ['-colorspace', 'bt709']},
  full:    {command: 'ffmpeg -i in.png -c:v libx264 -pix_fmt yuvj420p out.mp4', vf: 'format=yuvj420p', args: []},
};
export const READINGS = {auto: '', bt601: 'scale=in_color_matrix=bt601,', bt709: 'scale=in_color_matrix=bt709,'};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

function probeTags(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt,color_space,color_primaries,color_transfer,color_range', '-of', 'json', file]));
  const s = j.streams[0];
  return {pixFmt: s.pix_fmt ?? null, colorSpace: s.color_space ?? null, colorPrimaries: s.color_primaries ?? null, colorTransfer: s.color_transfer ?? null, range: s.color_range ?? null};
}
function pixel(file, prefix, x, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `${prefix}format=rgb24,crop=1:1:${x}:${H / 2}`, '-frames:v', '1', '-f', 'rawvideo', '-'], {cwd, maxBuffer: 1 << 26});
  if (r.status !== 0 || r.stdout.length < 3) throw new Error(`pixel read failed: ${r.stderr}`);
  return [r.stdout[0], r.stdout[1], r.stdout[2]];
}
// reader 3a: the native luma plane, first frame, no pix_fmt conversion
function rawLuma(file, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-'], {cwd, maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`raw read failed: ${r.stderr}`);
  const W = PATCH_W * Object.keys(PATCHES).length, y = (x) => r.stdout[(H / 2) * W + x];
  return {black: y(CENTER.black), white: y(CENTER.white), gray: y(CENTER.gray)};
}
// reader 3b: ffmpeg signalstats on a flat crop of one patch
function stats(file, name, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-vf', `crop=100:100:${CENTER[name] - 50}:${H / 2 - 50},signalstats,metadata=print:file=-`, '-f', 'null', '-'], {cwd, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`signalstats failed: ${r.stderr}`);
  const g = (k) => Number(new RegExp(`lavfi.signalstats.${k}=(\\d+)`).exec(r.stdout)[1]);
  return {min: g('YMIN'), max: g('YMAX')};
}

export function runRecipe(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const inputs = Object.keys(PATCHES).flatMap((n) => ['-f', 'lavfi', '-i', `color=0x${PATCHES[n].map((v) => v.toString(16).padStart(2, '0')).join('')}:s=${PATCH_W}x${H}:d=1,format=rgb24`]);
  ff([...inputs, '-filter_complex', '[0][1][2][3][4][5]hstack=6', '-frames:v', '1', 'in.png'], dir);
  const out = {command: RECIPE_COMMAND, source: PATCHES, encodes: {}};
  for (const [name, e] of Object.entries(ENCODES)) {
    ff(['-loop', '1', '-i', 'in.png', '-t', '1', '-r', '25', '-vf', e.vf, ...e.args, '-c:v', 'libx264', '-pix_fmt', e.vf.endsWith('yuvj420p') ? 'yuvj420p' : 'yuv420p', `${name}.mp4`], dir);
    const file = path.join(dir, `${name}.mp4`);
    const rec = {command: e.command, tag: probeTags(file), read: {}, rawY: rawLuma(file, dir), stats: {black: stats(file, 'black', dir), white: stats(file, 'white', dir)}};
    for (const [rname, prefix] of Object.entries(READINGS)) {
      const patches = {}; let worst = 0, worstColor = 0;
      for (const p of Object.keys(PATCHES)) {
        const px = pixel(file, prefix, CENTER[p], dir);
        patches[p] = px;
        const e1 = Math.max(...px.map((v, i) => Math.abs(v - PATCHES[p][i])));
        worst = Math.max(worst, e1);
        if (['red', 'green', 'blue'].includes(p)) worstColor = Math.max(worstColor, e1);
      }
      rec.read[rname] = {patches, worstError: worst, worstColorError: worstColor};
    }
    out.encodes[name] = rec;
  }
  return out;
}

// ---- the whole film ----------------------------------------------------------------------------------------------------------------
const strip = (ev) => JSON.parse(JSON.stringify(ev, (k, v) => (k === 'node' ? undefined : v))); // ff44 keeps raw planes under `node`

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ff17 = run17(path.join(dir, 'ff17')), ff22 = run22(path.join(dir, 'ff22')), ff26 = run26(path.join(dir, 'ff26'));
  const ff44 = strip(run44(path.join(dir, 'ff44')));
  const ff76 = run76(), ff85 = run85(path.join(dir, 'ff85'));
  const recipe = runRecipe(path.join(dir, 'recipe'));
  const version = ffmpegVersion();
  // The cross-film finding: three commands changed the label and left the pixels as they were (checked here, asserted in the test).
  const labelOnly = {
    matrix: JSON.stringify(ff17.encodes.liar.read.bt601.patches) === JSON.stringify(ff17.encodes.default.read.bt601.patches) && ff17.encodes.liar.tag.colorSpace === 'bt709',
    range: ff26.cases.pc_tag.rawMd5 === ff26.cases.default.rawMd5 && ff26.cases.pc_tag.color_range === 'pc',
    rangeBsf: ff26.cases.relabel_pc.rawMd5 === ff26.cases.default.rawMd5 && ff26.cases.relabel_pc.color_range === 'pc',
    transfer: !ff44.hdr.csIall.failed && JSON.stringify(ff44.hdr.csIall.y) === JSON.stringify(ff44.hdr.pix.y) && ff44.hdr.csIall.tags.color_transfer === 'bt709',
  };
  return {ffmpeg: version, build: buildOf(version), ff17, ff22, ff26, ff44, ff76, ff85, recipe, labelOnly};
}
