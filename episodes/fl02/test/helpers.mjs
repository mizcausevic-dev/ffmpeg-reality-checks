// Shared by the fl02 and fs02 tests: spoken-number parsing and the set of numbers an evidence file contains.
const UNITS = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const DIGIT = {zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9'};

// "four thousand four hundred ten" -> 4410, "six point five" -> 6.5. Punctuation ends a number.
export function spokenNumbers(text) {
  const out = [];
  // the ffmpeg version is spoken digit by digit and is checked against the recorded version line instead
  const t = text.toLowerCase().replace(/six point one point one/g, ' ');
  for (const phrase of t.split(/[.,:;!?()]/)) {
    let total = 0, cur = 0, active = false, frac = null;
    const flush = () => { if (active) out.push(Number(`${total + cur}${frac !== null ? '.' + frac : ''}`)); total = 0; cur = 0; active = false; frac = null; };
    for (const w of phrase.split(/\s+/).filter(Boolean)) {
      if (frac !== null && w in DIGIT) { frac += DIGIT[w]; continue; }
      if (w in UNITS) { if (frac !== null) { flush(); } cur += UNITS[w]; active = true; }
      else if (w in TENS) { cur += TENS[w]; active = true; }
      else if (w === 'hundred' && active) cur = (cur || 1) * 100;
      else if (w === 'thousand' && active) { total += (cur || 1) * 1000; cur = 0; }
      else if (w === 'million' && active) { total += (cur || 1) * 1e6; cur = 0; }
      else if (w === 'point' && active) frac = '';
      else flush();
    }
    flush();
  }
  return out;
}

// every number that appears in the evidence (leaves, and numbers inside command strings), both signs
export function evidenceNumbers(ev) {
  const set = new Set();
  const add = (v) => { if (Number.isFinite(v)) { set.add(Math.abs(v)); set.add(Math.round(Math.abs(v) * 1000) / 1000); } };
  const walk = (v) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') { if (v.length < 400) for (const m of v.matchAll(/\d+(?:\.\d+)?/g)) add(Number(m[0])); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(ev);
  return set;
}

// numbers written with digits in captions (commas removed); the ffmpeg version line is checked separately
export function captionNumbers(text) {
  return [...text.replace(/ffmpeg \d+\.\d+\.\d+/gi, ' ').matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
}

export const SMALL = 10; // spoken whole numbers up to ten are prose ("two files", "three codecs"); everything else must be in the evidence
export function unknownNumbers(script, ev) {
  const have = evidenceNumbers(ev), bad = [];
  const ok = (n) => (Number.isInteger(n) && n <= SMALL) || have.has(n) || have.has(Math.round(n * 1000) / 1000);
  for (const s of script.scenes) {
    for (const n of spokenNumbers(s.narration)) if (!ok(n)) bad.push(`${s.id} narration: ${n}`);
    for (const c of s.captions) for (const n of captionNumbers(c)) if (!ok(n)) bad.push(`${s.id} caption "${c}": ${n}`);
  }
  return bad;
}

export const wordCount = (script) => script.scenes.reduce((a, s) => a + s.narration.trim().split(/\s+/).filter(Boolean).length, 0);
// seconds: words at 148 per minute plus the engine's lead (0.6 s) and tail (end card seconds + 0.5, or 2 s without an end card); and the engine's own estimate (2.55 words per second)
export function durations(script) {
  const w = wordCount(script), lead = 0.6, tail = script.endCard ? (script.endCard.seconds ?? 10) + 0.5 : 2;
  return {words: w, speech148: (w / 148) * 60, total148: (w / 148) * 60 + lead + tail, engine: w / 2.55 + lead + tail};
}
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
