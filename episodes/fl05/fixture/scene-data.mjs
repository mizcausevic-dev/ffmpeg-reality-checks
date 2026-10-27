// The measured values the scenes draw, picked out of the evidence. Scenes.tsx cannot import the fixture (the render engine copies only
// Scenes.tsx and index.tsx), so gen-scene-data.mjs writes this object into a marked block in both Scenes.tsx files and a test proves the
// block still equals what the live evidence says. Values that vary from run to run (bytes served to a client) are not copied, only the
// relations that the tests assert (all of the file, under a quarter, request counts).
const dims = (s) => s.split('x').map(Number);
const msg = (l) => (l ? l.replace(/^\[[^\]]*\]\s*/, '').replace(/^x265 \[error\]:\s*/, '') : null);
const file = (c) => ({exit: c.exit, wrote: c.wrote, ...(c.wrote ? {profile: c.probe.profile, pixFmt: c.probe.pixFmt, w: c.probe.width, h: c.probe.height, tag: c.probe.tag, order: c.order, profileIdc: c.entry.profileIdc, chroma: c.entry.chromaFormatIdc, frames: c.probe.frames} : {refusal: msg(c.refusal)})});

export function sceneData(ev) {
  const c = ev.composite.cases, s = ev.sources, v = s.ff02.variants, n9 = s.ff09.cases, f3 = s.ff03.files, h3 = s.ff03.http, f31 = s.ff31.files;
  const [maj, min, pat] = ev.ffmpeg.match(/version (\d+)\.(\d+)\.(\d+)/).slice(1);
  const case9 = (k) => ({source: n9[k].source, scaleTo: n9[k].scaleTo, exit: n9[k].exit, vf: n9[k].command.match(/-vf (\S+)/)[1], msg: msg(n9[k].encoderLine)});
  return {
    ffmpeg: `${maj}.${min}.${pat}`,
    fixture: {frames: ev.composite.fixture.frames, size: ev.composite.fixture.pngSize, pix: ev.composite.fixture.pngPixFmt},
    naive264: file(c.naive264), strict264: file(c.strict264), fastonly264: file(c.fastonly264), nofast264: file(c.nofast264), recipe264: file(c.recipe264),
    naive265: file(c.naive265), strict265: file(c.strict265), recipe265: file(c.recipe265),
    ff02: {rgb: {profile: v.default_rgb_input.profile, pixFmt: v.default_rgb_input.pixFmt, psnr: v.default_rgb_input.psnrVsOriginal}, yuv: {profile: v.pix_fmt_yuv420p.profile, pixFmt: v.pix_fmt_yuv420p.pixFmt, psnr: v.pix_fmt_yuv420p.psnrVsOriginal}, control: {profile: v.control_yuv420p_input.profile, pixFmt: v.control_yuv420p_input.pixFmt}},
    ff09: {clean: case9('clean_16x9'), odd: case9('odd_both'), width: case9('odd_width'), height: case9('odd_height'), fixed: {...case9('fixed'), frames: n9.fixed.disk.video.frames}, p444: case9('odd_444')},
    ff03: {frames: f3.plain.frames, bytes: f3.plain.bytes, moovOffset: f3.plain.moovOffset, moovSize: f3.plain.moovSize, plain: f3.plain.boxes.map(({type, offset, size}) => ({type, offset, size})), fast: f3.faststart.boxes.map(({type, offset, size}) => ({type, offset, size})),
      plainWhole: h3.plain.noSeek.bytesServed === h3.plain.noSeek.fileBytes, fastUnderQuarter: h3.faststart.noSeek.bytesServed < h3.faststart.noSeek.fileBytes * 0.25, rangePlainRequests: h3.plain.rangeSeek.requests, rangeFastRequests: h3.faststart.rangeSeek.requests, rangePlainStarts: h3.plain.rangeSeek.rangeStarts, rangeFastStarts: h3.faststart.rangeSeek.rangeStarts},
    ff31: {frames: f31.def.decoded.frames, defTag: f31.def.probe.tagString, remuxTag: f31.remux.probe.tagString, changedFrames: f31.remux.decoded.sha === f31.def.decoded.sha ? 0 : f31.def.decoded.frames, diffBytes: s.ff31.diffs['def:remux'].count, mkvTag: f31.mkv.probe.tagString, mkvCodecId: 'V_MPEGH/ISO/HEVC', inBandKept: f31.repvc.box.samplesWithParamSets === f31.rep.box.samplesWithParamSets && f31.rep.box.samplesWithParamSets >= 1},
  };
}
