import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff24/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Stripping a file" title="Are chapters gone too?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -map_metadata -1 -c copy out.mp4" hi="-map_metadata -1" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Source', value: '1 + 2', sub: 'a title and two chapters', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 84}}
      right={{label: 'Outputs', value: '5 + 1', sub: 'five strips, one control', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 96}}
      mid="→" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 4 s" title="A title, two chapters, three readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={32} items={[
      {label: 'Global title', value: 'Secret Global Title', color: C.amber, o: ep(t, 0.9, 1.5)},
      {label: 'Chapter 1 · 0 s', value: 'Private Chapter One', color: C.cyan, o: ep(t, 1.6, 2.2)},
      {label: 'Chapter 2 · 2 s', value: 'Private Chapter Two', color: C.cyan, o: ep(t, 2.3, 2.9)},
    ]} />
    <Row y={540} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'chapters', color: C.green, o: ep(t, 4.2, 4.8)},
      {label: 'Reader 2', value: 'ffmetadata', sub: 'ffmpeg export', color: C.green, o: ep(t, 4.9, 5.5)},
      {label: 'Reader 3', value: 'raw bytes', sub: 'title strings', color: C.green, o: ep(t, 5.6, 6.2)},
    ]} />
  </>
);

/* 3. Metadata off */
const Meta: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="-map_metadata -1 -c copy" title="Titles go. Chapters stay." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Title strings in the file', value: '0 of 3', sub: 'global and both chapters', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'Chapters in the file', value: '2 of 2', sub: 'at 0 s and 2 s, blank titles', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 80}}
      mid="but" midO={ep(t, 2.4, 3.0)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>A re-encode with -map_metadata -1 leaves the same two chapters.</Mid>
  </>
);

/* 4. Chapters off */
const Chapters: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-map_chapters -1" title="The other flag." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={44} items={[
      {label: '-map_chapters -1', value: '0 chapters', sub: 'global title stays', color: C.amber, o: ep(t, 0.9, 1.5)},
      {label: 'Both flags', value: 'nothing left', sub: '0 chapters, 0 titles', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Matroska, -map_metadata -1', value: '2 chapters', sub: 'no titles', color: C.red, o: ep(t, 3.8, 4.4)},
    ]} />
    <Verdict y={690} text="Two readers agree on every count" color={C.cyan} o={ep(t, 5.2, 6.0)} size={34} />
  </>
);

/* 5. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Add -map_chapters -1." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: '-map_metadata -1', value: 'titles', sub: 'not chapter markers', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 72}}
      right={{label: '-map_chapters -1', value: 'chapters', sub: 'not the global title', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 72}}
      mid="+" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other tags, cover art, other containers, real files.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 24 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, meta: Meta, chapters: Chapters, close: Close};
