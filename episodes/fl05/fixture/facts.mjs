// Every number the narration speaks, tied to the evidence value it comes from.
// A fact is {scene, tpl, nums, holds?}: tpl is the phrase with {0}, {1}... for the numbers, nums are read from the evidence,
// holds is an extra relation that must be true in the evidence (for bounds such as "under fifty thousand").
// The test checks that the phrase appears in the scene's narration, that it is a correct spoken form of nums,
// and that nothing else in the narration is a number word (except IDIOMS, which name formats and counts of our own steps).
const dims = (s) => s.split('x').map(Number);
const arg = (cmd, re) => cmd.match(re).slice(1).map(Number);
const ver = (ev) => ev.ffmpeg.match(/version (\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);

export function longFacts(ev) {
  const c = ev.composite.cases, s = ev.sources, f = ev.composite.fixture;
  const w9 = s.ff09.cases;
  const wh = (k) => dims(w9[k].scaleTo);
  return [
    {scene: 'ask', tpl: 'status {0}', nums: [c.naive264.exit]},
    {scene: 'ask', tpl: '{0} by {1}', nums: [c.naive264.probe.width, c.naive264.probe.height], holds: c.naive264.entry.width === c.naive264.probe.width && c.naive264.entry.height === c.naive264.probe.height && c.naive264.order.at(-1) === 'moov'},
    {scene: 'rig', tpl: '{0} point {1} point {2}', nums: ver(ev)},
    {scene: 'rig', tpl: '{0} PNG frames', nums: [f.frames]},
    {scene: 'rig', tpl: '{0} by {1}', nums: dims(f.pngSize)},
    {scene: 'rig', tpl: 'height {0}', nums: arg(c.naive264.command, /scale=-1:(\d+)/)},
    {scene: 'fix420', tpl: '{0} decibels', nums: [s.ff02.variants.default_rgb_input.psnrVsOriginal]},
    {scene: 'fix420', tpl: 'four two zero {0}', nums: [s.ff02.variants.pix_fmt_yuv420p.psnrVsOriginal]},
    {scene: 'crash', tpl: '{0} by {1} clip', nums: dims(w9.clean_16x9.source)},
    {scene: 'crash', tpl: 'height {0}', nums: arg(w9.clean_16x9.command, /scale=-1:(\d+)/)},
    {scene: 'crash', tpl: 'gives {0} by {1}', nums: wh('clean_16x9')},
    {scene: 'crash', tpl: 'Now {0} by {1}', nums: dims(w9.odd_both.source)},
    {scene: 'crash', tpl: 'scale equals minus {0}, colon, {1}', nums: arg(w9.odd_both.command, /scale=-(\d):(\d+)/)},
    {scene: 'crash', tpl: 'The width is {0}', nums: [wh('odd_both')[0]]},
    {scene: 'either', tpl: '{0} by {1}, scaled to height {2}', nums: [...dims(w9.odd_width.source), ...arg(w9.odd_width.command, /scale=-1:(\d+)/)]},
    {scene: 'either', tpl: 'width {0}', nums: [wh('odd_width')[0]]},
    {scene: 'either', tpl: 'Minus {0} makes', nums: arg(w9.odd_height.command, /scale=-(\d):/)},
    {scene: 'either', tpl: '{0} is still odd', nums: [wh('odd_height')[1]]},
    {scene: 'either', tpl: 'Minus {0}, colon, {1} gives {2} by {3}', nums: [...arg(w9.fixed.command, /scale=-(\d):(\d+)/), ...wh('fixed')]},
    {scene: 'either', tpl: 'Exit {0}, {1} frames', nums: [w9.fixed.exit, w9.fixed.disk.video.frames]},
    {scene: 'hidden', tpl: '{0} by {1} frame encodes fine', nums: [...wh('odd_444')], holds: w9.odd_444.exit === 0 && c.naive264.exit === 0 && c.naive264.probe.pixFmt === 'yuv444p'},
    {scene: 'hidden', tpl: 'it fails, nothing written', nums: [], holds: c.strict264.exit !== 0 && c.strict264.wrote === false},
    {scene: 'order', tpl: 'byte {0} of {1}', nums: [s.ff03.files.plain.moovOffset, s.ff03.files.plain.bytes]},
    {scene: 'order', tpl: 'Same {0} frames', nums: [s.ff03.files.plain.frames], holds: s.ff03.files.faststart.frames === s.ff03.files.plain.frames},
    {scene: 'client', tpl: 'every byte: {0}', nums: [s.ff03.http.plain.noSeek.bytesServed], holds: s.ff03.http.plain.noSeek.bytesServed === s.ff03.http.plain.noSeek.fileBytes},
    {scene: 'client', tpl: 'under a quarter of it', nums: [], holds: s.ff03.http.faststart.noSeek.bytesServed < s.ff03.http.faststart.noSeek.fileBytes * 0.25},
    {scene: 'client', tpl: '{0} requests, not {1}', nums: [s.ff03.http.plain.rangeSeek.requests, s.ff03.http.faststart.rangeSeek.requests]},
    {scene: 'retag', tpl: 'zero of {0} frames change', nums: [s.ff31.files.def.decoded.frames], holds: s.ff31.files.remux.decoded.sha === s.ff31.files.def.decoded.sha && s.ff31.files.remux.packetMd5 === s.ff31.files.def.packetMd5},
    {scene: 'retag', tpl: 'ffmpeg {0} point {1} point {2} that is {3} bytes', nums: [...ver(ev), s.ff31.diffs['def:remux'].count], exact: true},
    {scene: 'recipe264', tpl: 'scale equals minus {0}, colon, {1}', nums: arg(c.recipe264.command, /scale=-(\d):(\d+)/)},
    {scene: 'recipe264', tpl: '{0} by {1}, index first', nums: [c.recipe264.probe.width, c.recipe264.probe.height], holds: c.recipe264.entry.width === c.recipe264.probe.width && c.recipe264.order[1] === 'moov'},
    {scene: 'recipe265', tpl: '{0} by {1}, h v c one', nums: [c.recipe265.probe.width, c.recipe265.probe.height], holds: c.recipe265.entry.fourcc === 'hvc1'},
  ];
}

// Phrases that are numbers in words but are not measurements: names of formats, tags and encoders, and counts of our own steps.
export const IDIOMS = [
  'four four four', 'four two zero', 'x two six four', 'x two six five', 'h two six four', 'h v c one', 'h e v one',
  'three things', 'two readers', 'reader one', 'reader two', 'one command', 'one problem', 'divisible by two', 'fix one',
  'all three', 'exit zero', 'is not zero', 'the first', 'plus faststart',
];
