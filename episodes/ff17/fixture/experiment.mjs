// Episode 17 fixture: "Why do my video's colors shift after FFmpeg?"
// Synthetic source only: one 1280x720 picture of four solid patches (pure red, pure green, pure blue, mid gray), made by lavfi.
// It is encoded to H.264 four ways, then decoded back to RGB under three readings of the color matrix (what the file says, BT.601, BT.709).
//   reader 1  ffprobe: what the file declares (color_space and color_range tags)
//   reader 2  the decoded RGB value at the center of each patch, compared with the source values
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const PATCHES = {red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255], gray: [128, 128, 128]};
const CENTERS = {red: 160, green: 480, blue: 800, gray: 1120};
export const ENCODES = {
  default:     {command: 'ffmpeg -i in.png -c:v libx264 -pix_fmt yuv420p out.mp4',                                                       vf: 'format=yuv420p', tags: []},
  tagged709:   {command: 'ffmpeg -i in.png -vf scale=out_color_matrix=bt709 -colorspace bt709 -color_primaries bt709 -color_trc bt709 ...', vf: 'scale=out_color_matrix=bt709,format=yuv420p', tags: ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']},
  untagged709: {command: 'ffmpeg -i in.png -vf scale=out_color_matrix=bt709 out.mp4  (converted with BT.709, no tag)',                   vf: 'scale=out_color_matrix=bt709,format=yuv420p', tags: []},
  liar:        {command: 'ffmpeg -i in.png -colorspace bt709 out.mp4  (converted with the default matrix, tagged BT.709)',              vf: 'format=yuv420p', tags: ['-colorspace', 'bt709']},
};
export const READINGS = {auto: '', bt601: 'scale=in_color_matrix=bt601,', bt709: 'scale=in_color_matrix=bt709,'};

const ff = (args, cwd) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {encoding: 'utf8', cwd, maxBuffer: 1 << 26}); if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`); };

function pixel(file, prefix, x, cwd) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `${prefix}format=rgb24,crop=1:1:${x}:360`, '-frames:v', '1', '-f', 'rawvideo', '-'], {cwd, maxBuffer: 1 << 26});
  if (r.status !== 0 || r.stdout.length < 3) throw new Error(`pixel read failed: ${r.stderr}`);
  return [r.stdout[0], r.stdout[1], r.stdout[2]];
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const inputs = ['red', 'green', 'blue', 'gray'].flatMap((n) => ['-f', 'lavfi', '-i', `color=0x${PATCHES[n].map((v) => v.toString(16).padStart(2, '0')).join('')}:s=320x720:d=1,format=rgb24`]);
  ff([...inputs, '-filter_complex', '[0][1][2][3]hstack=4', '-frames:v', '1', 'in.png'], dir);
  const out = {ffmpeg: ffmpegVersion(), source: PATCHES, encodes: {}};
  for (const [name, e] of Object.entries(ENCODES)) {
    ff(['-loop', '1', '-i', 'in.png', '-t', '1', '-r', '25', '-vf', e.vf, ...e.tags, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', `${name}.mp4`], dir);
    const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=color_space,color_range', '-of', 'json', path.join(dir, `${name}.mp4`)]));
    const rec = {command: e.command, tag: {colorSpace: j.streams[0].color_space ?? null, range: j.streams[0].color_range ?? null}, read: {}};
    for (const [rname, prefix] of Object.entries(READINGS)) {
      const patches = {}; let worst = 0;
      for (const [p, x] of Object.entries(CENTERS)) {
        const px = pixel(path.join(dir, `${name}.mp4`), prefix, x, dir);
        patches[p] = px;
        worst = Math.max(worst, ...px.map((v, i) => Math.abs(v - PATCHES[p][i])));
      }
      rec.read[rname] = {patches, worstError: worst};
    }
    out.encodes[name] = rec;
  }
  return out;
}
