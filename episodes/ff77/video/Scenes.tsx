import React from 'react';
import {C, F} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Technical mini-documentary. Specimen plates with a number and a title, thin rules, hex dumps with the key bytes circled and
 * numbered callouts, box strips pulled apart (exploded) onto their fields, and a camera that creeps in very slowly.
 * Every byte, size, second and frame number below comes from evidence.json written by episodes/ff77/fixture/run.mjs (ffmpeg 6.1.1).
 * Strips marked "to scale" use the real byte sizes; the box strip of plate 1 is schematic and says so.
 */

const D = {"spec": {"frames": 100, "fps": 10, "seconds": 10, "gop": 10, "hashes": 100}, "reg": {"layout": [{"type": "ftyp", "size": 32}, {"type": "free", "size": 8}, {"type": "mdat", "size": 17784}, {"type": "moov", "size": 1243}], "hex": ["00", "00", "00", "6c", "6d", "76", "68", "64", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "03", "e8", "00", "00", "27", "10"], "mvhd": 10000}, "frag": {"ftyp": 36, "moov": 747, "moof": 152, "mdat": 2360, "mfra": 238, "n": 10, "hex": ["00", "00", "00", "6c", "6d", "76", "68", "64", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "03", "e8", "00", "00", "00", "00"], "mvhd": 0, "mfraEntries": 10, "bytes": 20397}, "dur": {"header": 0, "disk": 10, "pipe": 3, "sum": 10, "dragPipe": 4, "firstPipe": 1, "nbDisk": null, "mehdPipe": 3, "mehd": 10000, "regNb": 100}, "seek": {"expected": [0, 35, 99, 80], "disk": [0, 35, 99, 80], "reg": [0, 35, 99, 80], "frag": [0, 35, 99, 10], "fragdur": [0, 35, 99, 20], "fragfirst": [0, 35, 99, 0], "sidxbase": [0, 35, 99, 80]}, "sidx": {"hex": ["00", "00", "00", "a0", "73", "69", "64", "78", "01", "00", "00", "00", "00", "00", "00", "01", "00", "00", "28", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "0a", "00", "00", "09", "c8"], "timescale": 10240, "refs": 10, "total": 10, "pipe": 10, "dashPipe": 3, "moofAt": 943, "base": 783, "sidxSize": 160, "badFrames": 0, "goodFrames": 100, "noPipeSidx": 0}, "cut": {"pct": 55, "at": 11218, "of": 20397, "whole": 5, "frames": 50, "regFrames": 0, "regTop": ["ftyp", "free", "mdat"], "regErr": "moov atom not found"}, "cutLayout": [{"type": "ftyp", "size": 36}, {"type": "moov", "size": 747}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 2360}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1812}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1803}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1750}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1707}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1646}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1552}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1680}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1743}, {"type": "moof", "size": 152}, {"type": "mdat", "size": 1803}, {"type": "mfra", "size": 238}], "pipeW": {"fragBytes": 20397, "fragFrames": 100, "regBytes": 0}, "remux": {"hex": ["00", "00", "00", "6c", "6d", "76", "68", "64", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "00", "03", "e8", "00", "00", "27", "10"], "mvhd": 10000, "moofs": 0, "same": true, "pipe": 10, "frames": 100}};

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const pad = (n: number) => String(n);
const Cam: React.FC<{t: number; dur: number; children?: React.ReactNode}> = ({t, dur, children}) => {
  const p = Math.min(1, Math.max(0, t / dur));
  return <div style={{position: 'absolute', inset: 0, transformOrigin: '42% 48%', transform: `scale(${1 + 0.03 * p}) translate(${-5 * p}px, ${-3 * p}px)`}}>{children}</div>;
};
const Stage: React.FC<{t: number; dur: number; children?: React.ReactNode}> = ({t, dur, children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: C.bg}} />
    <Cam t={t} dur={dur}>{children}</Cam>
  </>
);
/** fade and settle for html (children use page coordinates) */
const H: React.FC<{t: number; a: number; d?: number; dy?: number; children?: React.ReactNode}> = ({t, a, d = 0.4, dy = 8, children}) => {
  const p = ep(t, a, a + d);
  if (p <= 0) return null;
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: p, transform: `translateY(${(1 - p) * dy}px)`}}>{children}</div>;
};
type TxProps = {x: number; y: number; size: number; font?: string; color?: string; weight?: number; w?: number; align?: 'left' | 'center' | 'right'; lh?: number; ls?: number; style?: React.CSSProperties; children?: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, size, font, color, weight, w, align, lh = 1.2, ls, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, fontFamily: font ?? F.sans, fontSize: size, fontWeight: weight, color: color ?? C.text, textAlign: align, lineHeight: lh, letterSpacing: ls, whiteSpace: w ? 'normal' : 'nowrap', ...style}}>{children}</div>
);
const Big: React.FC<Omit<TxProps, 'font' | 'weight' | 'lh'>> = (p) => <Tx {...p} font={F.display} weight={800} lh={1} />;
const Mono: React.FC<Omit<TxProps, 'font'>> = (p) => <Tx {...p} font={F.mono} />;
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <defs>
      <pattern id="hatch" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={9} stroke={C.mute} strokeWidth={2} /></pattern>
    </defs>
    {children}
  </svg>
);
/** a thin line that draws itself (p 0 to 1) */
const Ln: React.FC<{x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; w?: number; dash?: string}> = ({x1, y1, x2, y2, p = 1, color, w = 1.5, dash}) => (
  <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={color ?? C.text} strokeWidth={w} strokeDasharray={dash} />
);
/** numbered callout: a ring with a number */
const Call: React.FC<{x: number; y: number; n: number; color?: string}> = ({x, y, n, color}) => (
  <g>
    <circle cx={x} cy={y} r={19} fill={C.bg} stroke={color ?? C.red} strokeWidth={2} />
    <text x={x} y={y + 8} textAnchor="middle" fontFamily={F.mono} fontSize={22} fontWeight={700} fill={color ?? C.red}>{n}</text>
  </g>
);
/** plate header: a plate number, a title and a thin rule */
const Plate: React.FC<{t: number; n: string; title: string; sub?: string}> = ({t, n, title, sub}) => (
  <H t={t} a={0.2}>
    <Mono x={108} y={120} size={22} color={C.mute} ls={2}>PLATE {n}{sub ? ` · ${sub}` : ''}</Mono>
    <Big x={108} y={148} size={76}>{title}</Big>
    <Svg><Ln x1={108} y1={238} x2={1812} y2={238} color={C.line} w={2} /></Svg>
  </H>
);

type Bx = {type: string; w: number; fill?: string; dashed?: boolean; hatch?: boolean; label?: boolean};
const fillOf = (type: string): string => ({ftyp: C.panel, free: C.line, moov: C.cyanDim, moof: C.amberDim, mdat: C.bg2, sidx: C.greenDim, mfra: C.panel} as Record<string, string>)[type] ?? C.bg2;
/** a row of boxes in file order, drawn from x; returns the x of every box */
const posOf = (x: number, boxes: Bx[]) => { let o = x; return boxes.map((b) => { const r = o; o += b.w; return r; }); };
const Strip: React.FC<{x: number; y: number; h: number; boxes: Bx[]; t: number; a: number; size?: number}> = ({x, y, h, boxes, t, a, size = 22}) => {
  const xs = posOf(x, boxes);
  return (
    <Svg>
      {boxes.map((b, i) => {
        const p = ep(t, a + i * 0.035, a + i * 0.035 + 0.25);
        if (p <= 0) return null;
        return (
          <g key={i} opacity={p}>
            <rect x={xs[i]} y={y} width={b.w} height={h} fill={b.dashed ? 'none' : b.fill ?? fillOf(b.type)} stroke={b.dashed ? C.mute : C.text} strokeWidth={1.5} strokeDasharray={b.dashed ? '7 6' : undefined} />
            {b.hatch ? <rect x={xs[i]} y={y} width={b.w} height={h} fill="url(#hatch)" /> : null}
            {b.label !== false && b.w >= 54 ? <text x={xs[i] + b.w / 2} y={y + h / 2 + 7} textAnchor="middle" fontFamily={F.mono} fontSize={size} fill={b.dashed ? C.mute : C.text}>{b.type}</text> : null}
          </g>
        );
      })}
    </Svg>
  );
};
/** a hex dump: one row of bytes, fields bracketed and named underneath, key bytes circled and numbered */
type Field = [number, number, string];
type Mark = {from: number; to: number; n: number; color?: string; a: number};
const Hex: React.FC<{x: number; y: number; bytes: string[]; fields?: Field[]; marks?: Mark[]; t: number; a: number; size?: number}> = ({x, y, bytes, fields = [], marks = [], t, a, size = 30}) => {
  const bw = size * 1.74, ch = size * 1.25;
  return (
    <>
      <H t={t} a={a}>
        {bytes.map((b, i) => <Mono key={i} x={x + i * bw} y={y} size={size} color={C.text}>{b}</Mono>)}
        <Svg>
          {fields.map(([f0, f1, name], i) => (
            <g key={i}>
              <Ln x1={x + f0 * bw} y1={y + ch + 8} x2={x + f1 * bw - 10} y2={y + ch + 8} color={C.mute} w={1.5} />
              <text x={x + (f0 + f1) * bw / 2 - 5} y={y + ch + 34} textAnchor="middle" fontFamily={F.mono} fontSize={Math.round(size * 0.68)} fill={C.dim}>{name}</text>
            </g>
          ))}
        </Svg>
      </H>
      {marks.map((m, i) => {
        const p = ep(t, m.a, m.a + 0.6);
        if (p <= 0) return null;
        const cx = x + (m.from + m.to) * bw / 2 - 5, rx = (m.to - m.from) * bw / 2 + 4, cy = y + ch / 2 + 2, ry = ch * 0.78;
        return (
          <Svg key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={m.color ?? C.red} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
            <g opacity={p}><Call x={cx + rx - 4} y={cy - ry - 8} n={m.n} color={m.color ?? C.red} /></g>
          </Svg>
        );
      })}
    </>
  );
};
const REGFIELDS: Field[] = [[0, 4, 'size'], [4, 8, 'type'], [8, 12, 'flags'], [12, 16, 'created'], [16, 20, 'modified'], [20, 24, 'timescale'], [24, 28, 'duration']];
const Chip: React.FC<{x: number; y: number; w: number; k: string; v: string; color?: string; dashed?: boolean}> = ({x, y, w, k, v, color, dashed}) => (
  <>
    <Svg><rect x={x} y={y} width={w} height={78} fill="none" stroke={color ?? C.text} strokeWidth={1.5} strokeDasharray={dashed ? '7 6' : undefined} /></Svg>
    <Mono x={x + 16} y={y + 8} size={20} color={C.dim}>{k}</Mono>
    <Big x={x + 16} y={y + 36} size={34} color={color ?? C.text}>{v}</Big>
  </>
);

/* ===== 1. The question ===== */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A: Bx[] = [{type: 'ftyp', w: 70}, {type: 'free', w: 40, label: false}, {type: 'mdat', w: 620}, {type: 'moov', w: 170}];
  const B: Bx[] = [{type: 'ftyp', w: 70}, {type: 'moov', w: 170}, ...Array.from({length: 10}, (_, i) => [{type: 'moof', w: 24, label: false} as Bx, {type: 'mdat', w: 36, label: false} as Bx]).flat(), {type: 'mfra', w: 100}];
  return (
    <Stage t={t} dur={dur}>
      <H t={t} a={0.2}>
        <Mono x={108} y={120} size={22} color={C.mute} ls={2}>SPECIMEN STUDY</Mono>
        <Big x={108} y={148} size={92}>Fragmented MP4: where did the duration go?</Big>
        <Svg><Ln x1={108} y1={262} x2={1812} y2={262} color={C.line} w={2} /></Svg>
      </H>
      <H t={t} a={3.4}>
        <Mono x={108} y={300} size={22} color={C.mute}>THE CLIP</Mono>
        <Mono x={108} y={338} size={28}>{D.spec.frames} frames, {D.spec.fps} fps, {D.spec.seconds} s</Mono>
        <Mono x={108} y={380} size={28}>a keyframe every {D.spec.gop} frames</Mono>
        <Mono x={108} y={422} size={28}>64x48, one flat card per frame</Mono>
        <Mono x={108} y={464} size={28}>lossless: a frame names itself</Mono>
      </H>
      <H t={t} a={7.0}>
        <Mono x={860} y={300} size={22} color={C.mute}>SPECIMEN A  reg.mp4</Mono>
        <Mono x={1330} y={300} size={22} color={C.mute}>no movflags</Mono>
      </H>
      <Strip x={860} y={338} h={56} boxes={A} t={t} a={7.2} />
      <H t={t} a={8.6}>
        <Mono x={860} y={436} size={22} color={C.mute}>SPECIMEN B  frag.mp4</Mono>
        <Mono x={860} y={474} size={26} color={C.red}>-movflags frag_keyframe+empty_moov</Mono>
      </H>
      <Strip x={860} y={518} h={56} boxes={B} t={t} a={8.8} size={20} />
      <H t={t} a={11.6}>
        <Svg><Ln x1={108} y1={640} x2={1812} y2={640} color={C.line} w={2} /></Svg>
        <Call x={130} y={700} n={1} color={C.cyan} />
        <Tx x={166} y={680} size={30} weight={700}>Reader 1: a box reader written in Node</Tx>
        <Tx x={166} y={722} size={26} color={C.dim}>adds up every sample, trusts no header total</Tx>
      </H>
      <H t={t} a={13.6}>
        <Call x={1010} y={700} n={2} color={C.amber} />
        <Tx x={1046} y={680} size={30} weight={700}>Reader 2: ffprobe and ffmpeg</Tx>
        <Tx x={1046} y={722} size={26} color={C.dim}>durations, frames decoded, where a seek lands</Tx>
      </H>
      <H t={t} a={15.0}>
        <Mono x={108} y={800} size={24} color={C.dim}>each file read from disk, and again from a pipe (stdin)</Mono>
      </H>
    </Stage>
  );
};

/* ===== 2. Inside the file ===== */
const Boxes: React.FC<SceneProps> = ({t, dur}) => {
  const L = D.reg.layout;
  const A: Bx[] = [{type: 'ftyp', w: 70}, {type: 'free', w: 40, label: false}, {type: 'mdat', w: 880}, {type: 'moov', w: 170}];
  const B: Bx[] = [{type: 'ftyp', w: 70}, {type: 'moov', w: 170}, ...Array.from({length: D.frag.n}, () => [{type: 'moof', w: 34, label: false} as Bx, {type: 'mdat', w: 62, label: false} as Bx]).flat(), {type: 'mfra', w: 100}];
  const xB = posOf(150, B), xA = posOf(150, A);
  return (
    <Stage t={t} dur={dur}>
      <Plate t={t} n="1" title="Inside the file" sub="boxes in file order, widths schematic" />
      <H t={t} a={0.8}><Mono x={108} y={262} size={24} color={C.mute}>A   reg.mp4</Mono></H>
      <Strip x={150} y={296} h={52} boxes={A} t={t} a={1.0} />
      <H t={t} a={1.6}>
        {A.map((b, i) => <Mono key={i} x={xA[i]} y={354} size={18} color={C.mute}>{L[i].size}</Mono>)}
        <Svg><Ln x1={xA[3] + 85} y1={348} x2={xA[3] + 85} y2={392} color={C.mute} w={1.5} dash="5 5" /></Svg>
      </H>
      <Hex x={150} y={398} bytes={D.reg.hex} fields={REGFIELDS} marks={[{from: 24, to: 28, n: 1, color: C.green, a: 3.0}]} t={t} a={2.0} size={28} />
      <H t={t} a={3.4}><Big x={1560} y={400} size={50} color={C.green}>{D.reg.mvhd}</Big><Mono x={1560} y={452} size={20} color={C.dim}>milliseconds</Mono></H>
      <H t={t} a={6.0}><Mono x={108} y={528} size={24} color={C.mute}>B   frag.mp4</Mono></H>
      <Strip x={150} y={562} h={52} boxes={B} t={t} a={6.2} size={20} />
      <H t={t} a={7.4}>
        <Mono x={xB[0]} y={620} size={18} color={C.mute}>{D.frag.ftyp}</Mono>
        <Mono x={xB[1]} y={620} size={18} color={C.mute}>{D.frag.moov}</Mono>
        <Mono x={xB[2]} y={620} size={18} color={C.mute}>10 pairs</Mono>
        <Mono x={xB[B.length - 1]} y={620} size={18} color={C.mute}>{D.frag.mfra}</Mono>
        <Svg><Ln x1={xB[1] + 85} y1={614} x2={xB[1] + 85} y2={660} color={C.mute} w={1.5} dash="5 5" /></Svg>
      </H>
      <Hex x={150} y={664} bytes={D.frag.hex} fields={REGFIELDS} marks={[{from: 24, to: 28, n: 2, color: C.red, a: 8.0}]} t={t} a={7.6} size={28} />
      <H t={t} a={8.4}><Big x={1560} y={666} size={50} color={C.red}>{D.frag.mvhd}</Big><Mono x={1560} y={718} size={20} color={C.dim}>not written</Mono></H>
      <H t={t} a={10.2}><Chip x={150} y={792} w={300} k="mehd" v="not there" /></H>
      <H t={t} a={10.8}><Chip x={480} y={792} w={300} k="sidx" v="not there" /></H>
      <H t={t} a={11.4}><Chip x={810} y={792} w={300} k="moof boxes" v={pad(D.frag.n)} color={C.amber} /></H>
      <H t={t} a={12.0}><Chip x={1140} y={792} w={340} k="mfra entries" v={pad(D.frag.mfraEntries)} color={C.amber} /></H>
    </Stage>
  );
};

/* ===== 3. Three durations ===== */
const Dur: React.FC<SceneProps> = ({t, dur}) => {
  const X0 = 200, PX = 152, ax = (s: number) => X0 + s * PX, AY = 470;
  const draw = (a: number) => ep(t, a, a + 0.7);
  return (
    <Stage t={t} dur={dur}>
      <Plate t={t} n="2" title="Three durations, one file" />
      <H t={t} a={0.5}>
        <Svg>
          <Ln x1={ax(0)} y1={AY} x2={ax(10)} y2={AY} color={C.text} w={2.5} />
          {Array.from({length: 11}, (_, s) => <Ln key={s} x1={ax(s)} y1={AY - 9} x2={ax(s)} y2={AY + 9} w={2} />)}
        </Svg>
        {Array.from({length: 11}, (_, s) => <Mono key={s} x={ax(s) - 20} y={AY + 16} w={40} align="center" size={20} color={C.mute}>{s}</Mono>)}
        <Mono x={ax(5) - 60} y={AY + 46} w={120} align="center" size={20} color={C.mute}>seconds</Mono>
      </H>
      {/* 1: the header */}
      <H t={t} a={1.2}>
        <Svg><Ln x1={ax(0)} y1={AY} x2={ax(0)} y2={330} color={C.red} w={2} /><Call x={ax(0)} y={312} n={1} color={C.red} /></Svg>
        <Mono x={ax(0) - 92} y={256} size={20} color={C.dim}>header (mvhd)</Mono>
        <Big x={ax(0) + 40} y={282} size={64} color={C.red}>{D.dur.header} s</Big>
      </H>
      {/* 2: ffprobe on disk */}
      <H t={t} a={3.0}>
        <Svg><Ln x1={ax(10)} y1={AY} x2={ax(10)} y2={330} p={draw(3.0)} color={C.green} w={2} /><Call x={ax(10)} y={312} n={2} color={C.green} /></Svg>
        <Mono x={1280} y={256} size={20} color={C.dim} w={380} align="right">ffprobe, file on disk</Mono>
        <Big x={1360} y={282} w={300} align="right" size={64} color={C.green}>{D.dur.disk.toFixed(1)} s</Big>
      </H>
      {/* 2: ffprobe on a pipe */}
      <H t={t} a={5.2}>
        <Svg><Ln x1={ax(D.dur.pipe)} y1={AY} x2={ax(D.dur.pipe)} y2={330} p={draw(5.2)} color={C.red} w={2} /><Call x={ax(D.dur.pipe)} y={312} n={3} color={C.red} /></Svg>
        <Mono x={ax(D.dur.pipe) - 70} y={256} size={20} color={C.dim}>ffprobe, from a pipe</Mono>
        <Big x={ax(D.dur.pipe) + 40} y={282} size={64} color={C.red}>{D.dur.pipe.toFixed(1)} s</Big>
      </H>
      {/* 4: the box reader */}
      <H t={t} a={7.6}>
        <Svg><Ln x1={ax(10)} y1={AY + 44} x2={ax(10)} y2={560} p={draw(7.6)} color={C.cyan} w={2} dash="6 5" /><Call x={ax(10)} y={580} n={4} color={C.cyan} /></Svg>
        <Mono x={1180} y={610} size={20} color={C.dim} w={620} align="right">box reader, every sample added</Mono>
        <Big x={1480} y={636} w={320} align="right" size={64} color={C.cyan}>{D.dur.sum.toFixed(1)} s</Big>
      </H>
      <H t={t} a={9.6}>
        <Svg><Ln x1={108} y1={742} x2={1812} y2={742} color={C.line} w={2} /></Svg>
        <Chip x={108} y={776} w={560} k="a mehd added by hand" v={`${D.dur.mehd} ms, pipe still ${D.dur.mehdPipe.toFixed(1)} s`} dashed />
        <Chip x={700} y={776} w={500} k="other layouts, from a pipe" v={`${D.dur.dragPipe.toFixed(1)} s and ${D.dur.firstPipe.toFixed(1)} s`} color={C.red} />
        <Chip x={1232} y={776} w={580} k="stream frame count, on disk" v={`N/A (regular file: ${D.dur.regNb})`} color={C.amber} />
      </H>
    </Stage>
  );
};

/* ===== 4. Seeking ===== */
const Seek: React.FC<SceneProps> = ({t, dur}) => {
  const X0 = 200, PX = 15.2, fx = (f: number) => X0 + f * PX, AY = 318;
  const S = D.seek;
  const cols = ['-ss 0', '-ss 3.5', '-ss 9.9', '-sseof -2'];
  const CX = [640, 870, 1100, 1330];
  const rows: {name: string; vals: number[]; a: number; color?: string}[] = [
    {name: 'should land on', vals: S.expected, a: 1.0},
    {name: 'disk, every layout', vals: S.disk, a: 2.4, color: C.green},
    {name: 'pipe, regular', vals: S.reg, a: 6.2, color: C.green},
    {name: 'pipe, frag', vals: S.frag, a: 8.4, color: C.text},
    {name: 'pipe, 2 s fragments', vals: S.fragdur, a: 10.4, color: C.text},
    {name: 'pipe, no empty_moov', vals: S.fragfirst, a: 12.0, color: C.text},
  ];
  return (
    <Stage t={t} dur={dur}>
      <Plate t={t} n="3" title="Seeking" sub="the frame each seek lands on" />
      <H t={t} a={0.6}>
        <Svg>
          <Ln x1={fx(0)} y1={AY} x2={fx(99)} y2={AY} w={2.5} />
          {Array.from({length: 100}, (_, f) => <Ln key={f} x1={fx(f)} y1={AY - (f % 10 === 0 ? 10 : 4)} x2={fx(f)} y2={AY + (f % 10 === 0 ? 10 : 4)} w={f % 10 === 0 ? 2 : 1} color={f % 10 === 0 ? C.text : C.mute} />)}
        </Svg>
        {Array.from({length: 10}, (_, k) => <Mono key={k} x={fx(k * 10) - 20} y={AY + 14} w={40} align="center" size={18} color={C.mute}>{k * 10}</Mono>)}
        <Mono x={fx(99) + 14} y={AY - 12} size={18} color={C.mute}>frame</Mono>
        
      </H>
      <H t={t} a={1.6}>
        <Svg><Ln x1={fx(80)} y1={AY} x2={fx(80)} y2={AY - 38} color={C.green} w={2.5} /><Call x={fx(80)} y={AY - 56} n={1} color={C.green} /></Svg>
        <Mono x={fx(80) - 500} y={AY - 68} w={460} align="right" size={20} color={C.green}>-sseof -2 should land here: 80</Mono>
      </H>
      <H t={t} a={8.6}>
        <Svg><Ln x1={fx(S.frag[3])} y1={AY + 36} x2={fx(S.frag[3])} y2={AY + 66} color={C.red} w={2.5} /></Svg>
        <Mono x={fx(S.frag[3]) - 6} y={AY + 70} size={20} color={C.red}>frag: {S.frag[3]}</Mono>
      </H>
      <H t={t} a={10.6}>
        <Svg><Ln x1={fx(S.fragdur[3])} y1={AY + 36} x2={fx(S.fragdur[3])} y2={AY + 96} color={C.red} w={2.5} /></Svg>
        <Mono x={fx(S.fragdur[3]) + 8} y={AY + 100} size={20} color={C.red}>2 s fragments: {S.fragdur[3]}</Mono>
      </H>
      <H t={t} a={12.2}>
        <Svg><Ln x1={fx(S.fragfirst[3])} y1={AY + 36} x2={fx(S.fragfirst[3])} y2={AY + 126} color={C.red} w={2.5} /></Svg>
        <Mono x={fx(S.fragfirst[3]) + 8} y={AY + 130} size={20} color={C.red}>no empty_moov: {S.fragfirst[3]}</Mono>
      </H>
      <H t={t} a={0.8}>
        {cols.map((c, i) => <Mono key={c} x={CX[i] - 100} y={500} w={200} align="center" size={26} color={C.dim}>{c}</Mono>)}
        <Svg><Ln x1={108} y1={540} x2={1560} y2={540} color={C.text} w={2} /></Svg>
      </H>
      {rows.map((r, ri) => {
        const y = 552 + ri * 48;
        return (
          <H key={r.name} t={t} a={r.a}>
            <Mono x={108} y={y + 4} size={24} color={C.text}>{r.name}</Mono>
            {r.vals.map((v, ci) => {
              const exp = S.expected[ci];
              return <Big key={ci} x={CX[ci] - 100} y={y} w={200} align="center" size={42} color={ri === 0 ? C.text : v === exp ? C.green : C.red}>{v}</Big>;
            })}
            <Svg><Ln x1={108} y1={y + 44} x2={1560} y2={y + 44} color={C.line} w={1} /></Svg>
          </H>
        );
      })}
      <H t={t} a={14.0}><Mono x={1000} y={852} size={22} color={C.red}>silent: no error, no warning</Mono></H>
    </Stage>
  );
};

/* ===== 5. The index ===== */
const Sidx: React.FC<SceneProps> = ({t, dur}) => {
  const SB: Bx[] = [{type: 'ftyp', w: 70}, {type: 'moov', w: 170}, {type: 'sidx', w: 64}, ...Array.from({length: 10}, () => [{type: 'moof', w: 20, label: false} as Bx, {type: 'mdat', w: 36, label: false} as Bx]).flat()];
  const xs = posOf(150, SB);
  const RX0 = 300, RW = 100, RG = 6;
  const refs = Array.from({length: D.sidx.refs}, (_, i) => i);
  const bx0 = 150, bx1 = 1130, scale = (b: number) => bx0 + (b / (D.sidx.moofAt + 400)) * (bx1 - bx0);
  return (
    <Stage t={t} dur={dur}>
      <Plate t={t} n="4" title="The index" sub="global_sidx" />
      <Strip x={150} y={266} h={44} boxes={SB} t={t} a={0.8} size={20} />
      <H t={t} a={2.0}>
        <Svg>
          <Ln x1={xs[2]} y1={310} x2={RX0} y2={358} color={C.green} w={1.5} dash="5 5" />
          <Ln x1={xs[2] + 64} y1={310} x2={RX0 + D.sidx.refs * (RW + RG) - RG} y2={358} color={C.green} w={1.5} dash="5 5" />
        </Svg>
      </H>
      {refs.map((i) => (
        <H key={i} t={t} a={2.4 + i * 0.22} d={0.25} dy={0}>
          <Svg><rect x={RX0 + i * (RW + RG)} y={358} width={RW} height={44} fill={C.greenDim} stroke={C.text} strokeWidth={1.5} /></Svg>
          <Mono x={RX0 + i * (RW + RG)} y={368} w={RW} align="center" size={22}>1.0 s</Mono>
        </H>
      ))}
      <H t={t} a={5.0}>
        <Svg><Ln x1={RX0} y1={420} x2={RX0 + D.sidx.refs * (RW + RG) - RG} y2={420} color={C.green} w={2} /></Svg>
        <Mono x={RX0} y={430} size={24} color={C.green}>{D.sidx.refs} references, timescale {D.sidx.timescale}: total {D.sidx.total.toFixed(1)} s</Mono>
      </H>
      <H t={t} a={6.4}>
        <Big x={1450} y={346} size={52} color={C.green}>{D.sidx.pipe.toFixed(1)} s</Big>
        <Mono x={1450} y={402} size={20} color={C.dim}>ffprobe, from a pipe</Mono>
        <Mono x={1450} y={430} size={20} color={C.green}>-sseof -2 lands on {D.seek.sidxbase[3]}</Mono>
      </H>
      <Hex x={150} y={500} bytes={D.sidx.hex.slice(0, 40)} marks={[{from: 16, to: 20, n: 1, color: C.green, a: 5.6}, {from: 38, to: 40, n: 2, color: C.green, a: 6.2}]} t={t} a={5.0} size={22} />
      <H t={t} a={6.4}>
        <Mono x={690} y={548} size={20} color={C.dim}>1  timescale {D.sidx.timescale}</Mono>
        <Mono x={1330} y={548} w={360} align="right" size={20} color={C.dim}>2  reference count {D.sidx.refs}</Mono>
      </H>
      <H t={t} a={8.8}>
        <Svg><Ln x1={108} y1={592} x2={1812} y2={592} color={C.line} w={2} /></Svg>
        <Mono x={108} y={608} size={22} color={C.red} ls={1}>global_sidx without default_base_moof</Mono>
      </H>
      <H t={t} a={9.6}>
        <Svg>
          <rect x={bx0} y={668} width={bx1 - bx0} height={36} fill="none" stroke={C.text} strokeWidth={1.5} />
          <rect x={scale(D.sidx.base)} y={668} width={scale(D.sidx.moofAt) - scale(D.sidx.base)} height={36} fill={C.greenDim} stroke={C.text} strokeWidth={1.5} />
          <Ln x1={scale(D.sidx.base)} y1={668} x2={scale(D.sidx.base)} y2={730} color={C.red} w={3} />
          <Ln x1={scale(D.sidx.moofAt)} y1={668} x2={scale(D.sidx.moofAt)} y2={730} color={C.green} w={3} />
        </Svg>
        <Mono x={scale(D.sidx.base) - 250} y={738} size={20} color={C.red} w={260} align="right">tfhd base offset {D.sidx.base}</Mono>
        <Mono x={scale(D.sidx.moofAt) + 10} y={738} size={20} color={C.green}>the moof is really at {D.sidx.moofAt}</Mono>
        <Mono x={scale(D.sidx.base) + 6} y={640} size={20} color={C.dim}>the sidx: {D.sidx.sidxSize} bytes</Mono>
      </H>
      <H t={t} a={11.6}>
        <Chip x={1230} y={650} w={582} k="global_sidx alone" v={`${D.sidx.badFrames} frames decode`} color={C.red} />
        <Chip x={1230} y={738} w={582} k="plus default_base_moof" v={`${D.sidx.goodFrames} frames decode`} color={C.green} />
      </H>
      <H t={t} a={13.4}><Mono x={108} y={802} size={22} color={C.dim}>written to a pipe, global_sidx is dropped: {D.sidx.noPipeSidx} sidx boxes</Mono></H>
    </Stage>
  );
};

/* ===== 6. Why fragment ===== */
const Cut: React.FC<SceneProps> = ({t, dur}) => {
  const TW = 1300, X0 = 150;
  const reg = D.reg.layout, total = reg.reduce((s, b) => s + b.size, 0);
  const ev = D.cutLayout as {type: string; size: number}[];
  const fragTotal = D.cut.of;
  const cutX = X0 + (D.cut.pct / 100) * TW;
  const toScale = (list: {type: string; size: number}[], tot: number, y: number, kind: 'reg' | 'frag') => {
    let pos = 0; const out: React.ReactNode[] = [];
    list.forEach((b, i) => {
      const x = X0 + (pos / tot) * TW, w = Math.max(1.5, (b.size / tot) * TW); pos += b.size;
      const end = x + w;
      const whole = end <= cutX + 0.5, partial = !whole && x < cutX;
      const fill = fillOf(b.type);
      out.push(
        <g key={i}>
          <rect x={x} y={y} width={partial ? cutX - x : w} height={54} fill={whole || partial ? fill : 'none'} stroke={whole || partial ? C.text : C.mute} strokeWidth={whole || partial ? 1.5 : 1.2} strokeDasharray={whole || partial ? undefined : '6 5'} />
          {partial ? <rect x={x} y={y} width={cutX - x} height={54} fill="url(#hatch)" /> : null}
          {(partial ? cutX - x > 90 : w > 60) ? <text x={(partial ? (x + cutX) / 2 : x + w / 2)} y={y + 33} textAnchor="middle" fontFamily={F.mono} fontSize={20} fill={whole || partial ? C.text : C.mute}>{b.type}</text> : null}
        </g>,
      );
    });
    return out;
  };
  return (
    <Stage t={t} dur={dur}>
      <Plate t={t} n="5" title="Why fragment at all" sub="both files cut at 55 percent, to scale" />
      <H t={t} a={0.6}><Mono x={108} y={268} size={24} color={C.mute}>A   reg.mp4</Mono></H>
      <H t={t} a={0.8}><Svg>{toScale(reg, total, 304, 'reg')}</Svg></H>
      <H t={t} a={0.6}><Mono x={108} y={408} size={24} color={C.mute}>B   frag.mp4</Mono></H>
      <H t={t} a={1.0}><Svg>{toScale(ev, fragTotal, 444, 'frag')}</Svg></H>
      <H t={t} a={2.6}>
        <Svg><Ln x1={cutX} y1={284} x2={cutX} y2={520} color={C.red} w={3} dash="10 7" /></Svg>
        <Mono x={cutX + 14} y={520} size={20} color={C.red}>cut: byte {D.cut.at} of {D.cut.of}</Mono>
      </H>
      <H t={t} a={4.0}>
        <Call x={1496} y={331} n={1} color={C.red} />
        <Tx x={1530} y={306} size={26} weight={700} color={C.red} w={280}>no moov: the file will not open</Tx>
        <Mono x={1530} y={380} size={20} color={C.dim}>{D.cut.regFrames} frames</Mono>
      </H>
      <H t={t} a={7.0}>
        <Call x={1496} y={471} n={2} color={C.green} />
        <Tx x={1530} y={446} size={26} weight={700} color={C.green} w={280}>{D.cut.whole} whole fragments</Tx>
        <Mono x={1530} y={484} size={20} color={C.dim}>{D.cut.frames} frames decode</Mono>
      </H>
      <H t={t} a={9.0}>
        <Svg><Ln x1={108} y1={602} x2={1812} y2={602} color={C.line} w={2} /></Svg>
        <Mono x={108} y={620} size={22} color={C.mute} ls={1}>WRITING STRAIGHT TO A PIPE</Mono>
      </H>
      <H t={t} a={10.2}>
        <Chip x={108} y={672} w={780} k="regular mp4 to a pipe" v={`${D.pipeW.regBytes} bytes written`} color={C.red} />
        <Mono x={108} y={764} size={20} color={C.red}>muxer does not support non seekable output</Mono>
      </H>
      <H t={t} a={12.2}>
        <Chip x={928} y={672} w={884} k="fragmented mp4 to a pipe" v={`${D.pipeW.fragBytes} bytes, ${D.pipeW.fragFrames} frames decode`} color={C.green} />
      </H>
    </Stage>
  );
};

/* ===== 7. What to do ===== */
const Close: React.FC<SceneProps> = ({t, dur}) => (
  <Stage t={t} dur={dur}>
    <Plate t={t} n="6" title="What to do" />
    <H t={t} a={0.8}>
      <Svg><rect x={108} y={270} width={1704} height={214} fill="none" stroke={C.text} strokeWidth={1.5} /></Svg>
      <Mono x={136} y={286} size={22} color={C.mute}>KEEP IT</Mono>
      <Big x={136} y={320} size={64} color={C.green}>-c copy</Big>
      <Tx x={136} y={400} w={640} size={26} color={C.dim}>{D.remux.moofs} moof, {D.remux.frames} frames, {D.remux.same ? 'the same frame hashes' : 'hashes differ'}, a pipe reads {D.remux.pipe.toFixed(1)} s</Tx>
    </H>
    <Hex x={900} y={336} bytes={D.remux.hex.slice(16, 28)} marks={[{from: 8, to: 12, n: 1, color: C.green, a: 2.4}]} t={t} a={1.6} size={30} />
    <H t={t} a={2.8}><Mono x={900} y={430} size={20} color={C.dim}>header: duration {D.remux.mvhd} ms</Mono></H>
    <H t={t} a={5.0}>
      <Svg><rect x={108} y={512} width={1704} height={180} fill="none" stroke={C.text} strokeWidth={1.5} /></Svg>
      <Mono x={136} y={528} size={22} color={C.mute}>STREAM IT</Mono>
      <Big x={136} y={562} size={64} color={C.cyan}>global_sidx + default_base_moof</Big>
      <Tx x={136} y={636} size={28} color={C.dim}>a pipe reads {D.sidx.pipe.toFixed(1)} s, -sseof lands on {D.seek.sidxbase[3]}, {D.sidx.goodFrames} frames decode</Tx>
    </H>
    <H t={t} a={8.0}>
      <Svg><rect x={108} y={720} width={1704} height={130} fill="none" stroke={C.amber} strokeWidth={2} strokeDasharray="10 8" /></Svg>
      <Mono x={136} y={736} size={22} color={C.amber}>NOT TESTED</Mono>
      <Tx x={136} y={776} size={30}>other ffmpeg builds, audio tracks, browsers and players, real footage</Tx>
    </H>
  </Stage>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, boxes: Boxes, duration: Dur, seek: Seek, sidx: Sidx, cut: Cut, close: Close};
