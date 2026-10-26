// Episode 47 fixture: "silenceremove only cuts the start: why?"
// Synthetic source only (lavfi): 4.0 s of mono 48000 Hz, 16 bit, a 440 Hz tone (amplitude 0.5) with three digital silences:
//   0.0 to 0.5 s silence | 0.5 to 1.5 s tone | 1.5 to 2.5 s silence | 2.5 to 3.5 s tone | 3.5 to 4.0 s silence    (192000 samples)
// Cases, each written to a 16 bit wav:
//   none      silenceremove with no options at all
//   start     silenceremove=start_periods=1:start_threshold=-50dB            (the line most examples paste)
//   stop1     silenceremove=stop_periods=1:stop_duration=0.3:stop_threshold=-50dB
//   stopAll   silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-50dB
//   both      start_periods=1 and stop_periods=-1, stop_duration=0.3
//   bothTight the same with stop_duration=0.1
//   bothTiny  the same with stop_duration=0.02
// Controls (known answers): atrim=start=0.5 removes exactly 24000 samples; "known" cuts all three silences by hand
//   (atrim and concat, tone 1 and tone 2 only) so the answer is 96000 samples, 0 silences, 2 tones.
// Readers:
//   reader 1  ffprobe: stream duration_ts of the wav (time base 1/48000, so it is the sample count), and ffmpeg silencedetect (its own silence list)
//   reader 2  Node: the raw decoded samples (count, md5 of the bytes, runs of near-zero samples, tone segments)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 48000, TOTAL = 192000;
export const LAYOUT = [['silence', 0.5], ['tone', 1.0], ['silence', 1.0], ['tone', 1.0], ['silence', 0.5]];
export const SILENCES = [24000, 48000, 24000]; // samples
export const THRESH_DB = -50;
export const THRESH_INT = Math.round(32768 * 10 ** (THRESH_DB / 20)); // 104
export const MIN_RUN = 2400; // a silence for the reader is at least 50 ms of samples at or under the threshold
export const WINDOW = 960; // the filter's default detection window: 20 ms
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const TH = `${THRESH_DB}dB`;
export const CASES = {
  none: {af: 'silenceremove', command: 'silenceremove'},
  start: {af: `silenceremove=start_periods=1:start_threshold=${TH}`, command: `silenceremove=start_periods=1:start_threshold=${TH}`},
  stop1: {af: `silenceremove=stop_periods=1:stop_duration=0.3:stop_threshold=${TH}`, command: `silenceremove=stop_periods=1:stop_duration=0.3:stop_threshold=${TH}`},
  stopAll: {af: `silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=${TH}`, command: `silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=${TH}`},
  both: {af: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.3:stop_threshold=${TH}`, command: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.3:stop_threshold=${TH}`, stopDuration: 0.3},
  bothTight: {af: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.1:stop_threshold=${TH}`, command: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.1:stop_threshold=${TH}`, stopDuration: 0.1},
  bothTiny: {af: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.02:stop_threshold=${TH}`, command: `silenceremove=start_periods=1:start_threshold=${TH}:stop_periods=-1:stop_duration=0.02:stop_threshold=${TH}`, stopDuration: 0.02},
  atrim: {af: 'atrim=start=0.5', command: 'atrim=start=0.5'},
  known: {fc: '[0:a]atrim=start=0.5:end=1.5,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=2.5:end=3.5,asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1', command: 'atrim 0.5 to 1.5 and 2.5 to 3.5, concat'},
};

const ffm = (args, opts = {}) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], {maxBuffer: 1 << 28, ...opts});
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${String(r.stderr)}`);
  return r;
};

export function makeSource(dir) {
  const file = path.join(dir, 'src.wav');
  ffm(['-f', 'lavfi', '-i', `aevalsrc=exprs='if(between(t,0.5,1.5)+between(t,2.5,3.5),0.5*sin(2*PI*440*t),0)':s=${SR}:d=4:c=mono`, '-c:a', 'pcm_s16le', file]);
  return file;
}
export function makeCase(src, dir, name) {
  const c = CASES[name], out = path.join(dir, `${name}.wav`);
  const args = ['-i', src];
  if (c.fc) args.push('-filter_complex', c.fc); else args.push('-af', c.af);
  args.push('-c:a', 'pcm_s16le', out);
  ffm(args);
  return out;
}

// ---------- reader 1: ffprobe and silencedetect ----------
export function probeSamples(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration_ts,time_base,sample_rate', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  const s = JSON.parse(r.stdout).streams[0];
  const [n, d] = s.time_base.split('/').map(Number);
  return {samples: Math.round(Number(s.duration_ts) * (n / d) * Number(s.sample_rate)), sampleRate: Number(s.sample_rate)};
}
// ffmpeg's own silence list at the same threshold and a 50 ms minimum: [{start, end}] in samples
export function silenceDetect(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', `silencedetect=noise=${TH}:d=0.05`, '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 26});
  const starts = [...r.stderr.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.round(Number(m[1]) * SR));
  const ends = [...r.stderr.matchAll(/silence_end: (-?[\d.]+)/g)].map((m) => Math.round(Number(m[1]) * SR));
  const total = probeSamples(file).samples;
  return starts.map((s, i) => ({start: Math.max(0, s), end: ends[i] ?? total}));
}

// ---------- reader 2: Node on the raw samples ----------
export function rawSamples(file) {
  const r = ffm(['-i', file, '-vn', '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], {});
  const b = r.stdout, n = Math.floor(b.length / 2), out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = b.readInt16LE(i * 2);
  return out;
}
export const md5Of = (x) => crypto.createHash('md5').update(Buffer.from(x.buffer, x.byteOffset, x.byteLength)).digest('hex');
// runs of samples whose magnitude is at or under the threshold, at least MIN_RUN long (zero crossings of the tone are far shorter)
export function silentRuns(x, thr = THRESH_INT, minRun = MIN_RUN) {
  const runs = []; let s = -1;
  for (let i = 0; i <= x.length; i++) {
    const quiet = i < x.length && Math.abs(x[i]) <= thr;
    if (quiet && s < 0) s = i;
    if (!quiet && s >= 0) { if (i - s >= minRun) runs.push({start: s, len: i - s}); s = -1; }
  }
  return runs;
}
export function toneSegments(x, runs) {
  const segs = []; let p = 0;
  for (const r of runs) { if (r.start > p) segs.push({start: p, len: r.start - p}); p = r.start + r.len; }
  if (p < x.length) segs.push({start: p, len: x.length - p});
  return segs;
}

export function measure(file) {
  const x = rawSamples(file), pr = probeSamples(file), runs = silentRuns(x), tones = toneSegments(x, runs), det = silenceDetect(file);
  return {
    samples: x.length, probeSamples: pr.samples, seconds: Math.round(x.length / SR * 1000) / 1000, md5: md5Of(x),
    silentRuns: runs, silences: runs.length, tones: tones.length, toneSamples: tones.reduce((a, s) => a + s.len, 0), toneSegs: tones,
    silenceDetect: det, detectSilences: det.length,
    firstSample: x[0], lastSample: x[x.length - 1],
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const src = makeSource(dir);
  const sx = rawSamples(src);
  const ev = {ffmpeg: ffmpegVersion(), source: {...measure(src), layout: LAYOUT}, srcMd5: md5Of(sx), runs: {}};
  ev.source.tailMd5 = (n) => md5Of(sx.slice(sx.length - n));
  const tail = (n) => md5Of(sx.slice(sx.length - n)), head = (n) => md5Of(sx.slice(0, n));
  for (const name of Object.keys(CASES)) {
    const f = makeCase(src, dir, name);
    const m = measure(f);
    ev.runs[name] = {command: CASES[name].command, ...m, equalsSourceTail: m.samples === TOTAL ? m.md5 === ev.srcMd5 : m.md5 === tail(m.samples), equalsSourceHead: m.md5 === head(m.samples)};
  }
  delete ev.source.tailMd5;
  return ev;
}
