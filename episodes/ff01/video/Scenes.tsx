import React from 'react';
import {Box, Code, Overline, Pill, Readout, Txt, Big} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff01/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const EV = {
  seek: 7.5, clip: 3, fps: 25, total: 20, keys: [0, 5, 10, 15],
  inFirst: 188, inStart: 7.52, inFrames: 75, inPackets: 138, hidden: 63,
  outFirst: 250, outStart: 10, outFrames: 13, outSecs: 0.52,
  reFrames: 74,
};

/* One 20 s timeline bar shared by the scenes: x position for a time in seconds. */
const BX = M;
const BW = W - 2 * M;
const BY = 470;
const BH = 84;
const tx = (s: number) => BX + (s / EV.total) * BW;

const Ticks: React.FC<{o?: number; labelKeys?: boolean}> = ({o = 1, labelKeys = true}) => (
  <>
    <div style={{position: 'absolute', left: BX, top: BY, width: BW, height: BH, borderRadius: 12, background: C.panel, border: `3px solid ${C.line}`, boxSizing: 'border-box', opacity: o}} />
    {EV.keys.map((k) => (
      <React.Fragment key={k}>
        <div style={{position: 'absolute', left: tx(k) - 3, top: BY - 26, width: 6, height: BH + 52, background: C.cyan, borderRadius: 3, opacity: o}} />
        {labelKeys && <div style={{position: 'absolute', left: tx(k) - 90, top: BY + BH + 34, width: 180, textAlign: 'center', fontFamily: F.sans, fontSize: 26, fontWeight: 700, color: C.cyan, opacity: o}}>{k} s</div>}
      </React.Fragment>
    ))}
    <div style={{position: 'absolute', left: tx(20) - 120, top: BY + BH + 34, width: 120, textAlign: 'right', fontFamily: F.mono, fontSize: 24, color: C.mute, opacity: o}}>20 s</div>
    <div style={{position: 'absolute', left: BX, top: BY - 120, fontFamily: F.sans, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: C.cyan, opacity: o}}>Keyframe</div>
  </>
);

/** A coloured span on the bar from a to b seconds, growing in with p. */
const Span: React.FC<{a: number; b: number; color: string; p?: number; top?: number; h?: number; label?: string; labelColor?: string; dashed?: boolean; above?: boolean}> = ({a, b, color, p = 1, top = BY + 10, h = BH - 20, label, labelColor, dashed = false, above = false}) => (
  <>
    <div style={{position: 'absolute', left: tx(a), top, width: (tx(b) - tx(a)) * p, height: h, borderRadius: 8, background: `${color}${dashed ? '33' : '99'}`, border: `3px ${dashed ? 'dashed' : 'solid'} ${color}`, boxSizing: 'border-box'}} />
    {label && p > 0.9 && <div style={{position: 'absolute', left: tx(a), top: above ? BY - 66 : BY + BH + 84, width: Math.max(tx(b) - tx(a), 360), fontFamily: F.sans, fontSize: 26, fontWeight: 700, color: labelColor ?? color, whiteSpace: 'nowrap'}}>{label}</div>}
  </>
);

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>The command</Overline>
    <Code x={M} y={210} w={W - 2 * M} lines={['ffmpeg -ss 7.5 -i source.mp4 -t 3 -c copy clip.mp4']} hi={[0]} hiColor={C.cyan} size={46} o={ep(t, 0.2, 0.8)} />
    <Readout x={M} y={450} w={360} label="start at" value="7.5 s" color={C.cyan} o={ep(t, 1.0, 1.5)} />
    <Readout x={M + 420} y={450} w={360} label="length" value="3 s" color={C.cyan} o={ep(t, 1.4, 1.9)} />
    <Readout x={M + 840} y={450} w={360} label="speed" value="instant" color={C.green} o={ep(t, 1.9, 2.4)} />
    <Big y={760} size={64} color={C.amber} o={ep(t, 3.2, 3.8)}>Is it the clip you asked for?</Big>
  </>
);

/* 2. The fixture */
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Synthetic test video</Overline>
    <Txt x={M} y={200} w={W - 2 * M} size={40} color={C.text} o={ep(t, 0.2, 0.8)}>20 seconds · 25 frames a second · 500 frames, all different</Txt>
    <Ticks o={ep(t, 0.6, 1.2)} />
    <Span a={EV.seek} b={EV.seek + EV.clip} color={C.amber} p={ep(t, 2.4, 3.4)} top={BY - 4} h={BH + 8} label="the 3 s you asked for: 7.5 to 10.5" above />
    <Txt x={M} y={760} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 4.2, 4.8)}>Lossless frames, so every frame has its own fingerprint. We can ask exactly which frame a clip starts on.</Txt>
  </>
);

/* 3. -ss before -i */
const InputSeek: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.green}>-ss before -i</Overline>
    <Code x={M} y={200} w={W - 2 * M} lines={['ffmpeg -ss 7.5 -i source.mp4 -t 3 -c copy clip.mp4']} size={34} o={ep(t, 0, 0.5)} />
    <Ticks />
    <Span a={5} b={EV.inStart} color={C.amber} p={ep(t, 5.0, 6.0)} dashed above label={`${EV.hidden} hidden pre-roll frames`} />
    <Span a={EV.inStart} b={EV.inStart + EV.clip} color={C.green} p={ep(t, 0.8, 1.8)} top={BY + 10} label={`frame ${EV.inFirst} · ${EV.inStart} s · ${EV.inFrames} frames`} labelColor={C.green} />
    <Readout x={M} y={760} w={360} label="first frame" value={EV.inFirst} color={C.green} o={ep(t, 2.4, 2.9)} />
    <Readout x={M + 420} y={760} w={360} label="frames shown" value={EV.inFrames} color={C.green} o={ep(t, 2.8, 3.3)} />
    <Readout x={M + 840} y={760} w={360} label="packets in file" value={EV.inPackets} color={C.amber} o={ep(t, 3.8, 4.3)} />
    <Txt x={M + 1260} y={790} w={560} size={28} color={C.amber} o={ep(t, 4.6, 5.2)}>kept so the first frame can decode</Txt>
  </>
);

/* 4. -ss after -i */
const OutputSeek: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.red}>-ss after -i</Overline>
    <Code x={M} y={200} w={W - 2 * M} lines={['ffmpeg -i source.mp4 -ss 7.5 -t 3 -c copy clip.mp4']} size={34} o={ep(t, 0, 0.5)} />
    <Ticks />
    <Span a={0} b={EV.outStart} color={C.mute} p={ep(t, 0.8, 1.8)} dashed label="packets read and thrown away" labelColor={C.dim} above />
    <Span a={EV.outStart} b={EV.outStart + EV.outSecs} color={C.red} p={ep(t, 2.4, 3.0)} top={BY - 4} h={BH + 8} />
    <Pill x={tx(EV.outStart) + 20} y={BY + BH + 90} text={`frame ${EV.outFirst} · ${EV.outStart} s · ${EV.outFrames} frames`} color={C.red} o={ep(t, 3.0, 3.5)} />
    <Readout x={M} y={760} w={360} label="first frame" value={EV.outFirst} color={C.red} o={ep(t, 3.2, 3.7)} />
    <Readout x={M + 420} y={760} w={360} label="frames shown" value={EV.outFrames} color={C.red} o={ep(t, 3.6, 4.1)} />
    <Txt x={M + 840} y={790} w={900} size={40} color={C.red} weight={700} o={ep(t, 4.4, 5.0)}>0.52 s. Not 3 s.</Txt>
  </>
);

/* 5. Why */
const FRAMES = ['I', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];
const Why: React.FC<SceneProps> = ({t}) => {
  const fw = 150;
  const rowX = M + 40;
  return (
    <>
      <Overline y={150}>Why</Overline>
      <Txt x={M} y={200} w={W - 2 * M} size={40} color={C.text} o={ep(t, 0.2, 0.8)}>Most frames store only what changed since an earlier frame.</Txt>
      {FRAMES.map((f, i) => (
        <div key={i} style={{position: 'absolute', left: rowX + i * (fw + 16), top: 300, width: fw, height: 110, borderRadius: 14, border: `3px solid ${f === 'I' ? C.cyan : C.line}`, background: f === 'I' ? `${C.cyan}33` : C.panel, boxSizing: 'border-box', opacity: ep(t, 0.6 + i * 0.12, 1.0 + i * 0.12), fontFamily: F.sans, textAlign: 'center', paddingTop: 22}}>
          <div style={{fontSize: 44, fontWeight: 800, color: f === 'I' ? C.cyan : C.dim}}>{f}</div>
          <div style={{fontSize: 18, color: C.mute, marginTop: 2}}>{f === 'I' ? 'whole picture' : 'changes only'}</div>
        </div>
      ))}
      <Txt x={M} y={450} w={W - 2 * M} size={44} color={C.cyan} weight={700} o={ep(t, 2.2, 2.8)}>A copy decodes nothing, so a clip can only begin on a keyframe.</Txt>
      <Box x={M} y={580} w={850} h={170} title="Before -i" sub="Go back to the keyframe at 5 s, then hide the extra with an edit list." accent={C.green} o={ep(t, 3.6, 4.2)} titleSize={36} />
      <Box x={M + 878} y={580} w={850} h={170} title="After -i" sub="Throw packets away until the next keyframe, at 10 s." accent={C.red} o={ep(t, 5.4, 6.0)} titleSize={36} />
    </>
  );
};

/* 6. Fix */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.green}>If you need the exact start</Overline>
    <Code x={M} y={210} w={W - 2 * M} lines={['ffmpeg -ss 7.5 -i source.mp4 -t 3 -c:v libx264 -crf 0 clip.mp4']} size={34} o={ep(t, 0.2, 0.8)} title="Re-encode" />
    <Readout x={M} y={380} w={360} label="first frame" value={EV.inFirst} color={C.green} o={ep(t, 1.4, 1.9)} />
    <Readout x={M + 420} y={380} w={360} label="frames" value={EV.reFrames} color={C.green} o={ep(t, 1.8, 2.3)} />
    <Txt x={M + 860} y={420} w={900} size={32} color={C.dim} o={ep(t, 2.2, 2.8)}>Starts exactly on the frame you asked for. Costs a re-encode.</Txt>
    <Overline y={640} color={C.amber} o={ep(t, 4.0, 4.6)}>If you must copy</Overline>
    <Code x={M} y={700} w={W - 2 * M} lines={['ffprobe -show_entries packet=pts_time -of csv=p=0 clip.mp4']} size={34} o={ep(t, 4.0, 4.6)} title="Check the result, not the command line" />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} size={78} o={ep(t, 0.2, 0.9)}>Same command line.</Big>
    <Big y={290} size={78} color={C.amber} o={ep(t, 0.8, 1.5)}>One flag moved.</Big>
    <Readout x={M} y={520} w={400} label="frames before -i" value={EV.inFrames} color={C.green} o={ep(t, 1.8, 2.4)} />
    <Readout x={M + 480} y={520} w={400} label="frames after -i" value={EV.outFrames} color={C.red} o={ep(t, 2.4, 3.0)} />
    <Txt x={M} y={800} w={W - 2 * M} size={36} color={C.dim} o={ep(t, 3.6, 4.2)}>FFmpeg Reality Checks · episode 1 · fixture and tests in the description</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, inputSeek: InputSeek, outputSeek: OutputSeek, why: Why, fix: Fix, close: Close};
