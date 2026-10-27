import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff97/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: technical mini-documentary. Specimen plates with thin double rules, hex dumps with the key bytes circled,
   numbered callouts, bars drawn to scale, a calm slow push-in. Local components only; palette lab. Colors are read at render time, never at import. */

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

/* dimension line: a span with end ticks and a label above it */
const Bracket: React.FC<{x1: number; x2: number; y: number; label: string; color: string; p?: number; s?: number; below?: boolean}> = ({x1, x2, y, label, color, p = 1, s = 26, below = false}) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={color} strokeWidth={2.5} />
    <line x1={x1} y1={y - 10} x2={x1} y2={y + 10} stroke={color} strokeWidth={2.5} />
    <line x1={x1 + (x2 - x1) * p} y1={y - 10} x2={x1 + (x2 - x1) * p} y2={y + 10} stroke={color} strokeWidth={2.5} opacity={p > 0.95 ? 1 : 0} />
    <Tx x={(x1 + x2) / 2} y={below ? y + 34 : y - 14} s={s} c={color} a="middle" w={700} o={p > 0.7 ? 1 : 0}>{label}</Tx>
  </g>
);


/* ---------- data, copied from evidence.json (fixture/run.mjs) ---------- */
const hx = (s: string) => s.split(' ');
/* first 80 bytes of the file capture and of the pipe capture (bytes 78 and 79 are the first audio bytes) */
const FILE_HEX = hx('52 49 46 46 46 ee 02 00 57 41 56 45 66 6d 74 20 10 00 00 00 01 00 02 00 80 bb 00 00 00 ee 02 00 04 00 10 00 4c 49 53 54 1a 00 00 00 49 4e 46 4f 49 53 46 54 0e 00 00 00 4c 61 76 66 36 30 2e 31 36 2e 31 30 30 00 64 61 74 61 00 ee 02 00 00 00');
const PIPE_HEX = hx('52 49 46 46 ff ff ff ff 57 41 56 45 66 6d 74 20 10 00 00 00 01 00 02 00 80 bb 00 00 00 ee 02 00 04 00 10 00 4c 49 53 54 1a 00 00 00 49 4e 46 4f 49 53 46 54 0e 00 00 00 4c 61 76 66 36 30 2e 31 36 2e 31 30 30 00 64 61 74 61 ff ff ff ff 00 00');
const AUDIO = 192000;

/* ---------- scenes ---------- */

/* 1. The ask: one sound, two paths */
const Ask: React.FC<SceneProps> = ({t}) => {
  const box = (x: number, y: number, w: number, h: number, label: string, sub: string, color: string, o: number) => (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={2.5} />
      <rect x={x} y={y} width={w} height={7} fill={color} />
      <Tx x={x + 18} y={y + 46} s={28} c={C.text} f="mono" w={700}>{label}</Tx>
      <Tx x={x + 18} y={y + 76} s={21} c={C.dim} f="mono">{sub}</Tx>
    </g>
  );
  const bar = (y: number, o: number, p: number, color: string) => (
    <g opacity={o}>
      <rect x={1140} y={y} width={14} height={50} fill={C.text} />
      <rect x={1154} y={y} width={380 * p} height={50} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2.5} />
      <Tx x={1140} y={y - 14} s={21} c={C.dim} f="mono">78 B header + 192000 B audio</Tx>
      <Tx x={1154 + 380 * p + 14} y={y + 34} s={22} c={color} f="mono" w={700} o={p > 0.95 ? 1 : 0}>192078 B</Tx>
    </g>
  );
  return (
    <>
      <Head over="1 second · 192000 bytes" title="Same sound, two paths." color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.028} dy={-8}>
        <Layer>
          <Plate x={210} y={320} w={1500} h={420} no="01" title="ONE SOUND, TWO PATHS" tag="48000 Hz · 2 ch · 16 bit · header not to scale" o={ep(t, 0.6, 1.2)} />
          {box(250, 470, 230, 110, 'ffmpeg', 'sine, 1 s', C.cyan, ep(t, 1.0, 1.6))}
          {/* lane A: a file */}
          <g opacity={ep(t, 2.0, 2.8)}>
            <polyline points="480,500 560,500 560,415 720,415" fill="none" stroke={C.text} strokeWidth={2.5} />
            <Tx x={500} y={398} s={21} c={C.dim} f="mono">-f wav out.wav</Tx>
          </g>
          {box(720, 380, 300, 110, 'out.wav', 'a file, can seek', C.green, ep(t, 2.4, 3.0))}
          {bar(398, ep(t, 3.2, 3.8), ep(t, 3.4, 5.0), C.green)}
          {/* lane B: a pipe */}
          <g opacity={ep(t, 5.0, 5.8)}>
            <polyline points="480,550 560,550 560,625 720,625" fill="none" stroke={C.text} strokeWidth={2.5} />
            <polyline points="480,558 552,558 552,633 720,633" fill="none" stroke={C.text} strokeWidth={2.5} />
            <Tx x={576} y={672} s={21} c={C.dim} f="mono">-f wav -</Tx>
          </g>
          {box(720, 580, 300, 110, 'Node', 'a pipe, cannot seek', C.red, ep(t, 5.4, 6.0))}
          {bar(598, ep(t, 6.2, 6.8), ep(t, 6.4, 8.0), C.red)}
          {[['READER 1', 'ffprobe, ffmpeg decode', 0], ['READER 2', 'the header bytes in Node', 1]].map(([n, d, i]) => (
            <g key={n as string} opacity={ep(t, 9.0 + (i as number) * 1.0, 9.6 + (i as number) * 1.0)}>
              <rect x={210 + (i as number) * 760} y={784} width={740} height={64} fill="none" stroke={C.text} strokeWidth={1.5} />
              <rect x={210 + (i as number) * 760} y={784} width={740} height={7} fill={C.cyan} />
              <Tx x={230 + (i as number) * 760} y={826} s={24} c={C.text} f="mono">{`${n}  ${d}`}</Tx>
            </g>
          ))}
        </Layer>
      </Cam>
    </>
  );
};

/* 2. The header: two fields */
const Header: React.FC<SceneProps> = ({t}) => {
  const fk = (col: string): HexKey[] => [{from: 4, len: 4, color: col, n: 1}, {from: 74, len: 4, color: col, n: 2}];
  return (
    <>
      <Head over="78 byte header" title="Two fields tell the size." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          <Plate x={210} y={310} w={1500} h={545} no="02" title="HEADER BYTES, 80 OF 192078" tag="offsets in hex" o={ep(t, 0.6, 1.2)} />
          <Tx x={240} y={366} s={22} c={C.green} f="mono" w={700} o={ep(t, 1.0, 1.6)}>FILE    -f wav out.wav</Tx>
          <Hex x={240} y={398} start={0} bytes={FILE_HEX} keys={fk(C.green)} fs={20} reveal={ep(t, 1.2, 3.0)} circ={ep(t, 3.0, 4.0)} o={ep(t, 1.0, 1.6)} />
          <Tx x={240} y={630} s={22} c={C.red} f="mono" w={700} o={ep(t, 5.0, 5.6)}>PIPE    -f wav -</Tx>
          <Hex x={240} y={652} start={0} bytes={PIPE_HEX} keys={fk(C.red)} fs={20} reveal={ep(t, 5.2, 6.8)} circ={ep(t, 6.8, 7.8)} o={ep(t, 5.0, 5.6)} />
          <Legend x={1150} y={392} s={26} gap={28} o={[ep(t, 3.6, 4.2), ep(t, 4.2, 4.8), ep(t, 8.2, 8.8)]} items={[
            {n: 1, color: C.amber, title: 'RIFF size, bytes 4 to 7', lines: ['file: 0x2ee46 = 192070', 'pipe: 0xffffffff']},
            {n: 2, color: C.amber, title: 'data size, bytes 74 to 77', lines: ['file: 0x2ee00 = 192000', 'pipe: 0xffffffff']},
            {color: C.cyan, title: 'everything else', lines: ['the other 70 header bytes and', 'all 192000 audio bytes are equal']},
          ]} />
        </Layer>
      </Cam>
    </>
  );
};

/* 3. The players: the duration each reader gets */
const Players: React.FC<SceneProps> = ({t}) => {
  const x0 = 900, u = 300; /* 1 s = 300 px */
  const rows: {label: string; sub: string; w: number | null; color: string; value: string; brk?: boolean; at: number}[] = [
    {label: 'size trusting player', sub: 'header of the file', w: 1, color: C.green, value: '1 s', at: 1.2},
    {label: 'size trusting player', sub: 'header of the pipe', w: 2.5, color: C.red, value: '22369.6 s = 6.2 hours', brk: true, at: 3.0},
    {label: 'ffprobe on the saved pipe capture', sub: 'falls back to the file size', w: 1, color: C.cyan, value: '1.0 s', at: 5.6},
    {label: 'the same, one more second appended', sub: 'the placeholder runs to the end', w: 2, color: C.amber, value: '2.0 s', at: 7.2},
    {label: 'ffprobe reading stdin', sub: 'any plain wav, even a true one', w: null, color: C.dim, value: 'N/A', at: 9.0},
    {label: 'ffmpeg decode, file and stdin', sub: 'bytes out of the pipe capture', w: 1, color: C.cyan, value: '192000 bytes', at: 10.6},
  ];
  return (
    <>
      <Head over="What each reader gets" title="Six hours, says the header." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <Plate x={210} y={310} w={1500} h={530} no="03" title="DURATION BY READER" tag="1 s = 300 px" o={ep(t, 0.6, 1.2)} />
          {[0, 1, 2].map((s) => (
            <g key={s} opacity={ep(t, 0.8, 1.4)}>
              <line x1={x0 + s * u} y1={352} x2={x0 + s * u} y2={800} stroke={C.mute} strokeWidth={1} strokeDasharray="4 6" />
              <Tx x={x0 + s * u} y={344} s={20} c={C.mute} a="middle" f="mono">{`${s} s`}</Tx>
            </g>
          ))}
          {rows.map((r, i) => {
            const y = 372 + i * 74, p = ep(t, r.at, r.at + 1.0);
            const full = r.w === null ? 0 : r.w * u;
            return (
              <g key={i} opacity={ep(t, r.at - 0.2, r.at + 0.3)}>
                <Tx x={240} y={y + 22} s={24} c={C.text} w={700}>{r.label}</Tx>
                <Tx x={240} y={y + 50} s={21} c={C.dim} f="mono">{r.sub}</Tx>
                {r.w !== null && <rect x={x0} y={y + 4} width={full * p} height={44} fill={r.color === C.red ? C.redDim : r.color === C.amber ? C.amberDim : r.color === C.green ? C.greenDim : C.cyanDim} stroke={r.color} strokeWidth={2.5} />}
                {r.brk && p > 0.95 && (
                  <g>
                    <rect x={x0 + full - 26} y={y + 2} width={24} height={48} fill={C.bg} />
                    <polyline points={`${x0 + full - 30},${y + 52} ${x0 + full - 16},${y + 34} ${x0 + full - 30},${y + 20} ${x0 + full - 16},${y + 2}`} fill="none" stroke={r.color} strokeWidth={2.5} />
                  </g>
                )}
                <Tx x={r.w === null ? x0 : x0 + full * p + 18} y={y + 38} s={r.brk ? 26 : 25} c={r.color === C.dim ? C.dim : r.color} f="mono" w={700} o={p > 0.8 ? 1 : 0}>{r.brk ? '' : r.value}</Tx>
                {r.brk && <Tx x={x0 + 14} y={y + 38} s={25} c={C.text} f="mono" w={700} o={p > 0.8 ? 1 : 0}>{r.value}</Tx>}
              </g>
            );
          })}
        </Layer>
      </Cam>
    </>
  );
};

/* 4. Three flags that do not fix it */
const Broken: React.FC<SceneProps> = ({t}) => {
  const W = 470, Y = 320, H = 480, xs = [210, 725, 1240];
  const sc = 0.59; /* bytes to px for the header bars of plate 1 */
  const seg = (x: number, y: number, parts: [string, number, string][], o = 1) => {
    let xx = x;
    return (
      <g opacity={o}>
        {parts.map(([n, b, col], i) => { const w = Math.max(3, b * sc); const el = <g key={i}><rect x={xx} y={y} width={w} height={34} fill={col} stroke={C.text} strokeWidth={1.5} />{b > 100 && <Tx x={xx + 10} y={y + 24} s={19} c={C.bg} f="mono" w={700}>{`${n} ${b}`}</Tx>}</g>; xx += w; return el; })}
      </g>
    );
  };
  return (
    <>
      <Head over="Flags on the pipe" title="Three that do not help." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          {/* plate 1: write_bext */}
          <Plate x={xs[0]} y={Y} w={W} h={H} no="04" title="WRITE_BEXT" o={ep(t, 0.6, 1.2)} />
          <Tx x={xs[0] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 1.0, 1.6)}>-write_bext 1</Tx>
          <Tx x={xs[0] + 28} y={Y + 104} s={21} c={C.dim} f="mono" o={ep(t, 1.4, 2.0)}>header, pipe: 78 B</Tx>
          {seg(xs[0] + 28, Y + 120, [['', 12, C.mute], ['', 24, C.mute], ['', 34, C.mute], ['', 8, C.mute]], ep(t, 1.4, 2.0))}
          <Tx x={xs[0] + 28} y={Y + 204} s={21} c={C.dim} f="mono" o={ep(t, 2.4, 3.0)}>header with bext: 688 B</Tx>
          {seg(xs[0] + 28, Y + 220, [['', 12, C.mute], ['', 24, C.mute], ['bext', 610, C.amber], ['', 34, C.mute], ['', 8, C.mute]], ep(t, 2.4, 3.0))}
          <Tx x={xs[0] + 28} y={Y + 330} s={22} c={C.dim} f="mono" o={ep(t, 3.6, 4.2)}>RIFF size   0xffffffff</Tx>
          <Tx x={xs[0] + 28} y={Y + 362} s={22} c={C.dim} f="mono" o={ep(t, 3.6, 4.2)}>data size   0xffffffff</Tx>
          <Tx x={xs[0] + 28} y={Y + 426} s={28} c={C.red} w={700} o={ep(t, 4.4, 5.0)}>placeholders stay</Tx>
          {/* plate 2: rf64 */}
          <Plate x={xs[1]} y={Y} w={W} h={H} no="05" title="RF64" o={ep(t, 5.6, 6.2)} />
          <Tx x={xs[1] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 6.0, 6.6)}>-rf64 always</Tx>
          <Tx x={xs[1] + 28} y={Y + 104} s={21} c={C.dim} f="mono" o={ep(t, 6.4, 7.0)}>ds64: riff, data, samples</Tx>
          <g opacity={ep(t, 6.6, 7.2)}>
            <Tx x={xs[1] + 28} y={Y + 148} s={22} c={C.green} f="mono" w={700}>file</Tx>
            <Tx x={xs[1] + 120} y={Y + 148} s={22} c={C.green} f="mono">192106  192000  48000</Tx>
            <Tx x={xs[1] + 28} y={Y + 190} s={22} c={C.red} f="mono" w={700}>pipe</Tx>
            <Tx x={xs[1] + 120} y={Y + 190} s={22} c={C.red} f="mono">0       0       0</Tx>
          </g>
          <Tx x={xs[1] + 28} y={Y + 262} s={21} c={C.dim} f="mono" o={ep(t, 8.0, 8.6)}>ffmpeg decodes the pipe capture</Tx>
          <g opacity={ep(t, 8.2, 8.8)}>
            <rect x={xs[1] + 28} y={Y + 280} width={410} height={40} fill="none" stroke={C.red} strokeWidth={2.5} strokeDasharray="6 5" />
            <Tx x={xs[1] + 40} y={Y + 308} s={22} c={C.red} f="mono" w={700}>0 of 192000 bytes</Tx>
          </g>
          <Tx x={xs[1] + 28} y={Y + 426} s={28} c={C.red} w={700} o={ep(t, 9.4, 10.0)}>worse than the plain pipe</Tx>
          {/* plate 3: w64 */}
          <Plate x={xs[2]} y={Y} w={W} h={H} no="06" title="WAVE64" o={ep(t, 10.6, 11.2)} />
          <Tx x={xs[2] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 11.0, 11.6)}>-f w64</Tx>
          <Tx x={xs[2] + 28} y={Y + 104} s={21} c={C.dim} f="mono" o={ep(t, 11.4, 12.0)}>64 bit size fields</Tx>
          <g opacity={ep(t, 11.6, 12.2)}>
            <Tx x={xs[2] + 28} y={Y + 148} s={21} c={C.red} f="mono">riff  0xffffffffffffffff</Tx>
            <Tx x={xs[2] + 28} y={Y + 184} s={21} c={C.red} f="mono">data  0x7fffffffffffffff</Tx>
          </g>
          <g opacity={ep(t, 12.8, 13.4)}>
            <rect x={xs[2] + 28} y={Y + 232} width={414} height={118} fill="none" stroke={C.red} strokeWidth={2.5} />
            <Tx x={xs[2] + 44} y={Y + 266} s={20} c={C.text} f="mono">ffprobe:</Tx>
            <Tx x={xs[2] + 44} y={Y + 296} s={20} c={C.red} f="mono" w={700}>Invalid data found when</Tx>
            <Tx x={xs[2] + 44} y={Y + 326} s={20} c={C.red} f="mono" w={700}>processing input</Tx>
          </g>
          <Tx x={xs[2] + 28} y={Y + 426} s={28} c={C.red} w={700} o={ep(t, 14.0, 14.6)}>ffmpeg refuses it</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 5. Three that work */
const Fixes: React.FC<SceneProps> = ({t}) => {
  const W = 470, Y = 320, H = 480, xs = [210, 725, 1240];
  const sw = ep(t, 3.0, 4.4); /* the patch lands */
  const chip = (x: number, y: number, bytes: string[], col: string, o: number) => (
    <g opacity={o}>{bytes.map((b, i) => <Tx key={i} x={x + i * 46} y={y} s={26} c={col} f="mono" w={700}>{b}</Tx>)}</g>
  );
  return (
    <>
      <Head over="What works" title="Patch it, or write it." color={C.green} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          {/* plate 1: patch eight bytes */}
          <Plate x={xs[0]} y={Y} w={W} h={H} no="07" title="PATCH 8 BYTES" o={ep(t, 0.6, 1.2)} />
          <Tx x={xs[0] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 1.0, 1.6)}>after the last byte</Tx>
          <Tx x={xs[0] + 28} y={Y + 112} s={21} c={C.dim} f="mono" o={ep(t, 1.4, 2.0)}>bytes 4 to 7, RIFF size</Tx>
          {chip(xs[0] + 28, Y + 152, ['ff', 'ff', 'ff', 'ff'], C.red, 1 - sw)}
          {chip(xs[0] + 28, Y + 152, ['46', 'ee', '02', '00'], C.green, sw)}
          <Tx x={xs[0] + 28} y={Y + 214} s={21} c={C.dim} f="mono" o={ep(t, 1.8, 2.4)}>bytes 74 to 77, data size</Tx>
          {chip(xs[0] + 28, Y + 254, ['ff', 'ff', 'ff', 'ff'], C.red, 1 - sw)}
          {chip(xs[0] + 28, Y + 254, ['00', 'ee', '02', '00'], C.green, sw)}
          <g opacity={ep(t, 4.8, 5.4)}>
            <Tx x={xs[0] + 28} y={Y + 336} s={22} c={C.text} f="mono">192078 of 192078 bytes</Tx>
            <Tx x={xs[0] + 28} y={Y + 366} s={22} c={C.text} f="mono">equal the file</Tx>
          </g>
          <Tx x={xs[0] + 28} y={Y + 426} s={28} c={C.green} w={700} o={ep(t, 5.6, 6.2)}>same file, byte for byte</Tx>
          {/* plate 2: raw plus a header */}
          <Plate x={xs[1]} y={Y} w={W} h={H} no="08" title="RAW AND A HEADER" o={ep(t, 6.6, 7.2)} />
          <Tx x={xs[1] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 7.0, 7.6)}>-f s16le -</Tx>
          <Tx x={xs[1] + 28} y={Y + 104} s={21} c={C.dim} f="mono" o={ep(t, 7.4, 8.0)}>Node writes 44 bytes first</Tx>
          <g opacity={ep(t, 7.8, 8.4)}>
            <rect x={xs[1] + 28} y={Y + 128} width={44} height={44} fill={C.green} stroke={C.text} strokeWidth={1.5} />
            <rect x={xs[1] + 72} y={Y + 128} width={338} height={44} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2.5} />
            <Tx x={xs[1] + 28} y={Y + 200} s={21} c={C.dim} f="mono">44 B header, not to scale</Tx>
          </g>
          <g opacity={ep(t, 8.8, 9.4)}>
            <Tx x={xs[1] + 28} y={Y + 262} s={22} c={C.text} f="mono">RIFF size  0x2ee24</Tx>
            <Tx x={xs[1] + 28} y={Y + 294} s={22} c={C.text} f="mono">data size  0x2ee00</Tx>
            <Tx x={xs[1] + 28} y={Y + 336} s={21} c={C.dim} f="mono">length known in advance</Tx>
          </g>
          <Tx x={xs[1] + 28} y={Y + 426} s={28} c={C.green} w={700} o={ep(t, 10.0, 10.6)}>true sizes, same audio</Tx>
          {/* plate 3: a file */}
          <Plate x={xs[2]} y={Y} w={W} h={H} no="09" title="A FILE" o={ep(t, 11.0, 11.6)} />
          <Tx x={xs[2] + 28} y={Y + 56} s={24} c={C.text} f="mono" w={700} o={ep(t, 11.4, 12.0)}>-f wav out.wav</Tx>
          <Tx x={xs[2] + 28} y={Y + 104} s={21} c={C.dim} f="mono" o={ep(t, 11.8, 12.4)}>ffmpeg seeks back at the end</Tx>
          <g opacity={ep(t, 12.2, 12.8)}>
            <rect x={xs[2] + 28} y={Y + 128} width={44} height={44} fill={C.green} stroke={C.text} strokeWidth={1.5} />
            <rect x={xs[2] + 72} y={Y + 128} width={338} height={44} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2.5} />
            <path d={`M ${xs[2] + 380} ${Y + 180} C ${xs[2] + 380} ${Y + 230}, ${xs[2] + 50} ${Y + 230}, ${xs[2] + 50} ${Y + 182}`} fill="none" stroke={C.green} strokeWidth={2.5} />
            <polygon points={`${xs[2] + 44},${Y + 190} ${xs[2] + 56},${Y + 190} ${xs[2] + 50},${Y + 178}`} fill={C.green} />
          </g>
          <g opacity={ep(t, 13.0, 13.6)}>
            <Tx x={xs[2] + 28} y={Y + 290} s={22} c={C.text} f="mono">RIFF size  0x2ee46</Tx>
            <Tx x={xs[2] + 28} y={Y + 322} s={22} c={C.text} f="mono">data size  0x2ee00</Tx>
          </g>
          <Tx x={xs[2] + 28} y={Y + 426} s={28} c={C.green} w={700} o={ep(t, 14.0, 14.6)}>the sizes come last</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 6. The close */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {n: 1, color: C.cyan, name: 'the header', rule: ['RIFF size at byte 4,', 'data size at byte 74'], seen: ['file: 192070 and 192000', 'pipe: 0xffffffff twice']},
    {n: 2, color: C.red, name: 'the players', rule: ['a size trusting player', 'divides by the byte rate'], seen: ['file: 1 s, pipe: 6.2 hours', 'ffprobe from stdin: N/A']},
    {n: 3, color: C.amber, name: 'the flags', rule: ['bext, rf64 always, w64', 'on a pipe'], seen: ['bext: no change', 'rf64: decodes 0 bytes, w64: refused']},
    {n: 4, color: C.green, name: 'the fixes', rule: ['patch 8 bytes, or raw', 'plus a 44 byte header'], seen: ['patched = the file, exactly', 'raw plus header: true sizes']},
  ];
  return (
    <>
      <Head over="What we measured" title="Unknown, written as all ones." color={C.cyan} o={ep(t, 0.2, 0.9)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <line x1={210} y1={300} x2={1710} y2={300} stroke={C.text} strokeWidth={2} opacity={ep(t, 0.8, 1.4)} />
          {rows.map((r, i) => {
            const y = 300 + i * 118, o = ep(t, 1.2 + i * 1.2, 1.9 + i * 1.2);
            return (
              <g key={r.n} opacity={o}>
                <Badge x={238} y={y + 59} n={r.n} color={r.color} r={20} />
                <Tx x={282} y={y + 70} s={42} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={720} y={y + 52} s={24} c={C.dim}>{r.rule[0]}</Tx>
                <Tx x={720} y={y + 84} s={24} c={C.dim}>{r.rule[1]}</Tx>
                {r.seen.map((s, k) => <Tx key={k} x={1170} y={y + 52 + k * 32} s={22} c={r.color} f="mono" w={700}>{s}</Tx>)}
                <line x1={210} y1={y + 118} x2={1710} y2={y + 118} stroke={C.mute} strokeWidth={1} />
              </g>
            );
          })}
        </Layer>
      </Cam>
      <Mid y={800} size={26} color={C.mute} o={ep(t, 6.2, 6.8)}>Not tested: other builds, files over 4 GiB, real recordings, other players.</Mid>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 7.2, 7.8)}>FFmpeg Reality Checks · episode 97 · fixture and tests in the description</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, header: Header, players: Players, broken: Broken, fixes: Fixes, close: Close};
