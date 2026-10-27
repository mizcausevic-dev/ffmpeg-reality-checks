// Usage: node episodes/fs02/fixture/run.mjs   (prints the fl02 numbers the short cut speaks; writes nothing new)
import {loadEvidence} from './experiment.mjs';
import {have} from '../../../tools/ff.mjs';
if (!have('ffmpeg') || !have('ffprobe')) { console.error('ffmpeg and ffprobe must be on PATH'); process.exit(1); }
const ev = loadEvidence(), r = ev.recipe;
console.log(ev.ffmpeg);
console.log(`copy join seam ${r.copy.seamGap}; no-trim re-encode seam ${r.notrim.seamGap}; recipe seam ${r.recipe.seamGap}, clicks ${JSON.stringify(r.recipe.clicks)}, edit list ${r.recipe.editMs} ms, ${r.recipe.sampleCount} packets, ffprobe ${r.recipe.ffprobeDuration} s`);
