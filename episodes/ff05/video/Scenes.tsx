import React from 'react';
import {Box, Code, Overline, Pill, Readout, Txt, Big} from '../../kit/Primitives';
import {C, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff05/fixture/experiment.mjs (evidence.json from fixture/run.mjs).
   The source keeps frame n of a 30 fps, 5 s clip unless n % 4 == 2 or 60 <= n <= 85. That is the same rule as the fixture's select filter. */
const SRC_T: number[] = [];
for (let n = 0; n < 150; n++) if (!(n % 4 === 2) && !(n >= 60 && n <= 85)) SRC_T.push(n / 30);
const AX = W - 2 * M;          // axis width in px for 5 seconds
const px = (s: number) => (s / 5) * AX;
/* Constant 30 fps on ffmpeg 6.1.1: slot i shows the latest source frame at or before i/30. A slot is a duplicate if it shows the same frame as slot i-1. */
const CFR = Array.from({length: 150}, (_, i) => {
  let k = 0; while (k + 1 < SRC_T.length && SRC_T[k + 1] <= i / 30 + 1e-9) k++;
  return {t: i / 30, src: k};
}).map((s, i, a) => ({...s, dup: i > 0 && a[i - 1].src === s.src}));

const Ticks: React.FC<{y: number; ts: {t: number; dup?: boolean}[]; shown?: number; color: string; o?: number}> = ({y, ts, shown = 1, color, o = 1}) => (
  <div style={{position: 'absolute', left: M, top: y, width: AX, height: 70, opacity: o}}>
    <div style={{position: 'absolute', left: 0, top: 69, width: AX, height: 2, background: C.line}} />
    {ts.map((s, i) => (i / ts.length <= shown ? (
      <div key={i} style={{position: 'absolute', left: px(s.t), top: 6, width: 4, height: 56, background: s.dup ? C.amber : color, borderRadius: 2}} />
    ) : null))}
  </div>
);
const SRC_TS = SRC_T.map((t) => ({t}));

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Variable frame rate in, constant out</Overline>
    <Big y={230} size={72} o={ep(t, 0.2, 0.8)}>Does it add pictures?</Big>
    <Big y={330} size={72} color={C.amber} o={ep(t, 1.6, 2.2)}>Does the film change length?</Big>
    <Txt x={M} y={560} w={W - 2 * M} size={38} color={C.dim} o={ep(t, 3.6, 4.2)}>We build a variable frame rate clip, and we count.</Txt>
  </>
);

/* 2. A variable clip */
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Synthetic clip: 5 s, 30 fps test pattern, frames removed unevenly</Overline>
    <Ticks y={230} ts={SRC_TS} shown={ep(t, 0.4, 3.0)} color={C.cyan} />
    <Txt x={M} y={320} w={900} size={26} color={C.dim} o={ep(t, 3.0, 3.6)}>each tick is one frame, placed at its timestamp</Txt>
    <Readout x={M} y={420} w={500} label="frames" value="93" color={C.cyan} o={ep(t, 3.6, 4.2)} />
    <Readout x={M + 560} y={420} w={500} label="base rate (r_frame_rate)" value="30" color={C.text} o={ep(t, 4.4, 5.0)} />
    <Readout x={M + 1120} y={420} w={600} label="average rate (avg_frame_rate)" value="18.5" color={C.amber} o={ep(t, 5.2, 5.8)} />
    <Txt x={M} y={680} w={W - 2 * M} size={36} color={C.text} o={ep(t, 6.6, 7.2)}>Gaps between frames: 33 ms · 67 ms · one gap of 933 ms</Txt>
  </>
);

/* 3. The default, on two builds */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.amber}>Same command, two builds</Overline>
    <Txt x={M} y={215} w={W - 2 * M} size={30} color={C.text} weight={700} o={ep(t, 0.3, 0.9)}>ffmpeg 6.1.1 · constant: 150 frames, 57 of them duplicates (amber)</Txt>
    <Ticks y={265} ts={CFR} shown={ep(t, 0.6, 2.8)} color={C.cyan} o={ep(t, 0.4, 0.9)} />
    <Txt x={M} y={500} w={W - 2 * M} size={30} color={C.text} weight={700} o={ep(t, 3.6, 4.2)}>ffmpeg 8.1.2 · variable kept: 93 frames, uneven gaps</Txt>
    <Ticks y={550} ts={SRC_TS} shown={ep(t, 3.8, 5.6)} color={C.green} o={ep(t, 3.8, 4.4)} />
    <Txt x={M} y={690} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 5.8, 6.4)}>ffmpeg -i vfr.mp4 out.mp4  (no frame rate option)</Txt>
    <Txt x={M} y={760} w={W - 2 * M} size={40} color={C.amber} weight={700} o={ep(t, 6.2, 6.8)}>The default differs between these two builds.</Txt>
    <Txt x={M} y={830} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 7.4, 8.0)}>We did not test builds in between.</Txt>
  </>
);

/* 4. Say what you want */
const ROWS = [
  {m: '-fps_mode passthrough', a: '93', b: '93', c: C.green},
  {m: '-fps_mode cfr -r 30', a: '150', b: '151', c: C.cyan},
  {m: '-fps_mode cfr -r 25', a: '125', b: '126', c: C.cyan},
  {m: '-fps_mode cfr -r 60', a: '300', b: '301', c: C.cyan},
];
const Modes: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Frames in the output</Overline>
    <Txt x={M + 820} y={220} w={420} size={28} color={C.dim} weight={700} align="center" o={ep(t, 0.3, 0.8)}>ffmpeg 6.1.1</Txt>
    <Txt x={M + 1280} y={220} w={420} size={28} color={C.dim} weight={700} align="center" o={ep(t, 0.3, 0.8)}>ffmpeg 8.1.2</Txt>
    {ROWS.map((r, i) => (
      <React.Fragment key={r.m}>
        <Txt x={M} y={290 + i * 110} w={800} size={34} color={r.c} weight={700} o={ep(t, 0.8 + i * 1.0, 1.4 + i * 1.0)}>{r.m}</Txt>
        <Txt x={M + 820} y={290 + i * 110} w={420} size={52} color={C.text} weight={800} align="center" o={ep(t, 1.0 + i * 1.0, 1.6 + i * 1.0)}>{r.a}</Txt>
        <Txt x={M + 1280} y={290 + i * 110} w={420} size={52} color={C.text} weight={800} align="center" o={ep(t, 1.2 + i * 1.0, 1.8 + i * 1.0)}>{r.b}</Txt>
      </React.Fragment>
    ))}
    <Txt x={M} y={780} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 5.4, 6.0)}>Source: 93 frames. One build gives one more frame than the other under cfr.</Txt>
  </>
);

/* 5. Where the frames come from */
const Copies: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Lossless conversion, then count distinct pictures</Overline>
    <Readout x={M} y={230} w={520} label="distinct pictures, every variant" value="93" color={C.green} o={ep(t, 0.4, 1.0)} />
    <Readout x={M + 600} y={230} w={520} label="frames, cfr 30 (6.1.1)" value="150" color={C.cyan} o={ep(t, 1.4, 2.0)} />
    <Readout x={M + 1200} y={230} w={520} label="duplicates" value="57" color={C.amber} o={ep(t, 2.4, 3.0)} />
    <Box x={M} y={470} w={W - 2 * M} h={200} title="Two counters, one answer" sub="FFmpeg's own dup= count, and frames minus distinct picture hashes. Equal in every variant, on both builds." accent={C.cyan} titleSize={36} o={ep(t, 3.8, 4.4)} />
    <Txt x={M} y={740} w={W - 2 * M} size={36} color={C.text} o={ep(t, 5.6, 6.2)}>Nothing new was added. Length: still about 5 seconds.</Txt>
  </>
);

/* 6. More rate, more copies */
const Cost: React.FC<SceneProps> = ({t}) => {
  const bars = [{r: '25 fps', dup: 32, n: 125}, {r: '30 fps', dup: 57, n: 150}, {r: '60 fps', dup: 207, n: 300}];
  return (
    <>
      <Overline y={150} color={C.amber}>Duplicates per constant rate (ffmpeg 6.1.1, 93 distinct pictures)</Overline>
      {bars.map((b, i) => (
        <React.Fragment key={b.r}>
          <Txt x={M} y={260 + i * 130} w={260} size={34} color={C.text} weight={700} o={ep(t, 0.4 + i * 1.0, 1.0 + i * 1.0)}>{b.r}</Txt>
          <div style={{position: 'absolute', left: M + 280, top: 262 + i * 130, width: (b.n / 300) * 1000, height: 54, borderRadius: 8, background: `${C.cyan}77`, opacity: ep(t, 0.5 + i * 1.0, 1.1 + i * 1.0)}} />
          <div style={{position: 'absolute', left: M + 280, top: 262 + i * 130, width: (b.dup / 300) * 1000, height: 54, borderRadius: 8, background: `${C.amber}`, opacity: ep(t, 0.7 + i * 1.0, 1.3 + i * 1.0)}} />
          <Txt x={M + 1320} y={266 + i * 130} w={460} size={30} color={C.amber} weight={700} o={ep(t, 0.9 + i * 1.0, 1.5 + i * 1.0)}>{b.dup} of {b.n} are copies</Txt>
        </React.Fragment>
      ))}
      <Pill x={M} y={700} text="not tested: any editor or player" color={C.red} o={ep(t, 4.4, 5.0)} />
    </>
  );
};

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} size={78} o={ep(t, 0.2, 0.9)}>Say what you want.</Big>
    <Big y={290} size={78} color={C.amber} o={ep(t, 0.8, 1.5)}>Not the default.</Big>
    <Code x={M} y={500} w={W - 2 * M} lines={['-fps_mode passthrough', '-fps_mode cfr -r 30']} size={40} o={ep(t, 1.8, 2.4)} title="Pick one" />
    <Txt x={M} y={760} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4.0)}>Not tested here: real phone files, editors, builds in between.</Txt>
    <Txt x={M} y={830} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 3.8, 4.4)}>FFmpeg Reality Checks · episode 5 · fixture and tests in the description</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, default: Default, modes: Modes, copies: Copies, cost: Cost, close: Close};
