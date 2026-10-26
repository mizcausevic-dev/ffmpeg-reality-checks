// Episode 04 fixture: "Does a slower x264 preset make better video at the same CRF?"
// Synthetic sources only (ffmpeg lavfi testsrc2 and mandelbrot), compared against a lossless copy of the same source.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run, ffmpegVersion} from '../../../tools/ff.mjs';

export const PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower'];
export const CRF = 23;
export const CLIPS = {
  testsrc2: {label: 'testsrc2 (test pattern)', lavfi: 'testsrc2=size=640x360:rate=25:duration=10', extra: []},
  mandelbrot: {label: 'mandelbrot (zoom)', lavfi: 'mandelbrot=size=640x360:rate=25', extra: ['-t', '10']},
};

function ssim(distorted, reference) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-nostats', '-i', distorted, '-i', reference, '-lavfi', 'ssim', '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`ssim failed: ${r.stderr}`);
  const m = /All:([\d.]+)/.exec(r.stderr);
  return m ? parseFloat(m[1]) : null;
}
const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,pix_fmt,width,height', '-of', 'json', file])).streams[0];
// x264 writes its own version into the stream (an SEI text). Reading it from the bytes is independent of ffmpeg's banner.
const x264core = (file) => { const m = /x264 - core (\d+)/.exec(fs.readFileSync(file).subarray(0, 4096).toString('latin1')); return m ? Number(m[1]) : null; };

export function runExperiment(dir, {presets = PRESETS} = {}) {
  fs.mkdirSync(dir, {recursive: true});
  const out = {ffmpeg: ffmpegVersion(), crf: CRF, presets, clips: {}};
  for (const [name, c] of Object.entries(CLIPS)) {
    const ref = path.join(dir, `ref_${name}.mp4`);
    run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', c.lavfi, ...c.extra, '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv420p', ref]);
    const rp = probe(ref);
    const rows = [];
    for (const preset of presets) {
      const f = path.join(dir, `${name}_${preset}.mp4`);
      const t0 = process.hrtime.bigint();
      run('ffmpeg', ['-v', 'error', '-y', '-i', ref, '-c:v', 'libx264', '-preset', preset, '-crf', String(CRF), f]);
      const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
      const p = probe(f);
      rows.push({preset, bytes: fs.statSync(f).size, ssim: ssim(f, ref), ms, frames: Number(p.nb_read_frames), pixFmt: p.pix_fmt, x264core: x264core(f)});
    }
    out.clips[name] = {label: c.label, refFrames: Number(rp.nb_read_frames), refBytes: fs.statSync(ref).size, ssimSelf: ssim(ref, ref), rows};
  }
  return out;
}
