// The numbers the scenes draw, picked from the evidence (out/fl02/evidence.json, written by fixture/run.mjs).
// sync-evidence.mjs pastes this object into the generated block of fl02/video/Scenes.tsx and fs02/video/Scenes.tsx
// (ship copies only Scenes.tsx and index.tsx into the engine, so the scenes cannot import the fixture). A test compares the pasted
// block with a fresh pick, so no number on screen is typed by hand.
export function pickEvidence(ev) {
  const r = ev.recipe, f = ev.facts, b = ev.bridge, a8 = ev.ff08, m = ev.ff78, o = ev.ff79, t46 = ev.ff46.runs;
  const tag = m.encodes.imp_cbr_tag, raw = m.encodes.imp_cbr_raw, ver = (ev.ffmpeg.match(/version (\d+\.\d+\.\d+)/) ?? [])[1];
  const gap = (x) => ({clicks: x.clicks, seam: x.seamGap, samples: x.samples, first: x.firstClick});
  return {
    ver,
    wanted: r.source.seamWanted, valid: r.source.valid, rate: r.source.rate, clickEarly: r.source.clickEarly, ampA: r.source.ampA, ampB: r.source.ampB, bitrate: r.source.bitrate,
    ctl: gap(r.control),
    copy: {...gap(r.copy), editMs: r.copy.editMs, media: r.copy.mediaTime, packets: r.copy.sampleCount, extra: r.copy.extraVsAsked, ms: f.seamCopyMsRound, cmd: r.copy.command, probeS: r.copy.ffprobeDuration},
    notrim: {...gap(r.notrim), editMs: r.notrim.editMs, packets: r.notrim.sampleCount, cmd: r.notrim.command},
    rec: {...gap(r.recipe), editMs: r.recipe.editMs, media: r.recipe.mediaTime, packets: r.recipe.sampleCount, probePackets: r.recipe.ffprobePackets, probeS: r.recipe.ffprobeDuration, cmd: r.recipe.command},
    aac: {
      priming: a8.accounting.primingPerFile, padding: a8.accounting.paddingPerFile, packets: a8.a.packets, decoded: a8.a.decodedSamples,
      edits: b.single.editCount, editMs: b.single.editMs, media: b.single.mediaTime, honoured: b.single.decodedHonoured, ignored: b.single.decodedIgnored,
      joinPackets: a8.join.packets, joinEditMs: b.join.editMs, joinMedia: b.join.mediaTime, joinDecoded: a8.join.decodedSamples, asked: a8.accounting.validSamplesTotal, extra: a8.accounting.joinMinusValid,
    },
    mp3: {
      inSamples: m.control.imp.samples, ctlPeak: m.control.imp.peak, rawPeak: raw.peak, rawShift: raw.shift, rawSamples: raw.samples, tagPeak: tag.peak, tagSamples: tag.samples,
      tagAt: tag.mp3.tagAt, lameAt: tag.mp3.lameAt, delayAt: tag.mp3.delayAt, delayHex: tag.mp3.delayHex, encoder: tag.mp3.encoder, delay: tag.mp3.delay, padding: tag.mp3.padding, frames: tag.mp3.audioFrames,
      decExtra: f.mp3DecoderExtra, skip: f.mp3Skip, trim: f.mp3Trim, noSkip: tag.mp3.decodedWithoutSkip,
      cutDelay: m.cuts.copyBefore5.mp3.delay, cutLate: m.cuts.copyBefore5.late, cutStarts: m.cuts.copyBefore5.startsAt, cutDrop: f.mp3CutDrop, reStarts: m.cuts.reencode5.startsAt, cutCmd: m.cuts.copyBefore5.command, reCmd: m.cuts.reencode5.command,
    },
    opus: {
      pre: o.encodes.ogg.head.preSkip, preMs: f.opusPreSkipMs, hex: o.encodes.ogg.head.hex, preHex: o.encodes.ogg.head.preSkipHex, click: o.control.click,
      boxes: ['ogg', 'oggp', 'mkv', 'opus'].map((k) => ({k, pre: o.encodes[k].head.preSkip, click: o.encodes[k].click})),
      c0: o.patched.ogg_0.click, c1000: o.patched.ogg_1000.click, late: f.opusLate0, early: f.opusEarly1000,
      packet: f.opusPacketSamples, packetMs: f.opusPacketMs,
      cuts: {mkvBefore: o.cuts.mkvBefore.startsAt, mkvAfter: o.cuts.mkvAfter.startsAt, oggAfter: o.cuts.oggAfter.startsAt, re: o.cuts.reencode.startsAt, wanted: o.cuts.oggAfter.wanted},
    },
    off: {plusMs: t46['mp4.aPlus'].bytes.audioEdits[0].dur, minusSkip: t46['mp4.aMinus'].bytes.audioSkipUnits, minusMp4: t46['mp4.aMinus'].audio.samples, minusMkv: t46['mkv.aMinus'].audio.samples, minusMs: t46['mp4.aMinus'].bytes.audioEdits[0].dur, videoMs: t46['mp4.aMinus'].bytes.videoEdits[0].dur, full: t46['mp4.base'].audio.samples},
  };
}
