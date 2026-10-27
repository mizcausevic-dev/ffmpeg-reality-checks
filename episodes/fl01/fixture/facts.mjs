// The numbers the scenes draw. Derived from the evidence, never typed by hand: `node episodes/fl01/fixture/gen-facts.mjs`
// re-runs the fixture and rewrites the `E` block (between the E:start and E:end markers) of fl01/video/Scenes.tsx and
// fs01/video/Scenes.tsx. The tests re-derive the block from a fresh run and fail if a Scenes.tsx has drifted.
const r2 = (n) => Math.round(n * 1000) / 1000;
export function sceneFacts(ev) {
  const S = ev.sources, R = ev.recipe, a1 = S.ff01.variants, a23 = S.ff23.runs, a21 = S.ff21.runs, a32 = S.ff32.runs, a15 = S.ff15.runs;
  return {
    ask: {start: S.ff01.request.seekSeconds, length: S.ff01.request.clipSeconds, wantFrames: S.ff01.request.expectedFrames, srcSeconds: 20, srcFrames: S.ff01.source.frames},
    kf: S.ff01.source.keyframes,
    pre: {firstTime: a1.input_seek_copy.firstSourceTime, frames: a1.input_seek_copy.decodedFrames, packets: a1.input_seek_copy.packets, hidden: a1.input_seek_copy.packets - a1.input_seek_copy.decodedFrames, firstPts: a1.input_seek_copy.firstPacketPts},
    post: {firstTime: a1.output_seek_copy.firstSourceTime, frames: a1.output_seek_copy.decodedFrames, seconds: a1.output_seek_copy.decodedSeconds, firstFrame: a1.output_seek_copy.firstSourceFrame},
    enc: {frames: a1.input_seek_reencode.decodedFrames, firstFrame: a1.input_seek_reencode.firstSourceFrame, firstTime: a1.input_seek_reencode.firstSourceTime},
    order: {frames: a23.to_before_ss.declared.frames, seconds: a23.to_before_ss.declared.seconds, first: a23.to_before_ss.content.first, last: a23.to_before_ss.content.last},
    after: {frames: a23.to_after_ss.declared.frames, seconds: a23.to_after_ss.declared.seconds, first: a23.to_after_ss.content.first, last: a23.to_after_ss.content.last, endSeconds: a23.to_after_ss.content.endSeconds},
    len: {frames: a23.t_after_ss.declared.frames, seconds: a23.t_after_ss.declared.seconds, startSeconds: a23.t_after_ss.content.firstSeconds, endSeconds: a23.t_after_ss.content.endSeconds},
    toOnly: {frames: a23.to_only_input.declared.frames, seconds: a23.to_only_input.declared.seconds, first: a23.to_only_input.content.first},
    cmd: {order: a23.to_before_ss.command, after: a23.to_after_ss.command, len: a23.t_after_ss.command, toOnly: a23.to_only_input.command,
      g100: a21.g100.command, nosc: a21.g100_nosc.command, forced: a21.g100_forced.command, force2: a21.g100_force_2s.command,
      sseofEnc: a32.g100_enc.command, sseofCopy: a32.g100_copy.command, sseofAv: a32.av.command, sseofBig: a32.big_enc.command,
      shortestCopy: a15.short_audio_copy.command, shortestEnc: a15.short_audio_encode.command, tCopy: R.ends.t3.command,
      reencode: R.runs.reencode.command, naive: R.runs.naive_copy.command, copyPlain: R.runs.copy_on_grid.command, copyPrepared: R.runs.copy_prepared.command},
    gop: {seconds: S.ff21.source.seconds, cuts: S.ff21.source.cuts, g100: a21.g100.keyframes, nosc: a21.g100_nosc.keyframes, forced: a21.g100_forced.keyframes, force2: a21.g100_force_2s.keyframes},
    sseof: {frames: S.ff32.source.frames, seconds: S.ff32.source.seconds, kf100: S.ff32.source.keyframes.g100, kf10: S.ff32.source.keyframes.g10,
      enc: {first: a32.g100_enc.first, frames: a32.g100_enc.frames}, copy: {first: a32.g100_copy.first, frames: a32.g100_copy.frames, seconds: r2(a32.g100_copy.packetSeconds)},
      g10: {first: a32.g10_copy.first, frames: a32.g10_copy.frames}, enc29: {first: a32.g10_enc29.first, frames: a32.g10_enc29.frames}, copy29: {first: a32.g10_copy29.first, frames: a32.g10_copy29.frames}, big: {frames: a32.big_enc.frames}},
    av: {container: S.ff32.source.av.container, picture: S.ff32.source.av.picture, frames: a32.av.frames, first: a32.av.first, audioSeconds: a32.av.audioSeconds, pictureSeconds: a32.av.decodedSeconds},
    short: {srcFrames: a15.short_audio_none.decoded.videoFrames, srcSeconds: a15.short_audio_none.declared.video, tone: a15.short_audio_none.declared.audio, copyFrames: a15.short_audio_copy.decoded.videoFrames, copySeconds: a15.short_audio_copy.decoded.videoSeconds, encFrames: a15.short_audio_encode.decoded.videoFrames,
      longTone: a15.long_audio_none.declared.audio, longNone: a15.long_audio_none.declared.container, longShort: a15.long_audio_short.declared.container},
    tcopy: {frames: R.ends.t3.decoded.videoFrames, seconds: R.ends.t3.declared.video},
    rec: {frames: R.source.frames, fps: R.source.fps, seconds: R.source.seconds, startFrame: R.source.ask.startFrame, wantFrames: R.source.ask.frames, lastFrame: R.source.ask.startFrame + R.source.ask.frames - 1, grid: R.source.keyframes.grid, prepared: R.source.keyframes.prepared, forced: R.source.forcedAt,
      enc: {frames: R.runs.reencode.frames, first: R.runs.reencode.first, last: R.runs.reencode.last, packets: R.runs.reencode.packets},
      naive: {frames: R.runs.naive_copy.frames, first: R.runs.naive_copy.first, last: R.runs.naive_copy.last},
      plain: {frames: R.runs.copy_on_grid.frames, packets: R.runs.copy_on_grid.packets, hidden: R.runs.copy_on_grid.verdict.hiddenPackets},
      prep: {frames: R.runs.copy_prepared.frames, packets: R.runs.copy_prepared.packets, hidden: R.runs.copy_prepared.verdict.hiddenPackets},
      prepAfter: {frames: R.runs.copy_prepared_after.frames, packets: R.runs.copy_prepared_after.packets}},
    version: ev.ffmpeg.match(/version (\d+\.\d+(?:\.\d+)?)/)[1],
  };
}
export const factsBlock = (facts) => `// E:start (generated by episodes/fl01/fixture/gen-facts.mjs from the evidence; do not edit by hand)\nconst E: any = ${JSON.stringify(facts, null, 1).replace(/\n\s*/g, ' ')};\n// E:end`;
export const blockRe = /\/\/ E:start[\s\S]*?\/\/ E:end/;
