// How a number is spoken in the narration, so a test can prove that every spoken number is one the evidence holds.
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function cardinal(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + cardinal(n % 100) : '');
  if (n < 1e6) return cardinal(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + cardinal(n % 1000) : '');
  throw new Error('too large');
}
// "five ninety three" for 593, "twelve eighty" for 1280, "three oh two" for 302
function colloquial(n) {
  if (n < 100 || n >= 10000 || n % 1000 === 0) return null;
  const a = Math.floor(n / 100), b = n % 100;
  if (b === 0) return cardinal(a) + ' hundred';
  return cardinal(a) + ' ' + (b < 10 ? 'oh ' + ONES[b] : cardinal(b));
}
export function variants(x) {
  if (!Number.isInteger(x)) { // decimals read digit by digit after the point, 0 as "oh"
    const [i, f] = String(x).split('.');
    return [cardinal(+i) + ' point ' + [...f].map((d) => (d === '0' ? 'oh' : ONES[+d])).join(' ')];
  }
  return [cardinal(x), colloquial(x)].filter(Boolean);
}
// All the ways a template such as "{0} by {1}" can be spoken for these numbers.
export function candidates(tpl, nums) {
  let outs = [tpl];
  nums.forEach((n, i) => { outs = outs.flatMap((o) => variants(n).map((v) => o.replaceAll(`{${i}}`, v))); });
  return outs;
}
const NUMWORDS = new Set([...ONES, ...TENS.filter(Boolean), 'hundred', 'thousand', 'point']);
// Number words left in a text after the covered phrases have been removed. "oh" and "point" alone are not counted.
export function leftoverNumberWords(text, covered) {
  let t = ' ' + text.toLowerCase().replace(/[.,:;?!]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const c of [...covered].sort((a, b) => b.length - a.length)) t = t.replaceAll(' ' + c.toLowerCase().replace(/[.,:;?!]/g, ' ').replace(/\s+/g, ' ').trim() + ' ', ' ~ ');
  return t.split(/\s+/).filter((w) => NUMWORDS.has(w) && w !== 'point');
}
// numeric tokens in on-screen captions: not part of a word (so yuv420p, hvc1, libx265 are skipped); 4:4:4 style chroma names are removed first
export function captionNumbers(caption) {
  return [...caption.replace(/\b4:[24]:[024]\b/g, ' ').matchAll(/(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, ''));
}
// every number the evidence holds: numeric values, and digits inside strings (commands, sizes)
export function evidenceNumbers(ev) {
  const set = new Set();
  const walk = (v) => {
    if (typeof v === 'number') set.add(String(v));
    else if (typeof v === 'string') for (const m of v.matchAll(/\d+(?:\.\d+)?/g)) set.add(m[0]);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(ev);
  return set;
}
