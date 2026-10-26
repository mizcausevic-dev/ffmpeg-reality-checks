// Episode 49 fixture: "libmp3lame -q:a 2: what bitrate do I really get?"
// Synthetic sources only (lavfi): 10 s of stereo audio at 44100 Hz, five signals, encoded with -c:a libmp3lame.
//   silence   digital silence
//   sine      1000 Hz left, 1500 Hz right, amplitude 0.5
//   chord     five tones per channel, amplitude 0.15 each
//   sweep     a rising chirp, amplitude 0.5
//   noise     white noise, a different seed in each channel, amplitude 0.5
//   mixed     5 s of silence followed by 5 s of the same noise
// Variable quality: -q:a 0 to 9 on each signal. Control: constant bitrate -b:a 128k on each signal, where the answer is known (128 kbit/s).
// Readers:
//   reader 1  ffprobe: the format bit_rate that tools print, and the packet sizes (sum of bytes over the packet duration)
//   reader 2  Node: walks the mp3 frame headers itself (bitrate index, padding bit, frame length), skips the Xing/Info tag frame
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const SR = 44100, SECONDS = 10, FRAME_SAMPLES = 1152;
export const QS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const SIGNALS = ['silence', 'sine', 'chord', 'sweep', 'noise'];
export const MIN_KBPS = 32, MAX_KBPS = 320;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');

const noiseL = `anoisesrc=r=${SR}:d=${SECONDS}:c=white:a=0.5:seed=7`;
const noiseR = `anoisesrc=r=${SR}:d=${SECONDS}:c=white:a=0.5:seed=8`;
export const GRAPHS = {
  silence: `anullsrc=r=${SR}:cl=stereo:d=${SECONDS}`,
  sine: `aevalsrc=exprs='0.5*sin(2*PI*1000*t)|0.5*sin(2*PI*1500*t)':s=${SR}:d=${SECONDS}`,
  chord: `aevalsrc=exprs='0.15*(sin(2*PI*220*t)+sin(2*PI*277*t)+sin(2*PI*330*t)+sin(2*PI*440*t)+sin(2*PI*554*t))|0.15*(sin(2*PI*220*t)+sin(2*PI*261*t)+sin(2*PI*349*t)+sin(2*PI*440*t)+sin(2*PI*523*t))':s=${SR}:d=${SECONDS}`,
  sweep: `aevalsrc=exprs='0.5*sin(2*PI*(100*t+1900*t*t))|0.5*sin(2*PI*(150*t+1850*t*t))':s=${SR}:d=${SECONDS}`,
  noise: `${noiseL}[l];${noiseR}[r];[l][r]amerge=inputs=2`,
  mixed: `anullsrc=r=${SR}:cl=stereo:d=${SECONDS / 2}[s];${noiseL.replace(`d=${SECONDS}`, `d=${SECONDS / 2}`)}[l];${noiseR.replace(`d=${SECONDS}`, `d=${SECONDS / 2}`)}[r];[l][r]amerge=inputs=2[n];[s][n]concat=n=2:v=0:a=1`,
};

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

export function encode(signal, args, file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', GRAPHS[signal], '-c:a', 'libmp3lame', ...args, file], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`encode ${signal} ${args.join(' ')} failed: ${r.stderr}`);
  return file;
}

// ---------- reader 1: ffprobe ----------
const probe = (args) => {
  const r = spawnSync('ffprobe', ['-v', 'error', ...args], {encoding: 'utf8', maxBuffer: 1 << 26});
  if (r.status !== 0) throw new Error(`ffprobe ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.split(/\r?\n/).map((l) => l.replace(/,$/, '').trim()).filter(Boolean);
};
export function probeFacts(file) {
  const bitRate = Number(probe(['-show_entries', 'format=bit_rate', '-of', 'csv=p=0', file])[0]);
  const sizes = probe(['-select_streams', 'a:0', '-show_entries', 'packet=size', '-of', 'csv=p=0', file]).map(Number);
  const bytes = sizes.reduce((a, b) => a + b, 0);
  const sec = sizes.length * FRAME_SAMPLES / SR;
  return {formatKbps: bitRate / 1000, packets: sizes.length, packetBytes: bytes, packetKbps: bytes * 8 / sec / 1000, packetSizes: sizes};
}

// ---------- reader 2: Node walks the mp3 frames ----------
const KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const RATES = [44100, 48000, 32000, 0];
export function parseMp3(file) {
  const b = fs.readFileSync(file);
  let p = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') p = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  const frames = [];
  let tag = null;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff || (b[p + 1] & 0xe0) !== 0xe0) { if (b.toString('latin1', p, p + 3) === 'TAG') break; p++; continue; }
    const ver = (b[p + 1] >> 3) & 3, layer = (b[p + 1] >> 1) & 3, br = b[p + 2] >> 4, sr = (b[p + 2] >> 2) & 3, pad = (b[p + 2] >> 1) & 1;
    if (ver !== 3 || layer !== 1 || !KBPS[br] || !RATES[sr]) { p++; continue; }
    const len = Math.floor(144000 * KBPS[br] / RATES[sr]) + pad;
    const stereo = (b[p + 3] >> 6) !== 3;
    const at = p + 4 + (stereo ? 32 : 17);
    const mark = b.toString('latin1', at, at + 4);
    if (frames.length === 0 && tag === null && (mark === 'Xing' || mark === 'Info')) { tag = mark; p += len; continue; }
    frames.push({kbps: KBPS[br], bytes: len});
    p += len;
  }
  const n = frames.length;
  const kbps = frames.map((f) => f.kbps);
  const bytes = frames.reduce((a, f) => a + f.bytes, 0);
  const half = Math.floor(n / 2);
  const mean = (xs) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : NaN);
  return {frames: n, tag, headerMeanKbps: mean(kbps), byteKbps: bytes * 8 / (n * FRAME_SAMPLES / SR) / 1000, min: Math.min(...kbps), max: Math.max(...kbps), distinct: [...new Set(kbps)].sort((a, c) => a - c),
    firstHalfKbps: mean(kbps.slice(0, half)), secondHalfKbps: mean(kbps.slice(half)), kbps};
}

export function measure(file) {
  const pr = probeFacts(file), nd = parseMp3(file);
  return {
    probeFormatKbps: r1(pr.formatKbps), probePacketKbps: r2(pr.packetKbps), probePackets: pr.packets,
    nodeKbps: r2(nd.byteKbps), nodeHeaderKbps: r2(nd.headerMeanKbps), nodeFrames: nd.frames, tag: nd.tag, min: nd.min, max: nd.max, distinct: nd.distinct,
    firstHalfKbps: r2(nd.firstHalfKbps), secondHalfKbps: r2(nd.secondHalfKbps), bytes: fs.statSync(file).size,
    nearAverage: nd.kbps.filter((k) => Math.abs(k - nd.byteKbps) <= 25).length,
  };
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ev = {ffmpeg: ffmpegVersion(), seconds: SECONDS, sampleRate: SR, vbr: {}, cbr: {}, mixed: {}};
  for (const s of SIGNALS) {
    ev.vbr[s] = {};
    for (const q of QS) ev.vbr[s][q] = measure(encode(s, ['-q:a', String(q)], path.join(dir, `${s}_q${q}.mp3`)));
    ev.cbr[s] = measure(encode(s, ['-b:a', '128k'], path.join(dir, `${s}_cbr128.mp3`)));
  }
  for (const q of [2, 6]) ev.mixed[q] = measure(encode('mixed', ['-q:a', String(q)], path.join(dir, `mixed_q${q}.mp3`)));
  ev.cbr320 = measure(encode('noise', ['-b:a', '320k'], path.join(dir, 'noise_cbr320.mp3')));
  return ev;
}
