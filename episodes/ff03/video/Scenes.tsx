import React from 'react';
import {Box, Code, Overline, Pill, Readout, Txt, Big} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff03/fixture/experiment.mjs (evidence.json from fixture/run.mjs), ffmpeg 6.1.1 unless stated. */
const EV = {bytes: 927238, moovAt: 917559, moovSize: 9679, frames: 250, noSeekPlain: 927238, noSeekFast: 49152};
const CMD = 'ffmpeg -i in -c:v libx264 -crf 23 out.mp4';
const CMD_FIX = 'ffmpeg -i in -c:v libx264 -crf 23 -movflags +faststart out.mp4';

/* A row of top-level boxes. Widths are for reading, not to scale. */
const KINDS: Record<string, {w: number; color: string}> = {
  ftyp: {w: 130, color: C.dim}, free: {w: 110, color: C.mute}, mdat: {w: 880, color: C.cyan}, moov: {w: 230, color: C.amber},
};
const BoxRow: React.FC<{x: number; y: number; order: string[]; o?: number; shown?: number; hiMoov?: boolean; label?: string}> = ({x, y, order, o = 1, shown = order.length, hiMoov = true, label}) => {
  let cx = 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 1500, height: 120, opacity: o}}>
      {order.map((k, i) => {
        const d = KINDS[k], left = cx; cx += d.w + 10;
        const hot = hiMoov && k === 'moov';
        return (
          <div key={k} style={{position: 'absolute', left, top: 0, width: d.w, height: 100, boxSizing: 'border-box', borderRadius: 10, border: `3px solid ${d.color}`, background: `${d.color}${hot ? '55' : '22'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 34, fontWeight: 700, color: C.text, opacity: i < shown ? 1 : 0}}>{k}</div>
        );
      })}
      {label ? <div style={{position: 'absolute', left: 0, top: 108, fontFamily: F.sans, fontSize: 24, color: C.dim}}>{label}</div> : null}
    </div>
  );
};

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>The question</Overline>
    <Big y={230} size={72} o={ep(t, 0.2, 0.8)}>An MP4 that waits before it plays.</Big>
    <Code x={M} y={420} w={W - 2 * M} lines={[CMD]} size={40} o={ep(t, 1.4, 2.0)} title="The whole command" />
    <Txt x={M} y={650} w={W - 2 * M} size={40} color={C.amber} o={ep(t, 3.6, 4.2)}>An MP4 is a list of boxes.</Txt>
    <Txt x={M} y={730} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 5.2, 5.8)}>We will not guess. We will read the order of the boxes.</Txt>
  </>
);

/* 2. Two files */
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Synthetic test clip</Overline>
    <Txt x={M} y={200} w={W - 2 * M} size={40} color={C.text} o={ep(t, 0.2, 0.8)}>10 s · 640x360 · 25 fps · one 440 Hz tone</Txt>
    <Code x={M} y={310} w={W - 2 * M} lines={[CMD]} size={36} o={ep(t, 1.0, 1.6)} title="A. plain" />
    <Code x={M} y={500} w={W - 2 * M} lines={[CMD_FIX]} hi={[0]} hiColor={C.green} size={36} o={ep(t, 2.4, 3.0)} title="B. with faststart" />
    <Pill x={M} y={720} text="250 frames" color={C.cyan} o={ep(t, 4.4, 5.0)} />
    <Txt x={M + 330} y={722} w={1200} size={34} color={C.dim} o={ep(t, 4.8, 5.4)}>in both files. Same picture, same sound.</Txt>
  </>
);

/* 3. The plain file */
const Atoms: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Top-level boxes, plain file</Overline>
    <BoxRow x={M} y={250} order={['ftyp', 'free', 'mdat', 'moov']} shown={1 + Math.floor(ep(t, 0.4, 3.0) * 3.2)} label="not to scale" />
    <Txt x={M + 270} y={400} w={800} size={30} color={C.cyan} o={ep(t, 2.4, 3.0)}>mdat: the picture and the sound</Txt>
    <Txt x={M + 1180} y={400} w={560} size={30} color={C.amber} o={ep(t, 3.4, 4.0)}>moov: the index</Txt>
    <Readout x={M} y={520} w={760} label="moov starts at byte" value={EV.moovAt.toLocaleString('en-US')} color={C.amber} o={ep(t, 4.6, 5.2)} />
    <Readout x={M + 840} y={520} w={760} label="file size, bytes" value={EV.bytes.toLocaleString('en-US')} color={C.text} o={ep(t, 5.2, 5.8)} />
    <Txt x={M} y={790} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 6.8, 7.4)}>The index is the last thing in the file.</Txt>
  </>
);

/* 4. With faststart */
const Faststart: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.green}>Same clip, +faststart</Overline>
    <Txt x={M} y={215} w={400} size={28} color={C.dim} o={ep(t, 0.2, 0.7)}>plain</Txt>
    <BoxRow x={M} y={250} order={['ftyp', 'free', 'mdat', 'moov']} o={ep(t, 0.2, 0.8)} />
    <Txt x={M} y={445} w={600} size={28} color={C.green} o={ep(t, 1.6, 2.1)}>+faststart</Txt>
    <BoxRow x={M} y={480} order={['ftyp', 'moov', 'free', 'mdat']} o={ep(t, 1.6, 2.2)} label="not to scale" />
    <Readout x={M} y={700} w={520} label="frames, both files" value="250" color={C.text} o={ep(t, 3.6, 4.2)} />
    <Readout x={M + 600} y={700} w={520} label="size, both files" value={`${(EV.bytes / 1000).toFixed(0)} kB`} color={C.text} o={ep(t, 4.2, 4.8)} />
    <Txt x={M + 1200} y={716} w={560} size={28} color={C.dim} o={ep(t, 5.4, 6.0)}>Two readers agree: our parser and ffprobe's trace.</Txt>
  </>
);

/* 5. A client reads it (ffprobe over loopback HTTP) */
const Client: React.FC<SceneProps> = ({t}) => {
  const Bar: React.FC<{y: number; frac: number; label: string; value: string; color: string; o: number}> = ({y, frac, label, value, color, o}) => (
    <>
      <Txt x={M} y={y} w={520} size={30} color={C.text} weight={600} o={o}>{label}</Txt>
      <div style={{position: 'absolute', left: M + 540, top: y + 4, width: 900, height: 40, borderRadius: 8, border: `3px solid ${C.line}`, boxSizing: 'border-box', opacity: o}}>
        <div style={{width: `${Math.max(frac * 100, 1.2)}%`, height: '100%', background: color, borderRadius: 5}} />
      </div>
      <Txt x={M + 1480} y={y} w={300} size={30} color={color} weight={700} o={o}>{value}</Txt>
    </>
  );
  return (
    <>
      <Overline y={150}>ffprobe reads each file from a local server</Overline>
      <Txt x={M} y={215} w={W - 2 * M} size={32} color={C.amber} weight={700} o={ep(t, 0.2, 0.7)}>A client that cannot seek: bytes the server sent</Txt>
      <Bar y={290} frac={EV.noSeekPlain / EV.bytes} label="plain (index last)" value="100%" color={C.red} o={ep(t, 0.8, 1.4)} />
      <Bar y={370} frac={EV.noSeekFast / EV.bytes} label="+faststart (index first)" value="< 50 kB" color={C.green} o={ep(t, 1.8, 2.4)} />
      <Txt x={M} y={520} w={W - 2 * M} size={32} color={C.amber} weight={700} o={ep(t, 4.4, 4.9)}>A client that can ask for byte ranges: requests made</Txt>
      <Readout x={M} y={590} w={760} label="plain: jumps to the index" value="3 requests" color={C.red} o={ep(t, 5.2, 5.8)} />
      <Readout x={M + 840} y={590} w={760} label="+faststart" value="1 request" color={C.green} o={ep(t, 6.2, 6.8)} />
      <Txt x={M} y={820} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 8.0, 8.6)}>One request started exactly at the index, byte {EV.moovAt.toLocaleString('en-US')}.</Txt>
    </>
  );
};

/* 6. What it costs */
const Cost: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.amber}>What it costs</Overline>
    <Box x={M} y={230} w={W - 2 * M} h={250} accent={C.amber} o={ep(t, 0.4, 1.0)}>
      <div style={{fontSize: 34, color: C.text, lineHeight: 1.35}}>"Run a second pass moving the index (moov atom) to the beginning of the file. This operation can take a while, and will not work in various situations such as fragmented output, thus it is not enabled by default."</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 12}}>FFmpeg documentation, MOV/MP4 muxer, movflags faststart</div>
    </Box>
    <Pill x={M} y={600} text="tested: ffprobe as the client" color={C.cyan} o={ep(t, 3.8, 4.4)} />
    <Pill x={M} y={690} text="not tested: any browser" color={C.red} o={ep(t, 5.0, 5.6)} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} size={78} o={ep(t, 0.2, 0.9)}>Check the box order.</Big>
    <Big y={290} size={78} color={C.green} o={ep(t, 0.8, 1.5)}>One flag moves the index.</Big>
    <Code x={M} y={500} w={W - 2 * M} lines={['ffprobe -v trace out.mp4 2>&1 | grep "parent:\'root\'"']} size={32} o={ep(t, 1.8, 2.4)} title="Box order, before you upload" />
    <Txt x={M} y={740} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4.0)}>Not tested here: browsers, other players, fragmented MP4.</Txt>
    <Txt x={M} y={830} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 3.8, 4.4)}>FFmpeg Reality Checks · episode 3 · fixture and tests in the description</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, atoms: Atoms, faststart: Faststart, client: Client, cost: Cost, close: Close};
