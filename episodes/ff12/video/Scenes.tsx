import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every result below is measured by episodes/ff12/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const TAGS = ['Title', 'Artist', 'Comment', 'Location', 'Handler name'];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Metadata" title="What travels with the video?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -c:v libx264 -c:a aac out.mp4" hi="-i in.mp4" size={32} o={ep(t, 1.0, 1.6)} />
    <Row y={470} h={220} cw={320} gap={28} valueSize={72} items={TAGS.map((l, i) => ({label: l, value: '?', color: C.amber, o: ep(t, 2.0 + i * 0.35, 2.6 + i * 0.35)}))} />
    <Mid y={790} size={30} o={ep(t, 4.8, 5.4)}>Four commands. Two readers. Made-up tags only.</Mid>
  </>
);

/* 2. The source */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · five made-up tags" title="Two ways to look inside." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader 1', value: 'ffprobe', sub: 'the tags the container reports', color: C.cyan, o: ep(t, 0.9, 1.6)}}
      right={{label: 'Reader 2', value: 'byte search', sub: 'the raw file, string by string', color: C.amber, o: ep(t, 1.8, 2.5), valueSize: 80}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 2.2, 2.8)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>Location is a binary atom named loci, so that search looks for the name.</Mid>
  </>
);

/* 3. Plain command */
const Plain: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="A plain command" title="All five kept." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Row y={300} h={230} cw={320} gap={28} valueSize={60} items={TAGS.map((l, i) => ({label: l, value: 'kept', color: C.red, o: ep(t, 0.9 + i * 0.3, 1.5 + i * 0.3)}))} />
    <Verdict y={650} text="Re-encode and -c copy both keep them" color={C.amber} o={ep(t, 3.6, 4.4)} size={36} />
    <Mid y={740} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Both readers agree on every tag.</Mid>
  </>
);

/* 4. Strip */
const Strip: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Remove it on purpose" title="All five gone." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4" hi="-map_metadata -1" color={C.green} size={32} o={ep(t, 0.8, 1.4)} />
    <Row y={400} h={230} cw={320} gap={28} valueSize={60} items={TAGS.map((l, i) => ({label: l, value: 'gone', color: C.green, o: ep(t, 1.6 + i * 0.3, 2.2 + i * 0.3)}))} />
    <Mid y={700} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Same with a re-encode. Both readers agree.</Mid>
  </>
);

/* 5. The tool's own name */
const Encoder: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="After -map_metadata -1" title="One tag is left." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Format tag: encoder', value: 'Lavf…', sub: 'the tool that wrote the file', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Add -fflags +bitexact', value: 'dropped', sub: 'no encoder tag in the format tags', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 84}}
      mid="+" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Stream-level encoder tags were not part of this check.</Mid>
  </>
);

/* 6. Limits */
const Limits: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Honest limits" title="Only the tags we made." o={ep(t, 0.2, 0.8)} />
    <Row y={300} h={240} cw={520} gap={36} valueSize={44} items={[
      {label: 'Real phone files', value: 'not tested', color: C.mute, o: ep(t, 0.9, 1.5)},
      {label: 'Location tracks, thumbnails', value: 'not tested', color: C.mute, o: ep(t, 1.6, 2.2)},
      {label: 'Vendor atoms', value: 'not tested', color: C.mute, o: ep(t, 2.3, 2.9)},
    ]} />
    <Verdict y={660} text="Check the output before you share it" color={C.amber} o={ep(t, 4.2, 5.0)} size={36} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Metadata survives by default" title="Remove it on purpose." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'By default', value: 'kept', sub: 're-encode and -c copy', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'On purpose', value: '-map_metadata -1', sub: 'plus -fflags +bitexact', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 52}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={620} size={30} color={C.dim} o={ep(t, 3.6, 4.2)}>Same on ffmpeg 6.1.1 and 8.1.2.</Mid>
    <Mid y={690} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Not tested: real phone files, other containers.</Mid>
    <Mid y={780} size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>FFmpeg Reality Checks · episode 12 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, plain: Plain, strip: Strip, encoder: Encoder, limits: Limits, close: Close};
