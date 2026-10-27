// Episode 91 fixture: "-f segment -c copy: where do the segments really start, and how long are they?"
// Synthetic input only: one 64x48, 10 fps, 100 frame clip written by Node as raw yuv420p, every frame a flat card with luma 16 + 2 x frame number
// (so a decoded frame names itself), encoded lossless (libx264 -qp 0, no B frames) with keyframes forced at IRREGULAR frames 0, 17, 21, 46, 58, 79
// (1.7 s, 2.1 s, 4.6 s, 5.8 s, 7.9 s); a control clip has a keyframe every 1.0 s. Stream copy with the segment muxer, in mkv, mp4 and ts.
// Readers of the result: reader 1 = ffprobe on every segment (start_time, packet pts_time and key flags); reader 2 = the decoded pictures read in Node
// (first frame, count), joined in order by Node (the concatenation check: the segments together must be frames 0 to 99, none lost, none twice);
// plus the muxer's own claim, the segment list it writes (csv: name, start, end).
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 64, H = 48, N = 100, FPS = 10, FSZ = W * H * 3 / 2;
export const KEYS = [0, 17, 21, 46, 58, 79];           // forced keyframes of the irregular clip (frames); 0.1 s per frame
export const REQUESTS = [2, 3, 5];                      // -segment_time
export const TIMES_LIST = '2,3,5';                      // -segment_times
export const CONTAINERS = ['mkv', 'mp4', 'ts'];
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const lumaOf = (n) => 16 + 2 * n;

const run = (cmd, args, cwd) => spawnSync(cmd, args, {cwd, maxBuffer: 1 << 28});
const ff = (args, cwd) => run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], cwd);
const r6 = (x) => Math.round(x * 1e6) / 1e6;

export function makeSource() {
  const b = Buffer.alloc(FSZ * N);
  for (let f = 0; f < N; f++) { b.fill(lumaOf(f), f * FSZ, f * FSZ + W * H); b.fill(128, f * FSZ + W * H, (f + 1) * FSZ); }
  return b;
}
export const idsOf = (raw) => { const n = Math.floor(raw.length / FSZ), ids = []; for (let k = 0; k < n; k++) ids.push((raw[k * FSZ] - 16) / 2); return ids; };
export const contiguous = (ids) => ids.every((v, i) => i === 0 || v === ids[i - 1] + 1);

// reader 1: ffprobe on one file; reader 2: the decoded pictures of the same file
export function readSegment(file, cwd) {
  const pj = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'format=start_time,duration:packet=pts_time,flags', '-of', 'json', file], cwd).stdout.toString() || '{}');
  const pk = pj.packets ?? [];
  const raw = run('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-'], cwd).stdout;
  const ids = idsOf(raw ?? Buffer.alloc(0));
  const pts = pk.map((p) => Number(p.pts_time));
  return {fmtStart: Number(pj.format?.start_time), fmtDur: Number(pj.format?.duration), pkts: pk.length, firstPts: pts[0], lastPts: pts.at(-1), firstIsKey: (pk[0]?.flags ?? '').startsWith('K'), keys: pk.filter((p) => String(p.flags).startsWith('K')).length,
    ids: ids.length, firstId: ids[0], lastId: ids.at(-1), contiguous: contiguous(ids), idList: ids};
}

export function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const ffmpeg = ffmpegVersion();
  fs.writeFileSync(path.join(dir, 'src.yuv'), makeSource());
  const ev = {ffmpeg, clips: {}, cells: {}};
  const raw = ['-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'src.yuv'];
  const enc = ['-c:v', 'libx264', '-qp', '0', '-bf', '0', '-pix_fmt', 'yuv420p', '-sc_threshold', '0'];
  const clip = {
    irregular: [...enc, '-g', '1000', '-force_key_frames', KEYS.map((k) => (k / FPS).toFixed(1)).join(',')],
    regular: [...enc, '-g', '10'],
  };
  for (const [name, a] of Object.entries(clip)) {
    for (const c of CONTAINERS) {
      const f = `clip_${name}.${c}`;
      const r = ff([...raw, ...a, f], dir); if (r.status !== 0) throw new Error(`clip ${name}: ${r.stderr}`);
    }
    const s = readSegment(`clip_${name}.mkv`, dir);
    ev.clips[name] = {pkts: s.pkts, keys: s.keys, ids: s.ids, firstId: s.firstId, contiguous: s.contiguous,
      keyFrames: (JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=flags', '-of', 'json', `clip_${name}.mkv`], dir).stdout.toString()).packets).map((p, i) => (String(p.flags).startsWith('K') ? i : -1)).filter((i) => i >= 0)};
  }
  const cut = (clipName, c, kind, value, reset, tag) => {
    const sub = path.join(dir, tag); fs.mkdirSync(sub, {recursive: true});
    const opt = kind === 'time' ? ['-segment_time', String(value)] : ['-segment_times', value];
    const args = ['-i', path.join('..', `clip_${clipName}.${c}`), '-c', 'copy', '-f', 'segment', ...opt, ...(reset ? ['-reset_timestamps', '1'] : []), '-segment_list', 'list.csv', '-segment_list_type', 'csv', `seg_%d.${c}`];
    const r = ff(args, sub);
    if (r.status !== 0) return {status: r.status, err: r.stderr.toString().trim().split(/\r?\n/).pop()};
    const names = fs.readdirSync(sub).filter((n) => n.startsWith('seg_')).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const list = fs.readFileSync(path.join(sub, 'list.csv'), 'utf8').trim().split(/\r?\n/).map((l) => l.split(','));
    const segs = names.map((n, i) => {
      const s = readSegment(n, sub);
      return {name: n, listStart: Number(list[i]?.[1]), listEnd: Number(list[i]?.[2]), fmtStart: s.fmtStart, fmtDur: s.fmtDur, pkts: s.pkts, firstPts: s.firstPts, lastPts: s.lastPts, firstIsKey: s.firstIsKey, keys: s.keys, n: s.ids, firstId: s.firstId, lastId: s.lastId, contiguous: s.contiguous, idList: s.idList};
    });
    // the concatenation check, in Node: the decoded frames of all segments in order, and the files joined (ts: the bytes; mkv, mp4: the concat demuxer) and read again
    const joined = `joined.${c}`;
    if (c === 'ts') fs.writeFileSync(path.join(sub, joined), Buffer.concat(names.map((n) => fs.readFileSync(path.join(sub, n)))));
    else { fs.writeFileSync(path.join(sub, 'cat.txt'), names.map((n) => `file '${n}'`).join('\n') + '\n'); const j = ff(['-f', 'concat', '-i', 'cat.txt', '-c', 'copy', joined], sub); if (j.status !== 0) return {status: j.status, err: j.stderr.toString().trim().split(/\r?\n/).pop()}; }
    const jp = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'json', joined], sub).stdout.toString() || '{}').packets.map((p) => Number(p.pts_time));
    const diffs = jp.slice(1).map((v, i) => r6(v - jp[i]));
    const jr = readSegment(joined, sub);
    const join = {pkts: jp.length, first: jp[0], last: jp.at(-1), steps: diffs.filter((d) => Math.abs(d - 0.1) < 1e-6).length, backwards: diffs.filter((d) => d <= 0).length, maxGap: Math.max(...diffs.map(Math.abs)), ids: jr.ids, idsOk: jr.ids === N && jr.idList.every((v, i) => v === i)};
    // the concatenation check, in Node: the decoded frames of all segments in order
    const all = segs.flatMap((s) => s.idList);
    const rec = {status: 0, nseg: segs.length, lengths: segs.map((s) => s.n / FPS), firsts: segs.map((s) => s.firstId), starts: segs.map((s) => s.fmtStart), durs: segs.map((s) => s.fmtDur), firstPts: segs.map((s) => s.firstPts),
      listStarts: segs.map((s) => s.listStart), listEnds: segs.map((s) => s.listEnd), allKeyStart: segs.every((s) => s.firstIsKey), keysPerSeg: segs.map((s) => s.keys),
      join, total: all.length, concatOk: all.length === N && all.every((v, i) => v === i), segs: segs.map(({idList, ...rest}) => rest)};
    fs.rmSync(sub, {recursive: true, force: true});
    return rec;
  };
  let k = 0;
  for (const c of CONTAINERS) for (const reset of [0, 1]) {
    for (const T of REQUESTS) ev.cells[`irregular|${c}|time${T}|r${reset}`] = cut('irregular', c, 'time', T, reset, `m${k++}`);
    ev.cells[`irregular|${c}|times|r${reset}`] = cut('irregular', c, 'times', TIMES_LIST, reset, `m${k++}`);
  }
  for (const T of REQUESTS) ev.cells[`regular|mkv|time${T}|r1`] = cut('regular', 'mkv', 'time', T, 1, `m${k++}`);
  return ev;
}
