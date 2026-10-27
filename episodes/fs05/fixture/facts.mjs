// Every number the short's narration speaks, tied to the evidence it comes from (same format as fl05/fixture/facts.mjs).
const dims = (s) => s.split('x').map(Number);
const arg = (cmd, re) => cmd.match(re).slice(1).map(Number);
const ver = (ev) => ev.ffmpeg.match(/version (\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);

export function shortFacts(ev) {
  const c = ev.composite.cases, s = ev.sources, w9 = s.ff09.cases;
  return [
    {scene: 'hook', tpl: 'status {0}', nums: [c.naive264.exit], holds: c.naive264.probe.pixFmt === 'yuv444p' && c.naive264.order.at(-1) === 'moov' && c.naive264.probe.width % 2 === 1},
    {scene: 'fix420', tpl: '{0} decibels', nums: [s.ff02.variants.default_rgb_input.psnrVsOriginal]},
    {scene: 'fix420', tpl: 'becomes {0}', nums: [s.ff02.variants.pix_fmt_yuv420p.psnrVsOriginal]},
    {scene: 'crash', tpl: '{0} by {1}, with', nums: dims(w9.odd_both.source)},
    {scene: 'crash', tpl: 'scale equals minus {0}, colon, {1}', nums: arg(w9.odd_both.command, /scale=-(\d):(\d+)/)},
    {scene: 'crash', tpl: 'width {0}', nums: [dims(w9.odd_both.scaleTo)[0]], holds: w9.odd_both.exit !== 0 && w9.odd_both.disk.video === null},
    {scene: 'hidden', tpl: 'minus {0}, colon, {1} gives {2} by {3}', nums: [...arg(w9.fixed.command, /scale=-(\d):(\d+)/), ...dims(w9.fixed.scaleTo)], holds: w9.odd_444.exit === 0 && c.strict264.exit !== 0},
    {scene: 'order', tpl: 'byte {0} of {1}', nums: [s.ff03.files.plain.moovOffset, s.ff03.files.plain.bytes]},
    {scene: 'client', tpl: 'under a quarter of it', nums: [], holds: s.ff03.http.faststart.noSeek.bytesServed < s.ff03.http.faststart.noSeek.fileBytes * 0.25 && s.ff03.http.plain.noSeek.bytesServed === s.ff03.http.plain.noSeek.fileBytes},
    {scene: 'hevc', tpl: 'zero of {0} frames change', nums: [s.ff31.files.def.decoded.frames], holds: s.ff31.files.remux.decoded.sha === s.ff31.files.def.decoded.sha},
    {scene: 'recipe', tpl: 'both readers say High, four two zero, index first', nums: [], holds: c.recipe264.probe.profile === 'High' && c.recipe264.probe.pixFmt === 'yuv420p' && c.recipe264.entry.profileIdc === 100 && c.recipe264.entry.chromaFormatIdc === 1 && c.recipe264.order[1] === 'moov' && c.recipe264.traceOrder[1] === 'moov'},
    {scene: 'close', tpl: '{0} point {1} point {2}', nums: ver(ev)},
  ];
}
