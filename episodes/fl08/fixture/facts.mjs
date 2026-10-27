// The numbers the fl08 / fs08 scenes draw. Built from the two stored evidence files: evidence.json (ffmpeg 6.1.1, this container)
// and evidence-v8.json (ffmpeg 8.1.2, the PC). Nothing is typed by hand; the E block in each Scenes.tsx is generated from this.
// Three ways to write a pc tag (see experiment.mjs): label (key content_pc, setparams + output option), option (_opt, the output option alone),
// vf (_vf, setparams alone). Older evidence-v8.json files hold other layouts: the first PC run tagged pc with the output option (content_pc),
// the second had content_pc = setparams alone (via 'setparams'). optCase() and vfCase() read the right family from any of them.
export const buildOf = (versionLine) => (/version (n?6\.)/.test(versionLine) ? 'v6' : /version (n?8\.)/.test(versionLine) ? 'v8' : 'other');
const rg = (c) => [c.raw.ymin, c.raw.ymax];
const optCase = (ev, content, tag) => ev.range.cases[`${content}_${tag}_opt`] ?? ev.range.cases[`${content}_${tag}`];
const vfCase = (ev, content, tag) => { const c = ev.range.cases; return c[`${content}_${tag}_vf`] ?? (c[`${content}_${tag}`]?.via === 'setparams' ? c[`${content}_${tag}`] : null); };
const labelCase = (ev, content, tag) => { const c = ev.range.cases[`${content}_${tag}`]; return c?.via === 'label' ? c : null; };

export function sceneFacts(ev6, ev8) {
  const R6 = ev6.range.cases, R8 = ev8.range.cases, A6 = ev6.alpha.cases, A8 = ev8.alpha.cases;
  const cd = (k, m = 'all') => R8[k].colordetect[m];
  const ca = (k, f = 'rgba') => A8[k].colordetect[f];
  const nm = (c) => ({rangeText: c.rangeText, range: c.range});
  return {
    version6: ev6.ffmpeg.match(/version (\S+?)(?:-|\s)/)[1],
    version8: ev8.ffmpeg.match(/version (\S+?)(?:-|\s)/)[1],
    ramp: {width: 256, height: 16, frames: ev6.range.frames},
    // the tag, 6.1.1
    tag6: {none: R6.limited_none.probeRange ?? 'unknown', tv: R6.limited_tv.probeRange, pc: R6.limited_pc.probeRange},
    tag8: {none: R8.limited_none.probeRange ?? 'unknown', tv: R8.limited_tv.probeRange},
    // what pixels the three ramps hold (identical under every tag)
    full: rg(R6.full_tv), limited: rg(R6.limited_tv), mid: rg(R6.mid_tv),
    // the tag decides the RGB (6.1.1; the tv and untagged numbers are the same on 8.1.2)
    rgb: {
      limitedTv: {min: R6.limited_tv.rgb.min, max: R6.limited_tv.rgb.max}, limitedPc: {min: R6.limited_pc.rgb.min, max: R6.limited_pc.rgb.max},
      fullTv: {levels: R6.full_tv.rgb.distinct, black: R6.full_tv.rgb.columnsAtZero, white: R6.full_tv.rgb.columnsAt255}, fullPc: {levels: R6.full_pc.rgb.distinct},
      midTv: {min: R6.mid_tv.rgb.min, max: R6.mid_tv.rgb.max}, midPc: {min: R6.mid_pc.rgb.min, max: R6.mid_pc.rgb.max},
      untaggedSameAsTv: JSON.stringify(R6.limited_none.rgb) === JSON.stringify(R6.limited_tv.rgb) && JSON.stringify(R8.limited_none.rgb) === JSON.stringify(R8.limited_tv.rgb),
      tv8: {levels: R8.full_tv.rgb.distinct, black: R8.full_tv.rgb.columnsAtZero, white: R8.full_tv.rgb.columnsAt255},
    },
    // the output option -color_range pc: relabel on 6.1.1, convert on 8.1.2
    opt: {
      v6: {limited: rg(optCase(ev6, 'limited', 'pc')), mid: rg(optCase(ev6, 'mid', 'pc'))},
      v8: {limited: rg(optCase(ev8, 'limited', 'pc')), mid: rg(optCase(ev8, 'mid', 'pc')), tag: optCase(ev8, 'limited', 'pc').probeRange},
    },
    // setparams=range=pc ALONE: pure on 6.1.1, on 8.1.2 FFV1 converts the frames to limited and the file reads tv
    vf: {
      v6: {full: rg(vfCase(ev6, 'full', 'pc')), limited: rg(vfCase(ev6, 'limited', 'pc')), mid: rg(vfCase(ev6, 'mid', 'pc')), tag: vfCase(ev6, 'limited', 'pc').probeRange},
      v8: {full: rg(vfCase(ev8, 'full', 'pc')), limited: rg(vfCase(ev8, 'limited', 'pc')), mid: rg(vfCase(ev8, 'mid', 'pc')), tag: vfCase(ev8, 'limited', 'pc').probeRange},
    },
    // the pure label (setparams + the output option): is it pure in the stored 8.1.2 evidence? null until the PC has rerun the fixture
    label8: labelCase(ev8, 'full', 'pc') ? {full: rg(labelCase(ev8, 'full', 'pc')), limited: rg(labelCase(ev8, 'limited', 'pc')), mid: rg(labelCase(ev8, 'mid', 'pc')), tag: labelCase(ev8, 'limited', 'pc').probeRange} : null,
    // the missing filter
    missing: {status: ev6.colordetect.probe.status, message: "No such filter: 'colordetect'", libavfilter6: ev6.libs.libavfilter.split('/')[0].replace(/\s+/g, '')},
    // the 6.1.1 recipe
    recipe: {full: rg(R6.full_tv), limited: rg(R6.limited_tv), hiMax: R6.hi1_tv.signalstats.ymax, hiPerFrame: R6.hi1_tv.signalstats.yPerFrame, loPerFrame: R6.lo1_tv.signalstats.yPerFrame, hiFrames: R6.hi1_tv.signalstats.yPerFrame.filter(([, mx]) => mx > 235).length, frames: R6.hi1_tv.signalstats.frames, loMin: R6.lo1_tv.signalstats.ymin, edge: rg(R6.edge_tv), cbMax: R6.cbfull_tv.raw.umax,
      verdicts: {full: R6.full_tv.recipe.verdict, limited: R6.limited_tv.recipe.verdict, mid: R6.mid_tv.recipe.verdict, hi1: R6.hi1_tv.recipe.verdict, lo1: R6.lo1_tv.recipe.verdict, edge: R6.edge_tv.recipe.verdict, cbLuma: R6.cbfull_tv.recipe.lumaOnlyVerdict, cbChroma: R6.cbfull_tv.recipe.verdict}},
    // colordetect on 8.1.2 (range)
    cd: {
      full: nm(cd('full_tv')), limited: nm(cd('limited_tv')), mid: nm(cd('mid_tv')), hi1: nm(cd('hi1_tv')), lo1: nm(cd('lo1_tv')), edge: nm(cd('edge_tv')), cb: nm(cd('cbfull_tv')),
      fullNone: nm(cd('full_none')),
      optLimited: nm(cd(R8.limited_pc_opt ? 'limited_pc_opt' : 'limited_pc')), optMid: nm(cd(R8.mid_pc_opt ? 'mid_pc_opt' : 'mid_pc')),
      noAlphaPlane: cd('full_tv').alphaText, blocks: cd('full_tv').blocks, modeRangeOnlyAlpha: cd('full_tv', 'color_range').alphaText, modeAlphaOnlyRange: cd('full_tv', 'alpha_mode').rangeText,
      help: ev8.colordetect.hasModeOption,
    },
    // alpha
    alpha: {
      opaque: {px: A8.opaque_red.first, cd: ca('opaque_red').alpha}, straight: {px: A8.straight_half_red.first, cd: ca('straight_half_red').alpha, yuva: ca('straight_half_red', 'yuva420p').alpha},
      premult: {px: A8.premult_half_red.first, cd: ca('premult_half_red').alpha}, dark: {px: A8.dark_half.first, cd: ca('dark_half').alpha}, zero: {px: A8.transparent.first, cd: ca('transparent').alpha},
      boundary: {px: A8.boundary_127.first, cd: ca('boundary_127').alpha},
      bad: {frames: ev8.alpha.frames, cd: ca('one_bad_pixel').alpha, pixels: A8.one_bad_pixel.raw.pixels, evidence: A8.one_bad_pixel.raw.straightEvidence},
      rampStraightYuva: ca('ramp_straight', 'yuva420p').alpha, redLavfi: A8.lavfi_red_half.first,
      files: {identical: ev8.alpha.fileTags.identicalStreamMetadata, pix_fmt: ev8.alpha.fileTags.pix_fmt[0], keys: ev8.alpha.fileTags.alphaKeys[0].length},
    },
    // no trace on the frames
    trace: {metadataKeys: ev8.colordetect.props.fullTv.metadataLines.length, sideData: ev8.colordetect.props.written.frameSideData, tagAfter: ev8.colordetect.props.written.streamColorRange},
  };
}

export const factsBlock = (facts) => `// E:start (generated by episodes/fl08/fixture/gen-facts.mjs from evidence.json and evidence-v8.json; do not edit by hand)\nconst E: any = ${JSON.stringify(facts, null, 1).replace(/\n\s*/g, ' ')};\n// E:end`;
export const blockRe = /\/\/ E:start[\s\S]*?\/\/ E:end/;
