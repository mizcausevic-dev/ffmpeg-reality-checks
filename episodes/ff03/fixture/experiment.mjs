// Episode 03 fixture: "My MP4 waits to download before it plays. Where is the index?"
// Synthetic source only (ffmpeg lavfi testsrc2 plus a sine tone). The only network is a loopback HTTP server on 127.0.0.1.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {run, lines, ffmpegVersion} from '../../../tools/ff.mjs';

export const SRC = {size: '640x360', fps: 25, seconds: 10};

// Method 1: our own parser. Reads each top-level box header (4-byte size, 4-byte type, 64-bit size when size == 1).
export function topLevelBoxes(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const total = fs.fstatSync(fd).size, hdr = Buffer.alloc(16), boxes = [];
    let off = 0;
    while (off + 8 <= total) {
      fs.readSync(fd, hdr, 0, 16, off);
      let size = hdr.readUInt32BE(0);
      const type = hdr.toString('latin1', 4, 8);
      if (size === 1) size = Number(hdr.readBigUInt64BE(8));
      if (size === 0) size = total - off;
      boxes.push({type, offset: off, size});
      if (size < 8) break;
      off += size;
    }
    return boxes;
  } finally { fs.closeSync(fd); }
}

// Method 2: ffprobe's own trace output (a different code path from ours): lines like  type:'moov' parent:'root' sz: 9679 40 927238
export function traceBoxes(file) {
  const r = run2('ffprobe', ['-v', 'trace', file]);
  return lines(r).map((l) => /type:'([^']+)' parent:'root' sz:\s*(\d+)\s+(\d+)/.exec(l)).filter(Boolean).map((m) => ({type: m[1], size: +m[2], offset: +m[3]}));
}
import {spawnSync} from 'node:child_process';
function run2(cmd, args) { // ffprobe -v trace writes to stderr
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 28});
  if (r.status !== 0) throw new Error(`${cmd} failed (exit ${r.status})`);
  return r.stderr;
}

const probe = (file) => JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames:format=duration', '-of', 'json', file]));

// Serve one file on loopback and let ffprobe read it as a client. ranges=false behaves like a server or client that cannot seek.
function serve(file, ranges) {
  const size = fs.statSync(file).size, log = {requests: [], bytes: 0};
  const srv = http.createServer((req, res) => {
    const m = ranges ? /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '') : null;
    let s = 0, e = size - 1, code = 200;
    if (m) { s = +m[1]; e = m[2] ? Math.min(+m[2], size - 1) : size - 1; code = 206; }
    const h = {'Content-Type': 'video/mp4', 'Content-Length': e - s + 1};
    if (ranges) h['Accept-Ranges'] = 'bytes';
    if (code === 206) h['Content-Range'] = `bytes ${s}-${e}/${size}`;
    res.writeHead(code, h);
    if (req.method === 'HEAD') return res.end();
    log.requests.push({start: s, ranged: Boolean(m)});
    // Paced like a real link, so "bytes served" means bytes the client actually asked for, not what fits in socket buffers.
    const CH = 16384;
    let pos = s, dead = false;
    res.on('close', () => { dead = true; });
    const fd = fs.openSync(file, 'r');
    const pump = () => {
      if (dead || pos > e) { fs.closeSync(fd); if (!dead) res.end(); return; }
      const n = Math.min(CH, e - pos + 1), buf = Buffer.alloc(n);
      fs.readSync(fd, buf, 0, n, pos); pos += n;
      res.write(buf, () => { log.bytes += n; setTimeout(pump, 2); });
    };
    pump();
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({srv, log, port: srv.address().port, size})));
}
async function readOverHttp(file, ranges) {
  const {srv, log, port, size} = await serve(file, ranges);
  const args = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ...(ranges ? [] : ['-seekable', '0']), `http://127.0.0.1:${port}/v.mp4`];
  const out = await new Promise((resolve) => { const p = spawn('ffprobe', args); let o = ''; p.stdout.on('data', (d) => { o += d; }); p.on('close', (code) => resolve({code, duration: parseFloat(o)})); });
  await new Promise((r) => setTimeout(r, 300)); // let the server finish counting
  srv.closeAllConnections?.(); srv.close();
  return {exit: out.code, duration: out.duration, bytesServed: log.bytes, fileBytes: size, requests: log.requests.length, rangeStarts: log.requests.map((q) => q.start)};
}

export async function runExperiment(dir) {
  fs.mkdirSync(dir, {recursive: true});
  const common = ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${SRC.size}:rate=${SRC.fps}:duration=${SRC.seconds}`, '-f', 'lavfi', '-i', `sine=frequency=440:duration=${SRC.seconds}`, '-c:v', 'libx264', '-crf', '23', '-c:a', 'aac', '-shortest'];
  const plain = path.join(dir, 'plain.mp4'), fast = path.join(dir, 'faststart.mp4');
  run('ffmpeg', [...common, plain]);
  run('ffmpeg', [...common, '-movflags', '+faststart', fast]);
  const out = {ffmpeg: ffmpegVersion(), source: SRC, files: {}};
  for (const [name, file, cmd] of [['plain', plain, 'ffmpeg -i in -c:v libx264 -crf 23 out.mp4'], ['faststart', fast, 'ffmpeg -i in -c:v libx264 -crf 23 -movflags +faststart out.mp4']]) {
    const own = topLevelBoxes(file), trace = traceBoxes(file), p = probe(file);
    const moov = own.find((b) => b.type === 'moov');
    out.files[name] = {command: cmd, bytes: fs.statSync(file).size, order: own.map((b) => b.type), traceOrder: trace.map((b) => b.type), boxes: own, moovOffset: moov.offset, moovSize: moov.size, frames: Number(p.streams[0].nb_read_frames), duration: parseFloat(p.format.duration)};
  }
  out.http = {};
  for (const [name, file] of [['plain', plain], ['faststart', fast]]) {
    out.http[name] = {noSeek: await readOverHttp(file, false), rangeSeek: await readOverHttp(file, true)};
  }
  return out;
}
