import React from 'react';
import {C, F} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff72/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: Vox style flat graphics. Bold flat color blocks, split screens, giant numbers, annotated freeze frames and labeled bars drawn to scale.
   No outlines of cards, no shadows, no gradients: only flat fills in the lab palette (madder, indigo, ochre, olive on paper), through C.* keys. Local components only. */

const DATA = {"signals":{"noise":{"md5":"9b239d42fdf6ae06b054c38575c8d60c","preview":[[-10988,11433],[-11522,11340],[-10561,11199],[-10560,9187],[-11062,10718],[-11374,11423],[-11569,11377],[-11528,10765],[-11529,11436],[-11569,10763],[-11216,11575],[-11458,10513],[-11262,11384],[-11182,10780],[-11282,11168],[-11321,11478],[-11293,11023],[-11490,10993],[-11541,10274],[-11163,11439],[-11204,10326],[-11266,9910],[-9929,10975],[-11533,11410],[-11427,11513],[-11320,11396],[-11120,11399],[-8925,10583],[-11403,10765],[-11259,11338],[-10631,11539],[-11564,11044],[-11320,11485],[-10253,10608],[-10863,11373],[-11476,11482],[-11440,10992],[-11566,11230],[-11573,11162],[-11100,11385],[-11430,11223],[-11136,11440],[-11296,11168],[-11311,11457],[-11359,11388],[-10041,11457],[-11397,10206],[-9392,11534],[-10333,11520],[-11546,11358],[-11247,11448],[-11200,10986],[-11153,11260],[-11215,10959],[-10619,11113],[-10990,10623],[-11553,11502],[-11447,11057],[-11411,11543],[-11485,11273],[-11454,11022],[-11488,11221],[-11566,11478],[-11538,11350],[-11130,11477],[-11290,10960],[-10922,11294],[-11563,11453],[-10217,11168],[-11338,11339],[-11363,11364],[-11168,10831],[-11375,11262],[-10537,11434],[-11160,11103],[-11504,10553],[-11059,10989],[-11339,11338],[-11433,11045],[-10365,11472]],"bytes":[277543,257134,256953,255844,255844,255844,255971,255844,256016,255844,255844,255844,255844],"frames":[115,115,115,29,29,29,29,29,29,29,29,29,29],"block":[1152,1152,1152,4608,4608,4608,4608,4608,4608,4608,4608,4608,4608]},"tones":{"md5":"ef8dc5999eeb49a37996c6d1f05377ab","preview":[[-12343,21816],[-13523,445],[-7124,13520],[-21811,21714],[-13517,21814],[-6566,8306],[-21818,13522],[-20813,21813],[-13524,3348],[-446,13522],[-21806,10789],[-13426,21817],[-13514,447],[-12132,13520],[-21819,21809],[-13524,21079],[-4258,10560],[-21804,13523],[-18107,21818],[-13517,447],[-447,13517],[-21818,10490],[-13523,21804],[-13126,1259],[-16477,13524],[-21809,21819],[-13520,18737],[-2281,12354],[-21817,13514],[-13889,21806],[-13522,446],[-444,13524],[-21813,15519],[-13522,21818],[-11799,2922],[-19726,13517],[-21814,21811],[-13520,15060],[-808,13381],[-21816,13523],[-8862,21816],[-13523,445],[-447,13520],[-21811,19240],[-13517,21814],[-9807,5040],[-21529,13522],[-21818,21813],[-13524,10431],[-446,13522],[-21806,13186],[-11619,21817],[-13514,447],[-5172,13520],[-21819,21363],[-13524,21809],[-7468,7408],[-21804,13523],[-21394,21818],[-13517,5302],[-447,13517],[-21818,11673],[-13163,21804],[-13523,445],[-10307,13524],[-21809,21819],[-13520,21554],[-5097,9752],[-21817,13514],[-19313,21806],[-13522,446],[-444,13524],[-21813,8945],[-13522,21818],[-13394,778],[-14954,13517],[-21814,21811],[-13520,19789],[-2971,11756],[-21816,13523]],"bytes":[183488,139680,139352,118204,108950,108103,104913,104913,102823,102314,102198,96811,95377],"frames":[115,115,115,29,29,29,29,29,29,29,29,29,29],"block":[1152,1152,1152,4608,4608,4608,4608,4608,4608,4608,4608,4608,4608]},"music":{"md5":"2655c26fccb5f042db9ed14ce5ce564f","preview":[[-164,17989],[-6660,10062],[-5622,-2804],[-4866,3919],[2665,4888],[84,6698],[-17630,-518],[-12193,17628],[-6416,16914],[-6632,-2684],[-4731,652],[955,4781],[2630,6520],[-17240,5367],[-17183,14925],[-2249,17321],[-6503,-2712],[-4591,-2692],[-2631,4642],[2611,6020],[-12751,6331],[-17022,5112],[5909,16894],[-6376,5274],[-4466,-2657],[-4372,4331],[2600,4513],[-3865,6298],[-16576,-4652],[-6644,16632],[-6203,13614],[-6080,-2621],[-4434,2081],[2348,4393],[2663,6143],[-16285,3092],[-14897,15953],[-4545,16314],[-6060,-2550],[-4313,-1242],[-969,4322],[2615,6047],[-14871,5902],[-16032,9518],[1789,15966],[-5999,1484],[-4197,-2556],[-3652,4112],[2525,4771],[-7727,5911],[-15680,-1611],[-1177,15598],[-5852,9584],[-5209,-2504],[-4076,3071],[2545,4045],[173,5844],[-15239,-67],[-11350,15350],[-5294,14975],[-5818,-2496],[-3958,350],[486,3938],[2479,5741],[-14893,4830],[-15036,12415],[-1306,14983],[-5599,-1537],[-3913,-2529],[-2373,3892],[2507,5235],[-10690,5613],[-14800,3483],[4217,14694],[-5449,5586],[-4150,-2468],[-3665,3501],[2454,3786],[-2893,5484],[-14504,-3510]],"bytes":[232226,231194,230790,214466,209789,209382,209290,209239,205841,205788,205793,204579,204463],"frames":[115,115,115,29,29,29,29,29,29,29,29,29,29],"block":[1152,1152,1152,4608,4608,4608,4608,4608,4608,4608,4608,4608,4608]},"silence":{"md5":"1d479b2f01ff096f729486321207710c","preview":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"bytes":[9900,9900,9900,8696,8696,8696,8696,8696,8696,8696,8696,8696,8696],"frames":[115,115,115,29,29,29,29,29,29,29,29,29,29],"block":[1152,1152,1152,4608,4608,4608,4608,4608,4608,4608,4608,4608,4608]}},"tonesFrames2":[1137,1135,1154,1140,1142,1133,1152,1134,1143,1138,1148,1128,1150,1137,1158,1124,1145,1137,1158,1130,1141,1143,1145,1136,1134,1154,1144,1137,1136,1149,1137,1142,1137,1151,1130,1147,1135,1157,1125,1144,1140,1156,1130,1142,1141,1142,1139,1133,1157,1140,1138,1133,1147,1140,1146,1134,1152,1127,1148,1131,1160,1124,1147,1143,1151,1128,1143,1147,1139,1140,1131,1155,1140,1142,1132,1147,1135,1152,1128,1155,1128,1146,1133,1161,1123,1147,1142,1151,1130,1140,1147,1142,1139,1134,1153,1138,1141,1138,1143,1130,1154,1133,1157,1126,1146,1133,1161,1123,1145,1141,1148,1133,1134,1152,970],"tonesFrames3":[3818,3815,3790,3791,3784,3826,3827,3810,3810,3806,3787,3818,3807,3857,3849,3804,3891,3818,3920,3857,3913,3824,3842,3823,3794,3850,3788,3825,2772],"headerBlocks":[{"type":0,"len":34},{"type":4,"len":46},{"type":1,"len":8192}],"headerBytes":8288,"shiftMd5":"0dba024c6d1f615806fb271b717582c1","raw":529200} as const;


const NAMES = ['noise', 'tones', 'music', 'silence'] as const;
const sigColor = (n: string) => (n === 'noise' ? C.red : n === 'tones' ? C.cyan : n === 'music' ? C.amber : C.green);
const sig = (n: (typeof NAMES)[number]) => DATA.signals[n];
const pct = (a: number, b: number) => ((a - b) / a) * 100;
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const dn = (x: number) => (x < 0.05 ? '0%' : `-${f1(x)}%`);

type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);
/* a flat block; "grow" wipes it in from the left */
const Block: React.FC<{x: number; y: number; w: number; h: number; fill: string; grow?: number; o?: number}> = ({x, y, w, h, fill, grow = 1, o = 1}) => <rect x={x} y={y} width={Math.max(0, w * grow)} height={h} fill={fill} opacity={o} />;
const Chip: React.FC<{x: number; y: number; fill: string; children: string; o?: number; color?: string}> = ({x, y, fill, children, o = 1, color = C.bg2}) => (
  <g opacity={o}><rect x={x} y={y} width={children.length * 15.5 + 36} height={40} fill={fill} /><Tx x={x + 18} y={y + 28} s={22} f="mono" w={700} ls={1.4} c={color}>{children}</Tx></g>
);
const Headline: React.FC<{chip: string; chipColor: string; title: string; o?: number}> = ({chip, chipColor, title, o = 1}) => (
  <Layer>
    <Chip x={160} y={120} fill={chipColor} o={o}>{chip}</Chip>
    <Tx x={160} y={252} s={100} f="display" w={800} ls={0.4} o={o}>{title}</Tx>
  </Layer>
);

/* ---------- 1. the question ---------- */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Headline chip="FLAC compression level 0 to 12" chipColor={C.text} title="Smaller files, same sound?" o={ep(t, 0.2, 0.9)} />
    <Layer>
      {NAMES.map((n, i) => {
        const x = 170 + i * 400, y = 300, w = 380, h = 530, o = ep(t, 1.4 + i * 1.4, 2.2 + i * 1.4);
        const col = sigColor(n), pv = sig(n).preview;
        return (
          <g key={n}>
            <Block x={x} y={y} w={w} h={h} fill={col} grow={o} />
            <g opacity={o}>
              <Tx x={x + 24} y={y + 84} s={72} f="display" w={800} c={C.bg2}>{n}</Tx>
              {pv.map(([lo, hi], k) => {
                const sc = 130 / 23000, mid = y + 250, top = mid - hi * sc, bot = mid - lo * sc;
                return <rect key={k} x={x + 22 + k * 4.3} y={top} width={3} height={Math.max(3, bot - top)} fill={C.bg2} />;
              })}
              <Tx x={x + 24} y={y + 440} s={24} f="mono" c={C.bg2}>100 ms, left channel</Tx>
              <Tx x={x + 24} y={y + 478} s={24} f="mono" w={700} c={C.bg2}>3 s, 44100 Hz, 16 bit</Tx>
              <Tx x={x + 24} y={y + 512} s={24} f="mono" c={C.bg2}>{`${DATA.raw} bytes raw`}</Tx>
            </g>
          </g>
        );
      })}
    </Layer>
  </>
);

/* ---------- 2. the readers ---------- */
const Source: React.FC<SceneProps> = ({t}) => {
  const m = sig('tones').md5;
  return (
    <>
      <Headline chip="two readers, one control" chipColor={C.cyan} title="How we looked." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Block x={160} y={290} w={820} h={340} fill={C.cyan} grow={ep(t, 1.4, 2.4)} />
        <g opacity={ep(t, 2.2, 3.0)}>
          <Tx x={190} y={344} s={34} f="mono" w={700} c={C.bg2}>SIZE AND FRAMES</Tx>
          <Tx x={190} y={402} s={30} w={700} c={C.bg2}>Node</Tx>
          <Tx x={190} y={438} s={24} f="mono" c={C.bg2}>file size, then every frame header,</Tx>
          <Tx x={190} y={470} s={24} f="mono" c={C.bg2}>each one checked with its crc-8</Tx>
          <Tx x={190} y={534} s={30} w={700} c={C.bg2}>ffprobe</Tx>
          <Tx x={190} y={570} s={24} f="mono" c={C.bg2}>file size, and every packet</Tx>
          <Tx x={190} y={610} s={22} f="mono" c={C.amberDim}>count and sizes agree in all 52 files</Tx>
        </g>
        <Block x={1000} y={290} w={760} h={340} fill={C.amber} grow={ep(t, 4.6, 5.6)} />
        <g opacity={ep(t, 5.4, 6.2)}>
          <Tx x={1030} y={344} s={34} f="mono" w={700} c={C.bg2}>THE SOUND: 3 SUMS</Tx>
          {[['ffmpeg md5', 'decoded samples'], ['Node md5', 'the same samples'], ['in the file', 'stored by the encoder']].map(([a, b], i) => (
            <g key={a}>
              <Tx x={1030} y={412 + i * 66} s={28} w={700} c={C.bg2}>{a}</Tx>
              <Tx x={1030} y={440 + i * 66} s={20} f="mono" c={C.bg2}>{b}</Tx>
              <Tx x={1730} y={430 + i * 66} s={34} f="mono" w={700} a="end" c={C.bg2}>{`${m.slice(0, 8)}`}</Tx>
            </g>
          ))}
        </g>
        <Block x={160} y={660} w={820} h={200} fill={C.green} grow={ep(t, 9.0, 10.0)} />
        <g opacity={ep(t, 9.8, 10.6)}>
          <Tx x={190} y={712} s={30} f="mono" w={700} c={C.bg2}>CONTROL</Tx>
          <Tx x={190} y={770} s={46} f="display" w={800} c={C.bg2}>no level = level 5</Tx>
          <Tx x={190} y={820} s={24} f="mono" c={C.bg2}>the same file, byte for byte</Tx>
        </g>
        <Block x={1000} y={660} w={760} h={200} fill={C.red} grow={ep(t, 12.0, 13.0)} />
        <g opacity={ep(t, 12.8, 13.6)}>
          <Tx x={1030} y={712} s={30} f="mono" w={700} c={C.bg2}>KNOWN POSITIVE</Tx>
          <Tx x={1030} y={770} s={46} f="display" w={800} c={C.bg2}>shift by 1 sample</Tx>
          <Tx x={1030} y={820} s={24} f="mono" c={C.bg2}>{`${DATA.shiftMd5.slice(0, 8)} in all three sums`}</Tx>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 3. same sound ---------- */
const Same: React.FC<SceneProps> = ({t}) => (
  <>
    <Headline chip="the sound" chipColor={C.green} title="Identical, every time." o={ep(t, 0.2, 0.9)} />
    <Layer>
      <Block x={160} y={290} w={700} h={540} fill={C.green} grow={ep(t, 0.8, 1.8)} />
      <g opacity={ep(t, 1.6, 2.4)}>
        <Tx x={190} y={610} s={330} f="display" w={800} c={C.bg2}>52</Tx>
        <Tx x={190} y={684} s={56} f="display" w={800} c={C.bg2}>of 52 files</Tx>
        <Tx x={190} y={738} s={26} f="mono" c={C.bg2}>decode to their source md5</Tx>
        <Tx x={190} y={782} s={26} f="mono" c={C.bg2}>4 signals x 13 levels</Tx>
      </g>
      {NAMES.map((n, i) => {
        const y = 300 + i * 104, col = sigColor(n);
        return (
          <g key={n}>
            <Block x={900} y={y} w={150} h={84} fill={col} grow={ep(t, 1.4 + i * 0.4, 2.0 + i * 0.4)} />
            <Tx x={914} y={y + 54} s={30} f="display" w={800} c={C.bg2} o={ep(t, 1.8 + i * 0.4, 2.4 + i * 0.4)}>{n}</Tx>
            <Tx x={1066} y={y + 30} s={20} f="mono" c={C.dim} o={ep(t, 2.0 + i * 0.4, 2.6 + i * 0.4)}>source md5</Tx>
            <Tx x={1066} y={y + 64} s={28} f="mono" w={700} o={ep(t, 2.0 + i * 0.4, 2.6 + i * 0.4)}>{DATA.signals[n].md5.slice(0, 8)}</Tx>
            {Array.from({length: 13}, (_, l) => <rect key={l} x={1250 + l * 40} y={y + 22} width={34} height={40} fill={col} opacity={ep(t, 3.4 + i * 0.5 + l * 0.12, 3.7 + i * 0.5 + l * 0.12)} />)}
          </g>
        );
      })}
      <Tx x={1250} y={742} s={22} f="mono" c={C.dim} o={ep(t, 6.0, 6.8)}>one square per level, 0 to 12</Tx>
      <Chip x={900} y={784} fill={C.red} o={ep(t, 7.0, 7.8)}>level 13 and 99: rejected</Chip>
    </Layer>
  </>
);

/* ---------- 4. smaller, drawn to scale ---------- */
const Smaller: React.FC<SceneProps> = ({t}) => {
  const SC = 270, X0 = 370; // 1 px is 270 bytes
  return (
    <>
      <Headline chip="bytes per file, to scale" chipColor={C.amber} title="Smaller depends on the signal." o={ep(t, 0.2, 0.9)} />
      <Layer>
        {NAMES.map((n, i) => {
          const gy = 296 + i * 136, col = sigColor(n), sg = sig(n);
          const o = ep(t, 1.0 + i * 1.2, 1.8 + i * 1.2);
          return (
            <g key={n}>
              <Tx x={160} y={gy + 62} s={50} f="display" w={800} c={col} o={o}>{n}</Tx>
              {[0, 5, 12].map((lv, k) => {
                const b = sg.bytes[lv], w = b / SC, y = gy + k * 40;
                return (
                  <g key={lv}>
                    <Tx x={X0 - 12} y={y + 25} s={22} f="mono" a="end" c={C.dim} o={o}>{lv}</Tx>
                    <Block x={X0} y={y} w={w} h={32} fill={col} grow={o} o={lv === 12 ? 1 : lv === 5 ? 0.7 : 0.45} />
                    <Tx x={X0 + w + 12} y={y + 25} s={22} f="mono" w={lv === 12 ? 700 : 400} o={o}>{b}</Tx>
                  </g>
                );
              })}
              <g opacity={ep(t, 2.2 + i * 1.2, 3.0 + i * 1.2)}>
                <Tx x={1590} y={gy + 56} s={74} f="display" w={800} c={col}>{dn(pct(sg.bytes[0], sg.bytes[12]))}</Tx>
                <Tx x={1590} y={gy + 86} s={20} f="mono" c={C.dim}>level 0 to 12</Tx>
                <Tx x={1590} y={gy + 112} s={20} f="mono" w={700} c={C.text}>{`5 to 12: ${dn(pct(sg.bytes[5], sg.bytes[12]))}`}</Tx>
              </g>
            </g>
          );
        })}
        <Tx x={160} y={862} s={22} f="mono" c={C.dim} o={ep(t, 6.0, 6.8)}>{`bars for level 0, 5 and 12. Raw PCM is ${DATA.raw} bytes, ${Math.round(DATA.raw / SC)} px at this scale: off the page.`}</Tx>
      </Layer>
    </>
  );
};

/* ---------- 5. not a straight line ---------- */
const Steps: React.FC<SceneProps> = ({t}) => {
  const SC = 130; // 1 px is 130 bytes
  const strip = (arr: readonly number[], y: number, c1: string, c2: string, o: number) => {
    let x = 160;
    return arr.map((b, i) => { const w = b / SC, el = <rect key={i} x={x} y={y} width={Math.max(1, w - 2)} height={56} fill={i % 2 ? c2 : c1} opacity={o} />; x += w; return el; });
  };
  const noise = sig('noise').bytes, base = noise[3];
  const lv = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return (
    <>
      <Headline chip="levels are not a straight line" chipColor={C.red} title="More is not always smaller." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Tx x={160} y={304} s={22} f="mono" c={C.dim} o={ep(t, 1.0, 1.8)}>{`tones, level 2: ${sig('tones').frames[2]} frames of ${sig('tones').block[2]} samples, ${sig('tones').bytes[2]} bytes`}</Tx>
        {strip(DATA.tonesFrames2, 314, C.cyan, C.cyanDim, ep(t, 1.4, 2.6))}
        <Tx x={160} y={414} s={22} f="mono" c={C.dim} o={ep(t, 4.0, 4.8)}>{`tones, level 3: ${sig('tones').frames[3]} frames of ${sig('tones').block[3]} samples, ${sig('tones').bytes[3]} bytes`}</Tx>
        {strip(DATA.tonesFrames3, 424, C.cyan, C.cyanDim, ep(t, 4.4, 5.6))}
        <g opacity={ep(t, 6.0, 6.8)}>
          <Tx x={1330} y={468} s={150} f="display" w={800} c={C.green}>{`-${f1(pct(sig('tones').bytes[2], sig('tones').bytes[3]))}%`}</Tx>
          <Tx x={1330} y={344} s={26} f="mono" w={700} c={C.green}>level 2 to 3</Tx>
        </g>
        <Tx x={160} y={570} s={22} f="mono" c={C.dim} o={ep(t, 8.0, 8.8)}>{`noise, bytes above level 3 (${base})`}</Tx>
        <line x1={160} y1={800} x2={160 + lv.length * 96} y2={800} stroke={C.text} strokeWidth={2.5} opacity={ep(t, 8.0, 8.8)} />
        {lv.map((l, k) => {
          const d = noise[l] - base, x = 200 + k * 96, h = d * 0.95, o = ep(t, 9.0 + k * 0.35, 9.6 + k * 0.35);
          return (
            <g key={l} opacity={o}>
              {d > 0 && <rect x={x - 11} y={800 - h} width={22} height={h} fill={C.red} />}
              <circle cx={x} cy={800 - h} r={d > 0 ? 11 : 7} fill={d > 0 ? C.red : C.text} />
              <Tx x={x} y={832} s={22} f="mono" a="middle" c={C.dim}>{l}</Tx>
              {d > 0 && <Tx x={x} y={800 - h - 22} s={30} f="mono" w={700} a="middle" c={C.red}>{`+${d}`}</Tx>}
            </g>
          );
        })}
        <g opacity={ep(t, 13.2, 14.0)}>
          <Tx x={1230} y={650} s={26} f="mono" w={700}>noise: levels 6 and 8</Tx>
          <Tx x={1230} y={686} s={24} f="mono" c={C.dim}>bigger than level 5</Tx>
          <Tx x={1230} y={744} s={26} f="mono" w={700}>{`music: level 10 is +${sig('music').bytes[10] - sig('music').bytes[9]} over 9`}</Tx>
          <Tx x={1230} y={806} s={26} f="mono" w={700}>tones: 6 and 7 are equal</Tx>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 6. the header ---------- */
const Header: React.FC<SceneProps> = ({t}) => {
  const W = 1380, X0 = 400, H = DATA.headerBytes;
  return (
    <>
      <Headline chip="every file starts the same" chipColor={C.amber} title="8288 bytes before any audio." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <g opacity={ep(t, 1.0, 1.8)}>
          <rect x={X0} y={284} width={26} height={26} fill={C.text} /><Tx x={X0 + 38} y={305} s={22} f="mono" c={C.text}>black: header, 8288 bytes</Tx>
          <Tx x={X0 + 470} y={305} s={22} f="mono" c={C.text}>color: audio frames</Tx>
        </g>
        {NAMES.map((n, i) => {
          const y = 336 + i * 94, b = sig(n).bytes[12], hw = (H / b) * W, o = ep(t, 1.6 + i * 0.9, 2.4 + i * 0.9), col = sigColor(n);
          return (
            <g key={n}>
              <Tx x={160} y={y + 52} s={46} f="display" w={800} c={col} o={o}>{n}</Tx>
              <Block x={X0} y={y} w={hw} h={74} fill={C.text} grow={o} />
              <Block x={X0 + hw} y={y} w={W - hw} h={74} fill={col} grow={o} />
              <Tx x={X0 + W - 14} y={y + 50} s={26} f="mono" w={700} a="end" c={C.bg2} o={o}>{`audio ${b - H}`}</Tx>
              <Tx x={X0 + 12} y={y + 50} s={26} f="mono" w={700} c={C.bg2} o={o * (hw > 300 ? 1 : 0)}>{`header ${f1((H / b) * 100)}%`}</Tx>
              {hw <= 300 && <Tx x={X0 + hw + 12} y={y + 50} s={22} f="mono" w={700} c={C.bg2} o={o}>{`${f1((H / b) * 100)}%`}</Tx>}
            </g>
          );
        })}
        <g opacity={ep(t, 6.0, 7.0)}>
          <Tx x={160} y={846} s={170} f="display" w={800} c={C.text}>8192</Tx>
          <Tx x={620} y={760} s={30} f="mono" w={700}>of the 8288 bytes are padding</Tx>
          <Tx x={620} y={802} s={24} f="mono" c={C.dim}>written by the muxer, the same at every level</Tx>
          <Tx x={620} y={842} s={24} f="mono" c={C.dim}>{`silence at level 3 and up: ${sig('silence').bytes[12] - H} bytes of audio`}</Tx>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 7. what we measured ---------- */
const Close: React.FC<SceneProps> = ({t}) => {
  const tones = sig('tones'), noise = sig('noise');
  const blocks = [
    {x: 160, y: 290, c: C.green, big: '52 of 52', a: 'files decode to', b: 'their source md5'},
    {x: 980, y: 290, c: C.cyan, big: `-${f1(pct(tones.bytes[0], tones.bytes[12]))}%`, a: 'tones, level 0 to 12', b: `${tones.bytes[0]} to ${tones.bytes[12]} bytes`},
    {x: 160, y: 550, c: C.red, big: '0%', a: 'noise, level 5 to 12', b: `${noise.bytes[5]} to ${noise.bytes[12]} bytes`},
    {x: 980, y: 550, c: C.amber, big: `-${f1(pct(tones.bytes[2], tones.bytes[3]))}%`, a: 'tones, one step', b: 'level 2 to 3: 115 frames become 29'},
  ];
  return (
    <>
      <Headline chip="what we measured" chipColor={C.text} title="Same sound. Size varies." o={ep(t, 0.2, 0.9)} />
      <Layer>
        {blocks.map((b, i) => {
          const o = ep(t, 1.0 + i * 1.3, 1.8 + i * 1.3);
          return (
            <g key={i}>
              <Block x={b.x} y={b.y} w={780} h={230} fill={b.c} grow={o} />
              <g opacity={o}>
                <Tx x={b.x + 30} y={b.y + 150} s={150} f="display" w={800} c={C.bg2}>{b.big}</Tx>
                <Tx x={b.x + 30} y={b.y + 192} s={26} f="mono" w={700} c={C.bg2}>{b.a}</Tx>
                <Tx x={b.x + 30} y={b.y + 220} s={20} f="mono" c={C.bg2}>{b.b}</Tx>
              </g>
            </g>
          );
        })}
      </Layer>
      <Mid y={810} size={25} color={C.dim} o={ep(t, 8.0, 8.8)}>Not tested: other builds, encode speed, real recordings.</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, same: Same, smaller: Smaller, steps: Steps, header: Header, close: Close};
