import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff68/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: technical mini-documentary. Specimen plates with thin double rules, hex dumps with the key bytes circled,
   numbered callouts, exploded track diagrams drawn to scale, a calm slow push-in. Local components only; palette lab. */

/* Byte dumps copied from evidence.json (fixture/run.mjs): real file offsets, 16 bytes a row, keys are indexes into bytes. */
const HEX = {
  movMvhd: {file: 'mov_same.mov', start: 506874, keys: [{"from": 20, "len": 4, "label": "timescale"}, {"from": 24, "len": 4, "label": "duration"}], bytes: '00 00 00 6c 6d 76 68 64 00 00 00 00 00 00 00 00 00 00 00 00 00 00 03 e8 00 00 0f a0 00 01 00 00 01 00 00 00 00 00 00 00 00 00 00 00 00 01 00 00'.split(' ')},
  movElst: {file: 'mov_late.mov', start: 508496, keys: [{"from": 16, "len": 4, "label": "segment"}, {"from": 20, "len": 4, "label": "media time"}], bytes: '00 00 00 28 65 6c 73 74 00 00 00 00 00 00 00 02 00 00 03 e8 ff ff ff ff 00 01 00 00 00 00 0f a0 00 00 00 00 00 01 00 00 00 00 02 91 6d 64 69 61'.split(' ')},
  mkvDuration: {file: 'mkv_long.mkv', start: 278, keys: [{"from": 4, "len": 11, "label": "Duration"}], bytes: 'c2 07 5a 60 44 89 88 40 b3 88 00 00 00 00 00 16 54 ae 6b 40 e6 bf 84 3e e9 bc d8 ae 01 00 00 00'.split(' ')},
  tsLastPes: {file: 'ts_long.ts', start: 198910, keys: [{"from": 0, "len": 4, "label": "start code"}, {"from": 9, "len": 5, "label": "pts"}], bytes: '00 00 01 c0 09 45 80 80 05 21 00 21 e9 61 ff f1 4c 40 17 5f fc 00 de 35 2c ec a4 50 87 42 6d 7d b3 fa ff e3 fc 7f d6 eb 89 bd 55 ca ab ae bc 5a'.split(' ')},
};
/* ---------- local components (SVG, flat, no gradients, no glow) ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);

/* slow camera: a push-in and a drift over the scene, applied to the specimen layer only */
const Cam: React.FC<{t: number; z?: number; dx?: number; dy?: number; cy?: number; children: React.ReactNode}> = ({t, z = 0.03, dx = 0, dy = 0, cy = 560, children}) => {
  const p = prog(t, 0, 14);
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `960px ${cy}px`, transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + z * p})`}}>{children}</div>;
};
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);

/* specimen plate: double hairline frame, registration ticks, a plate number and a file tag above */
const Plate: React.FC<{x: number; y: number; w: number; h: number; no: string; title: string; tag?: string; o?: number}> = ({x, y, w, h, no, title, tag, o = 1}) => (
  <g opacity={o}>
    <Tx x={x} y={y - 16} s={22} c={C.dim} ls={3} f="mono">{`PLATE ${no} · ${title}`}</Tx>
    {tag && <Tx x={x + w} y={y - 16} s={22} c={C.mute} a="end" f="mono">{tag}</Tx>}
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.text} strokeWidth={2} />
    <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} fill="none" stroke={C.mute} strokeWidth={1} />
    {[[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].map(([cx, cy, sx, sy], i) => (
      <g key={i} stroke={C.mute} strokeWidth={1.5}><line x1={cx + sx * 6} y1={cy} x2={cx + sx * 20} y2={cy} /><line x1={cx} y1={cy + sy * 6} x2={cx} y2={cy + sy * 20} /></g>
    ))}
  </g>
);

const Badge: React.FC<{x: number; y: number; n: number | string; color: string; r?: number; o?: number}> = ({x, y, n, color, r = 15, o = 1}) => (
  <g opacity={o}><circle cx={x} cy={y} r={r} fill={C.bg} stroke={color} strokeWidth={2.5} /><Tx x={x} y={y + r * 0.45} s={r * 1.25} c={color} a="middle" w={700} f="mono">{n}</Tx></g>
);

/* legend beside a dump: numbered items with a title line and mono detail lines */
type LegendItem = {n?: number; color: string; title: string; lines: string[]};
const Legend: React.FC<{x: number; y: number; items: LegendItem[]; s?: number; gap?: number; o?: number | number[]}> = ({x, y, items, s = 24, gap = 26, o = 1}) => {
  let yy = y;
  return (
    <g>
      {items.map((it, i) => {
        const top = yy;
        yy += s + 8 + it.lines.length * (s - 1) + gap;
        const oo = Array.isArray(o) ? o[i] : o;
        return (
          <g key={i} opacity={oo}>
            {it.n !== undefined && <Badge x={x + 15} y={top + s * 0.4} n={it.n} color={it.color} />}
            <Tx x={x + (it.n !== undefined ? 42 : 0)} y={top + s * 0.8} s={s} c={it.color} w={700}>{it.title}</Tx>
            {it.lines.map((l, k) => <Tx key={k} x={x + (it.n !== undefined ? 42 : 0)} y={top + s * 0.8 + (k + 1) * (s - 1) + 4} s={s - 3} c={C.dim} f="mono">{l}</Tx>)}
          </g>
        );
      })}
    </g>
  );
};

/* hex dump: real file offsets, 16 bytes a row, an ascii column, key bytes circled and numbered. reveal types the bytes in, circ draws the circles */
type HexKey = {from: number; len: number; color: string; n: number};
const printable = (b: string) => { const v = parseInt(b, 16); return v >= 0x20 && v < 0x7f ? String.fromCharCode(v) : '.'; };
const Hex: React.FC<{x: number; y: number; start: number; bytes: string[]; keys: HexKey[]; fs?: number; reveal?: number; circ?: number; o?: number}> = ({x, y, start, bytes, keys, fs = 24, reveal = 1, circ = 1, o = 1}) => {
  const cw = fs * 1.55, rh = fs * 1.85, offW = fs * 4.8 + fs * 1.2, asciiX = offW + 16 * cw + fs, cell = fs * 1.2;
  const rows = Math.ceil(bytes.length / 16);
  const shown = Math.round(reveal * bytes.length);
  const keyOf = (i: number) => keys.find((k) => i >= k.from && i < k.from + k.len);
  return (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      {Array.from({length: rows}, (_, r) => (
        <g key={r}>
          <Tx x={0} y={r * rh + fs} s={fs} c={C.mute} f="mono">{(start + r * 16).toString(16).padStart(8, '0')}</Tx>
          {bytes.slice(r * 16, r * 16 + 16).map((b, c) => {
            const i = r * 16 + c, k = keyOf(i);
            return (
              <g key={c} opacity={i < shown ? 1 : 0}>
                <Tx x={offW + c * cw} y={r * rh + fs} s={fs} c={k ? k.color : C.dim} w={k ? 700 : 400} f="mono">{b}</Tx>
                <Tx x={asciiX + c * fs * 0.62} y={r * rh + fs} s={fs} c={C.mute} f="mono">{printable(b)}</Tx>
              </g>
            );
          })}
        </g>
      ))}
      {keys.map((k, ki) =>
        Array.from({length: rows}, (_, r) => {
          const a = Math.max(k.from, r * 16), b = Math.min(k.from + k.len, (r + 1) * 16) - 1;
          if (a > b) return null;
          const rx = offW + (a % 16) * cw - 3, ry = r * rh - 2, rw = (b - a) * cw + cell + 6, rhh = fs * 1.3;
          const first = a === k.from;
          const left = k.n % 2 === 1;
          return (
            <g key={`${ki}-${r}`} opacity={circ > 0 ? 1 : 0}>
              <rect x={rx} y={ry} width={rw} height={rhh} rx={rhh / 2} fill="none" stroke={k.color} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} />
              {first && <Badge x={left ? rx + 4 : rx + rw - 4} y={ry - 3} n={k.n} color={k.color} r={11} o={circ > 0.8 ? 1 : 0} />}
            </g>
          );
        }),
      )}
    </g>
  );
};

/* time axis with ticks */
const Axis: React.FC<{x0: number; x1: number; y: number; t0: number; t1: number; ticks: number[]; o?: number}> = ({x0, x1, y, t0, t1, ticks, o = 1}) => {
  const X = (t: number) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
  return (
    <g opacity={o}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.text} strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t}><line x1={X(t)} y1={y} x2={X(t)} y2={y + 10} stroke={C.text} strokeWidth={1.5} /><Tx x={X(t)} y={y + 36} s={22} c={C.dim} a="middle" f="mono">{`${t} s`}</Tx></g>
      ))}
    </g>
  );
};

/* dimension line: a span with end ticks and a label above it */
const Bracket: React.FC<{x1: number; x2: number; y: number; label: string; color: string; p?: number; s?: number; below?: boolean}> = ({x1, x2, y, label, color, p = 1, s = 26, below = false}) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={color} strokeWidth={2.5} />
    <line x1={x1} y1={y - 10} x2={x1} y2={y + 10} stroke={color} strokeWidth={2.5} />
    <line x1={x1 + (x2 - x1) * p} y1={y - 10} x2={x1 + (x2 - x1) * p} y2={y + 10} stroke={color} strokeWidth={2.5} opacity={p > 0.95 ? 1 : 0} />
    <Tx x={(x1 + x2) / 2} y={below ? y + 34 : y - 14} s={s} c={color} a="middle" w={700} o={p > 0.7 ? 1 : 0}>{label}</Tx>
  </g>
);

/* a track bar on the time axis */
const Bar: React.FC<{x1: number; x2: number; y: number; h?: number; fill: string; stroke: string; label: string; p?: number; textColor?: string; s?: number}> = ({x1, x2, y, h = 52, fill, stroke, label, p = 1, textColor = C.text, s = 24}) => (
  <g>
    <rect x={x1} y={y} width={Math.max(0, (x2 - x1) * p)} height={h} fill={fill} stroke={stroke} strokeWidth={2.5} />
    <Tx x={x1 + 16} y={y + h / 2 + s * 0.35} s={s} c={textColor} w={700} o={p > 0.85 ? 1 : 0}>{label}</Tx>
  </g>
);

/* ---------- scenes ---------- */

/* 1. The ask: one file, three readings */
const Ask: React.FC<SceneProps> = ({t}) => {
  const cols = [
    {label: 'FORMAT', value: '5.0 s', cmd: 'format=duration', note: 'the whole file', at: 1.6},
    {label: 'STREAM', value: '4.0 s', cmd: 'stream=duration', note: 'the audio track', at: 3.2},
    {label: 'PACKETS', value: '3.9999 s', cmd: 'sum of duration_time', note: 'audio packets added up', at: 4.8},
  ];
  return (
    <>
      <Head over="Twelve synthetic files" title="Which duration is true?" color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.03} dy={-8}>
        <Layer>
          <Plate x={210} y={330} w={1500} h={340} no="01" title="ONE FILE, THREE READINGS" tag="mov_late.mov" o={ep(t, 0.6, 1.2)} />
          {[710, 1210].map((x) => <line key={x} x1={x} y1={362} x2={x} y2={640} stroke={C.line} strokeWidth={1.5} opacity={ep(t, 1.0, 1.6)} />)}
          {cols.map((c, i) => {
            const cx = 460 + i * 500, o = ep(t, c.at, c.at + 0.7);
            return (
              <g key={c.label} opacity={o}>
                <Tx x={cx} y={398} s={40} c={C.amber} a="middle" f="display" w={800} ls={6}>{c.label}</Tx>
                <Tx x={cx} y={530} s={128} c={C.text} a="middle" f="display" w={900}>{c.value}</Tx>
                <Tx x={cx} y={592} s={24} c={C.dim} a="middle" f="mono">{c.cmd}</Tx>
                <Tx x={cx} y={628} s={24} c={C.mute} a="middle">{c.note}</Tx>
              </g>
            );
          })}
          <g opacity={ep(t, 6.2, 6.9)}>
            <rect x={210} y={716} width={1500} height={62} fill={C.codeBg} stroke={C.mute} strokeWidth={1.5} />
            <Tx x={236} y={757} s={25} c={C.cyan} f="mono" w={700}>$</Tx>
            <Tx x={268} y={757} s={23} c={C.text} f="mono">ffprobe -v error -of json -show_entries format=duration:stream=start_time,duration out.mov</Tx>
          </g>
        </Layer>
      </Cam>
      <Mid y={812} size={30} color={C.dim} o={ep(t, 8.0, 8.8)}>One file. Audio of 4 s that starts 1 s late. Which of the three is the duration?</Mid>
    </>
  );
};

/* 2. Three readers and the control */
const Source: React.FC<SceneProps> = ({t}) => {
  const readers = [
    {n: 'READER 1', name: 'ffprobe', l1: 'format 4.0 s', l2: 'streams 4.0 s and 4.0 s', at: 1.0},
    {n: 'READER 2', name: 'the decoder', l1: '100 frames = 4.0 s', l2: '192000 samples = 4.0 s', at: 2.4},
    {n: 'READER 3', name: 'the bytes', l1: 'mvhd 4000 ticks / 1000', l2: '= 4.0 s', at: 3.8},
  ];
  const keys: HexKey[] = [{from: 20, len: 4, color: C.red, n: 1}, {from: 24, len: 4, color: C.red, n: 2}];
  return (
    <>
      <Head over="Three readers · one control" title="Same file, three ways." o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.028} dy={-6}>
        <Layer>
          {readers.map((r, i) => {
            const x = 210 + i * 510, o = ep(t, r.at, r.at + 0.7);
            return (
              <g key={r.n} opacity={o}>
                <rect x={x} y={296} width={480} height={170} fill="none" stroke={C.text} strokeWidth={1.5} />
                <rect x={x} y={296} width={480} height={8} fill={C.cyan} />
                <Tx x={x + 22} y={340} s={21} c={C.dim} f="mono" ls={3}>{r.n}</Tx>
                <Tx x={x + 22} y={398} s={54} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={x + 22} y={432} s={22} c={C.cyan} f="mono">{r.l1}</Tx>
                <Tx x={x + 22} y={458} s={22} c={C.cyan} f="mono">{r.l2}</Tx>
              </g>
            );
          })}
          <Plate x={210} y={548} w={1500} h={300} no="02" title="THE CONTROL BYTES" tag="mov_same.mov" o={ep(t, 5.0, 5.6)} />
          <Hex x={250} y={586} start={HEX.movMvhd.start} bytes={HEX.movMvhd.bytes} keys={keys} reveal={ep(t, 5.6, 8.0)} circ={ep(t, 8.2, 9.4)} o={ep(t, 5.0, 5.6)} />
          <Legend x={1290} y={590} items={[
            {n: 1, color: C.red, title: 'timescale', lines: ['03e8 = 1000 ticks per s']},
            {n: 2, color: C.red, title: 'duration', lines: ['0fa0 = 4000 ticks = 4.0 s']},
          ]} o={[ep(t, 9.0, 9.6), ep(t, 9.6, 10.2)]} />
          <Tx x={250} y={790} s={34} c={C.green} f="mono" w={700} o={ep(t, 11.0, 11.8)}>4000 / 1000 = 4.0 s, as the other two readers say</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 3. Audio 5 s */
const Long: React.FC<SceneProps> = ({t}) => {
  const x0 = 420, x1 = 1740, X = (s: number) => x0 + (s / 5) * (x1 - x0);
  const keys: HexKey[] = [{from: 4, len: 11, color: C.red, n: 1}];
  return (
    <>
      <Head over="Audio 5 s · video 4 s" title="Both numbers are true." color={C.green} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          <Bracket x1={X(0)} x2={X(5)} y={346} label="format duration 5.0 s" color={C.cyan} p={ep(t, 4.4, 5.6)} />
          <Tx x={400} y={414} s={36} c={C.text} a="end" f="display" w={800} ls={4} o={ep(t, 1.0, 1.6)}>VIDEO</Tx>
          <Tx x={400} y={480} s={36} c={C.text} a="end" f="display" w={800} ls={4} o={ep(t, 2.6, 3.2)}>AUDIO</Tx>
          <Bar x1={X(0)} x2={X(4)} y={376} h={50} fill={C.cyanDim} stroke={C.cyan} label="100 frames · stream duration 4.0 s" p={ep(t, 1.0, 2.4)} />
          <Bar x1={X(0)} x2={X(5)} y={444} h={50} fill={C.greenDim} stroke={C.green} label="240000 samples · stream duration 5.0 s" p={ep(t, 2.6, 4.2)} />
          <line x1={X(4)} y1={430} x2={X(4)} y2={532} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" opacity={ep(t, 2.4, 3.0)} />
          <Axis x0={x0} x1={x1} y={532} t0={0} t1={5} ticks={[0, 1, 2, 3, 4, 5]} o={ep(t, 0.6, 1.2)} />
          <Plate x={210} y={650} w={1500} h={214} no="03" title="THE DURATION ELEMENT" tag="mkv_long.mkv" o={ep(t, 6.2, 6.8)} />
          <Hex x={250} y={688} start={HEX.mkvDuration.start} bytes={HEX.mkvDuration.bytes} keys={keys} reveal={ep(t, 6.8, 8.6)} circ={ep(t, 8.8, 9.8)} o={ep(t, 6.2, 6.8)} />
          <Legend x={1290} y={690} s={22} gap={20} items={[
            {n: 1, color: C.red, title: 'Duration element', lines: ['44 89 88: id, size 8', '40b3880000000000 = 5000.0 ms']},
            {color: C.green, title: 'The decoder agrees', lines: ['100 frames, 240000 samples']},
          ]} o={[ep(t, 9.6, 10.2), ep(t, 11.0, 11.6)]} />
        </Layer>
      </Cam>
    </>
  );
};

/* 4. Audio one second late */
const Late: React.FC<SceneProps> = ({t}) => {
  const x0 = 420, x1 = 1740, X = (s: number) => x0 + (s / 5) * (x1 - x0);
  const keys: HexKey[] = [{from: 16, len: 4, color: C.red, n: 1}, {from: 20, len: 4, color: C.red, n: 2}];
  return (
    <>
      <Head over="Audio starts at 1 s" title="Format 5.0, streams 4.0." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-4}>
        <Layer>
          <defs><pattern id="h68" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={14} stroke={C.red} strokeWidth={2} /></pattern></defs>
          <Bracket x1={X(0)} x2={X(5)} y={336} label="format duration 5.0 s" color={C.cyan} p={ep(t, 3.8, 5.0)} />
          <Tx x={400} y={382} s={32} c={C.text} a="end" f="display" w={800} ls={4} o={ep(t, 0.8, 1.4)}>VIDEO</Tx>
          <Tx x={400} y={434} s={32} c={C.text} a="end" f="display" w={800} ls={4} o={ep(t, 1.8, 2.4)}>AUDIO</Tx>
          <Bar x1={X(0)} x2={X(4)} y={352} h={40} fill={C.cyanDim} stroke={C.cyan} label="100 frames · 4.0 s" p={ep(t, 0.8, 2.0)} s={22} />
          <g opacity={ep(t, 2.2, 3.0)}>
            <rect x={X(0)} y={404} width={X(1) - X(0)} height={40} fill="url(#h68)" stroke={C.red} strokeWidth={2} strokeDasharray="6 5" />
          </g>
          <Bar x1={X(1)} x2={X(5)} y={404} h={40} fill={C.greenDim} stroke={C.green} label="192000 samples · 4.0 s" p={ep(t, 2.2, 3.6)} s={22} />
          <Tx x={(X(0) + X(1)) / 2} y={470} s={22} c={C.red} a="middle" f="mono" o={ep(t, 3.0, 3.6)}>empty 1.000 s</Tx>
          <Axis x0={x0} x1={x1} y={486} t0={0} t1={5} ticks={[0, 1, 2, 3, 4, 5]} o={ep(t, 0.6, 1.2)} />
          <Bracket x1={X(1)} x2={X(5)} y={578} label="mov: stream duration 4.0 s" color={C.green} p={ep(t, 8.0, 9.0)} s={24} />
          <Bracket x1={X(0)} x2={X(5)} y={630} label="mkv: DURATION tag 5.0 s" color={C.red} p={ep(t, 9.6, 10.8)} s={24} />
          <Plate x={210} y={686} w={1500} h={188} no="04" title="THE EDIT LIST" tag="mov_late.mov" o={ep(t, 4.4, 5.0)} />
          <Hex x={250} y={716} start={HEX.movElst.start} bytes={HEX.movElst.bytes} keys={keys} reveal={ep(t, 5.0, 6.6)} circ={ep(t, 6.8, 7.8)} o={ep(t, 4.4, 5.0)} />
          <Legend x={1290} y={718} s={22} gap={18} items={[
            {n: 1, color: C.red, title: 'segment', lines: ['03e8 = 1000 ticks = 1.0 s']},
            {n: 2, color: C.red, title: 'media time', lines: ['ffffffff = -1: an empty edit']},
          ]} o={[ep(t, 7.4, 8.0), ep(t, 7.8, 8.4)]} />
        </Layer>
      </Cam>
    </>
  );
};

/* 5. Packets */
const BLOCK_MS = [0, 43, 85, 128, 171, 213, 256, 299, 341, 384, 427, 469, 512, 555, 597, 640];
const Packets: React.FC<SceneProps> = ({t}) => {
  const k = 0.325, bx = 330; // px per ms
  const bar = (key: string, y: number, ms: number, label: string, fill: string, stroke: string, at: number, val: string) => (
    <g key={key} opacity={ep(t, at, at + 0.6)}>
      <Tx x={bx} y={y - 10} s={24} c={C.dim}>{label}</Tx>
      <rect x={bx} y={y} width={ms * k * ep(t, at, at + 1.4)} height={38} fill={fill} stroke={stroke} strokeWidth={2.5} />
      <Tx x={bx + 4000 * k + 18} y={y + 28} s={26} c={stroke} f="mono" w={700} o={ep(t, at + 1.2, at + 1.8)}>{val}</Tx>
    </g>
  );
  return (
    <>
      <Head over="mkv · 94 audio packets" title="Packet durations drift." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          <Plate x={210} y={330} w={1500} h={206} no="05" title="BLOCK TIMES, FIRST 16 OF 94" tag="mkv_same.mkv" o={ep(t, 0.6, 1.2)} />
          {([['time ms', 388], ['step ms', 436], ['reported', 484]] as [string, number][]).map(([lab, y], r) => (
            <Tx key={lab} x={236} y={y} s={22} c={C.dim} f="mono" o={ep(t, 1.0 + r * 0.6, 1.6 + r * 0.6)}>{lab}</Tx>
          ))}
          {BLOCK_MS.map((ms, i) => {
            const cx = 430 + i * 80, o1 = ep(t, 1.2 + i * 0.05, 1.8 + i * 0.05);
            const step = i < 15 ? BLOCK_MS[i + 1] - ms : null;
            return (
              <g key={i}>
                <Tx x={cx} y={388} s={28} c={C.text} a="middle" f="mono" o={o1}>{String(ms)}</Tx>
                {step !== null && <Tx x={cx} y={436} s={28} c={step === 43 ? C.amber : C.cyan} a="middle" f="mono" o={ep(t, 2.4 + i * 0.05, 3.0 + i * 0.05)}>{`+${step}`}</Tx>}
                {step !== null && <Tx x={cx} y={484} s={28} c={C.red} a="middle" f="mono" w={700} o={ep(t, 3.6 + i * 0.05, 4.2 + i * 0.05)}>42</Tx>}
              </g>
            );
          })}
          {bar('a', 612, 4000, 'decoder: 192000 samples', C.cyanDim, C.cyan, 5.0, '4000 ms')}
          {bar('b', 686, 3938, 'sum of the 94 packet durations', C.amberDim, C.amber, 6.6, '3938 ms')}
          <g opacity={ep(t, 8.2, 8.8)}>
            <rect x={bx + 3938 * k} y={686} width={62 * k} height={38} fill="none" stroke={C.red} strokeWidth={3} strokeDasharray="5 4" />
            <Tx x={bx + 4000 * k + 6} y={676} s={26} c={C.red} a="end" f="mono" w={700}>62 ms gone</Tx>
          </g>
          {bar('c', 760, 4000, 'last pts + duration - first pts', C.greenDim, C.green, 9.4, '4000 ms')}
        </Layer>
      </Cam>
      <Mid y={826} size={26} color={C.dim} o={ep(t, 10.4, 11.0)} mono>2048 samples = 42.667 ms, reported as 42 ms, 93 times plus a 32 ms last packet</Mid>
    </>
  );
};

/* 6. Transport stream */
const Ts: React.FC<SceneProps> = ({t}) => {
  const t0 = 1.2, t1 = 6.6, x0 = 230, x1 = 1470, X = (s: number) => x0 + ((s - t0) / (t1 - t0)) * (x1 - x0);
  const PES = [1.4, 1.698667, 1.997333, 2.317333, 2.637333, 2.957333, 3.277333, 3.597333, 3.917333, 4.237333, 4.557333, 4.877333, 5.197333, 5.517333, 5.837333, 6.157333];
  const FR = 1024 / 48000;
  const keys: HexKey[] = [{from: 0, len: 4, color: C.red, n: 1}, {from: 9, len: 5, color: C.red, n: 2}];
  const endProbe = 6.178667, endDec = 6.434667;
  return (
    <>
      <Head over="ts · 236 audio frames" title="ffprobe stops early." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-4}>
        <Layer>
          <Tx x={x0} y={372} s={22} c={C.dim} f="mono" o={ep(t, 0.8, 1.4)}>audio PES time stamps, 16 packets</Tx>
          {PES.map((s, i) => <line key={i} x1={X(s)} y1={386} x2={X(s)} y2={426} stroke={C.text} strokeWidth={2.5} opacity={ep(t, 1.0 + i * 0.1, 1.4 + i * 0.1)} />)}
          <g opacity={ep(t, 3.4, 4.2)}>
            {Array.from({length: 13}, (_, i) => <rect key={i} x={X(PES[15] + i * FR)} y={386} width={(FR / (t1 - t0)) * (x1 - x0)} height={40} fill={C.amberDim} stroke={C.amber} strokeWidth={1} />)}
            <Tx x={X(PES[15]) - 18} y={372} s={22} c={C.amber} a="end" f="mono" w={700}>13 frames in the last PES</Tx>
          </g>
          <Axis x0={x0} x1={x1} y={444} t0={t0} t1={t1} ticks={[2, 3, 4, 5, 6]} o={ep(t, 0.6, 1.2)} />
          <g opacity={ep(t, 5.0, 5.8)}>
            <line x1={X(endProbe)} y1={350} x2={X(endProbe)} y2={604} stroke={C.red} strokeWidth={2} strokeDasharray="6 5" />
            <Tx x={X(endProbe) - 10} y={338} s={24} c={C.red} a="end" f="mono" w={700}>ffprobe end 6.1787 s</Tx>
          </g>
          <g opacity={ep(t, 6.6, 7.4)}>
            <line x1={X(endDec)} y1={350} x2={X(endDec)} y2={604} stroke={C.green} strokeWidth={2} strokeDasharray="6 5" />
            <Tx x={X(endDec) + 10} y={338} s={24} c={C.green} a="start" f="mono" w={700}>decoder end 6.4347 s</Tx>
          </g>
          <Bracket x1={X(1.4)} x2={X(endProbe)} y={530} label="ffprobe: 4.7787 s" color={C.red} p={ep(t, 5.2, 6.4)} s={25} />
          <Bracket x1={X(1.4)} x2={X(endDec)} y={592} label="packets and decoder: 5.0347 s" color={C.green} p={ep(t, 6.8, 8.0)} s={25} />
          <Plate x={210} y={662} w={1500} h={208} no="06" title="THE LAST AUDIO PES" tag="ts_long.ts" o={ep(t, 8.4, 9.0)} />
          <Hex x={250} y={692} start={HEX.tsLastPes.start} bytes={HEX.tsLastPes.bytes} keys={keys} reveal={ep(t, 9.0, 10.4)} circ={ep(t, 10.6, 11.6)} o={ep(t, 8.4, 9.0)} />
          <Legend x={1290} y={698} s={22} gap={16} items={[
            {n: 1, color: C.red, title: 'PES start code', lines: ['00 00 01 c0: audio']},
            {n: 2, color: C.red, title: 'pts, 5 bytes', lines: ['21 00 21 e9 61 = 554160', '/ 90000 = 6.1573 s']},
          ]} o={[ep(t, 11.2, 11.8), ep(t, 11.8, 12.4)]} />
        </Layer>
      </Cam>
    </>
  );
};

/* 7. What to trust */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {n: 1, color: C.amber, name: 'format duration', rule: ['latest stream end minus earliest start;', 'an estimate in ts'], seen: ['5.0 s in mkv, mov, mp4', 'ts: 4.78 s for 5.03 s']},
    {n: 2, color: C.amber, name: 'stream duration', rule: ['a length in mov, an end time in', 'the mkv tag, empty in the ffprobe field'], seen: ['late audio: mov 4.0 s', 'mkv tag 5.0 s']},
    {n: 3, color: C.red, name: 'packet sum', rule: ['rounds every packet to the', 'time base'], seen: ['mkv: 3.938 s for 4.000 s']},
    {n: 4, color: C.green, name: 'packet span or decode', rule: ['last pts + duration - first pts,', 'or count what decodes'], seen: ['10 of 12 files within 1 ms', 'aac in mp4: 8 to 11 ms off']},
  ];
  return (
    <>
      <Head over="What to trust" title="Four numbers, four meanings." color={C.cyan} o={ep(t, 0.2, 0.9)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <line x1={210} y1={300} x2={1710} y2={300} stroke={C.text} strokeWidth={2} opacity={ep(t, 0.8, 1.4)} />
          {rows.map((r, i) => {
            const y = 300 + i * 118, o = ep(t, 1.2 + i * 1.2, 1.9 + i * 1.2);
            return (
              <g key={r.n} opacity={o}>
                <Badge x={238} y={y + 59} n={r.n} color={r.color} r={20} />
                <Tx x={282} y={y + 70} s={42} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={760} y={y + 52} s={24} c={C.dim}>{r.rule[0]}</Tx>
                <Tx x={760} y={y + 84} s={24} c={C.dim}>{r.rule[1]}</Tx>
                {r.seen.map((s, k) => <Tx key={k} x={1290} y={y + 52 + k * 32} s={22} c={r.color} f="mono" w={700}>{s}</Tx>)}
                <line x1={210} y1={y + 118} x2={1710} y2={y + 118} stroke={C.mute} strokeWidth={1} />
              </g>
            );
          })}
        </Layer>
      </Cam>
      <Mid y={800} size={26} color={C.mute} o={ep(t, 7.0, 7.6)}>Not tested: other builds, real footage, fragmented files, variable frame rate.</Mid>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 8.0, 8.6)}>FFmpeg Reality Checks · episode 68 · fixture and tests in the description</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, long: Long, late: Late, packets: Packets, ts: Ts, close: Close};
