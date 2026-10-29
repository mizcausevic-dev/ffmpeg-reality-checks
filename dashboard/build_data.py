#!/usr/bin/env python3
"""Build the dashboard datasets for the FFmpeg Reality Checks ledger.

Reads (all in this repo):
  episodes/ffNN/script.json   title, fullTitle, thumb, narration (also flNN long films and fsNN Shorts)
  dashboard/snapshot.json     YouTube stats snapshot (ids, seconds, views, likes, privacy) and channel traffic
  dashboard/tests.json        test counts per episode, {ffNN: {tests, pass, fail}}, measured by build
  dashboard/queue.json        the next-episode queue (hand-maintained)
  dashboard/limits.json       upload and quota facts (hand-maintained)

Writes dashboard/out/{films,traffic,queue,limits,timeline}.json (row arrays, the shape the dashboard loads).
Usage: python3 dashboard/build_data.py
"""
import json, pathlib, re, base64, datetime
from zoneinfo import ZoneInfo
ET = ZoneInfo('America/New_York')

def et(iso):
    return datetime.datetime.fromisoformat(iso.replace('Z', '+00:00')).astimezone(ET)

def fmt_et(iso):
    d = et(iso)
    return d.strftime('%b ') + str(d.day) + d.strftime(', ') + str(int(d.strftime('%I'))) + d.strftime(':%M %p').lower() + ' ET'

root = pathlib.Path(__file__).resolve().parent.parent
dash = root / 'dashboard'
out = dash / 'out'
out.mkdir(exist_ok=True)

LABEL = {'SHORTS':'Shorts feed','YT_SEARCH':'YouTube search','ADVERTISING':'YouTube advertising','EXT_URL':'External sites','NO_LINK_OTHER':'Direct or unknown','YT_CHANNEL':'Channel pages','RELATED_VIDEO':'Suggested videos','YT_OTHER_PAGE':'Other YouTube pages','PLAYLIST':'Playlists','NOTIFICATION':'Notifications','SUBSCRIBER':'Browse features','END_SCREEN':'End screens','HASHTAGS':'Hashtag pages','NO_LINK_EMBEDDED':'Embedded players','CAMPAIGN_CARD':'Cards'}
snap = json.loads((dash / 'snapshot.json').read_text())
tests = json.loads((dash / 'tests.json').read_text()) if (dash / 'tests.json').exists() else {}
queue = json.loads((dash / 'queue.json').read_text())
series = json.loads((root / 'series.json').read_text())
rel = series['footer']['related']
limits = json.loads((dash / 'limits.json').read_text())
endscreens = json.loads((dash / 'endscreens.json').read_text()) if (dash / 'endscreens.json').exists() else {}

# Films where the same command gave different results on 6.1.1 and 8.1.2 (found in the tests).
differs = {
    'ff05': 'Default mp4 with no frame-rate option: 150 frames (57 repeats) on 6.1.1, all 93 frames kept on 8.1.2.',
    'ff09': 'libx264 refuses the odd size on both builds; only the exit number differs (187 on Linux 6.1.1, another non-zero code on Windows 8.1.2).',
    'ff13': '-noautorotate keeps the rotation tag on 6.1.1 and drops it on 8.1.2; the by-hand transpose ends upside down on 6.1.1, upright on 8.1.2.',
    'ff17': '-colorspace bt709 only writes the label on 6.1.1 (pixels stay BT.601) but also converts on 8.1.2; scale=out_color_matrix=bt709 leaves no tag on 6.1.1 and writes one on 8.1.2.',
    'ff26': 'Black level after -color_range pc: 16 on 6.1.1, 0 on 8.1.2.',
    'ff31': 'Byte count after the hvc1 retag: 2 on 6.1.1, 5 on 8.1.2 (frames unchanged on both).',
    'ff33': '-stream_loop with a short audio track: 355 frames on 6.1.1, 359 on 8.1.2.',
    'ff44': 'Matrix tag after scale=out_color_matrix=bt709: bt2020nc kept on 6.1.1, bt709 on 8.1.2 (pixels identical).',
    'ff45': 'Plain .mov trim: 50 frames with 25 repeats on 6.1.1, 25 frames with a 1 s gap on 8.1.2.',
    'ff46': 'mp4 audio -1 s: the edit list is the same, but the decoder returns 138752 samples on 8.1.2, so the decoded reader says -1.024 s (6.1.1: -1.000 s).',
    'ff49': 'Printed bit_rate sits up to 1.9 kbit/s above the packet average on 8.1.2 (under 1 on 6.1.1).',
    'ff59': 'Default mp4 after select: 99 frames on 6.1.1, 4 frames on 8.1.2 (image files repeat on both).',
    'ff64': '-fflags +shortest is refused on 8.1.2, and the copied-song and -shortest_buf_duration counts are not stable there.',
    'ff65': 'aac output with apad and -shortest: the sample count differs by build.',
    'ff68': 'mkv audio comes in blocks of 85 or 86 ms on 8.1.2 (42 or 43 ms on 6.1.1), so packet sums differ slightly.',
    'ff73': 'A bare 12:30 in drawtext is refused with an error on 8.1.2; on 6.1.1 it draws a wrong frame and exits 0.',
    'ff78': 'ffprobe prints the duration of a tagged mp3 as 1.0449 s on 6.1.1 and 1.000 s on 8.1.2 (start_time 0.025057 on both).',
    'ff79': 'Rewriting the pre-skip in an mkv moves the click on 6.1.1 but not on 8.1.2 (ogg behaves the same on both); mkv start_time is -0.007 s on 6.1.1 and 0 on 8.1.2.',
    'ff81': 'After libx264 crf 23 the noise first frame scores 0.164 on 6.1.1 and 0.191 on 8.1.2 (raw 0.198 on both); the hard cut and the cross-fade scores are the same on both.',
    'ff85': 'format=yuv420p dithers identically on both builds (same bytes); sws_dither=none truncates on 6.1.1 (64 values, mean error -0.375) and rounds to nearest on 8.1.2 (65 values, +0.125).',
    'ff92': 'Keyframe positions are identical on 6.1.1 and 8.1.2; file sizes differ (default 78511 vs 84844 bytes, scenecut off +9% vs +10.6%).',
    'ff84': 'libopus with -vbr off at 64 kbit/s keeps all tones to 20.0 kHz on 6.1.1; on 8.1.2 it drops two tones (15.6 and 15.7 kHz) and passes the rest, so it is a gap, not a lowpass (default VBR is 20.0 on both).',
    'ff89': 'libvpx-vp9 given rgba input: 6.1.1 converts to yuva420p by itself, 8.1.2 picks gbrap and refuses it until -pix_fmt yuva420p is named.',
    'ff76': 'format=gray on a bt709 file keeps the file luma on 6.1.1 (red 55) and uses the 601 weights on 8.1.2 (red 76).',
}
# ff01..ff25 were re-run on 8.1.2 on Oct 27 (runs-6.1.1 / runs-8.1.2): 13 identical, 12 differ in numbers; claim-level differences are listed in `differs`.
BOTH_FROM = 1
# Long films (flNN) and Shorts (fsNN): measured on 6.1.1 only so far; 8.1.2 has not been run on them.
KIND = {'ff': 'film', 'fl': 'long', 'fs': 'short'}
THEME = {'fl01': 'cutting', 'fs01': 'cutting', 'fl02': 'gapless audio', 'fs02': 'gapless audio', 'fl03': 'color shifts', 'fs03': 'color shifts', 'fl04': 'frame rate and timestamps', 'fs04': 'frame rate and timestamps', 'fl05': 'files that will not play', 'fs05': 'files that will not play', 'fl06': 'PNG default predictor', 'fs06': 'PNG default predictor', 'fl07': 'AV1 encoders', 'fs07': 'AV1 encoders', 'fl08': 'colordetect', 'fs08': 'colordetect'}
# The combined fl02 + fs02 test run reports one total (46 of 46); it is counted once, under fl02.
TEST_NOTE = {'fl02': 'Combined run with fs02: 46 of 46.', 'fs02': 'Counted under fl02 (46 of 46 combined).'}
# fl06 to fs08 were measured on both builds (6.1.1 in the container, 8.1.2 on the PC); the Shorts import their long film's fixture.
NEW_BOTH = {'fl06','fs06','fl07','fs07','fl08','fs08'}
differs.update({
    'fl06': 'The decoded pixels are identical on both builds (112 files), but the png default filter moved (-pred none on 6.1.1, paeth on 8.1.2), and even with -pred pinned the bytes differ across builds (0 of 96 files the same).',
    'fs06': 'Same measurement as fl06: the picture is identical on both builds; the default png filter moved and the bytes differ.',
    'fl07': '-b:v 500k next to -crf 30 with libsvtav1 is ignored on 6.1.1 (the crf 30 file, byte for byte) and an error on 8.1.2 (no file); the crf 30 file is 61302 B on 6.1.1 and 82283 B on 8.1.2.',
    'fs07': 'Same measurement as fl07: -b:v next to -crf is ignored on 6.1.1 and an error on 8.1.2.',
    'fl08': 'colordetect is an ffmpeg 8 filter and does not exist in 6.1.1. A premultiplied-looking pixel over gray 128 composites differently by build (cause unexplained); that check was dropped from the film.',
    'fs08': 'Same measurement as fl08: colordetect exists on 8.1.2 only.',
})
# Films whose build-dependent claims are asserted on 6.1.1 only; 8.1.2 ran the build-independent checks.
PARTIAL = {'ff51','ff52','ff53','ff54','ff55','ff56','ff57'}
# Films whose path grid needs file names Windows cannot hold: measured on 6.1.1 only.
LINUX_ONLY = {'ff60'}

def order_of(code):
    # one sort key for all three prefixes: ff by number, then fl, then fs
    n = int(code[2:])
    return n if code.startswith('ff') else (1000 if code.startswith('fl') else 1100) + n

films = []
for d in sorted([p for p in (root / 'episodes').iterdir() if p.is_dir() and re.fullmatch(r'f[fls]\d\d', p.name)], key=lambda p: order_of(p.name)):
    code = d.name
    kind = KIND[code[:2]]
    n = int(code[2:])
    sp = d / 'script.json'
    if not sp.exists():
        continue
    s = json.loads(sp.read_text())
    words = sum(len(sc.get('narration', '').split()) for sc in s.get('scenes', []))
    st = snap['films'].get(code)
    dist = d / 'content' / 'distribution.md'
    pm = re.search(r'### Pinned comment[^\n]*\n+(.+?)(?:\n\n|\n#|\Z)', dist.read_text(), re.S) if dist.exists() else None
    pinned = pm.group(1).strip() if pm else ''
    es = endscreens.get(code, {})
    t = tests.get(code, {})
    row = {
        'code': code,
        'n': n,
        'question': s['title'],
        'video_title': s['fullTitle'],
        'stat': s.get('thumb', {}).get('number', ''),
        'stat_label': (s['thumb']['label'].capitalize() if s['thumb']['label'].isupper() else s['thumb']['label']) if 'thumb' in s else '',
        'scenes': len(s.get('scenes', [])),
        'words': words,
        'tests': t.get('tests'),
        'tests_failed': t.get('fail'),
        'kind': kind,
        'ord': order_of(code),
        'palette': s.get('palette', '') if kind != 'film' else '',
        'theme': THEME.get(code, ''),
        'test_note': TEST_NOTE.get(code, '') or (str(t['skipped']) + ' more checks are skipped on 6.1.1: they assert exact numbers measured on 8.1.2 (or a filter 6.1.1 lacks).' if t.get('skipped') else ''),
        'on_8': 'yes' if code in NEW_BOTH else 'no' if kind != 'film' or code in LINUX_ONLY else ('partly' if code in PARTIAL else ('yes' if n >= BOTH_FROM else 'no')),
        'builds': ('6.1.1 and 8.1.2' if code in NEW_BOTH else '6.1.1 (8.1.2 not run yet)') if kind != 'film' else ('6.1.1 (8.1.2 partly)' if code in PARTIAL else ('6.1.1 only (tests skip on Windows)' if code in LINUX_ONLY else None) or ('6.1.1 and 8.1.2' if n >= BOTH_FROM else '6.1.1')),
        'build_difference': 'yes' if code in differs else 'no',
        'build_note': differs.get(code, ''),
        'status': 'public' if st and st['privacy'] == 'public' else ('private' if st else 'in production'),
        'seconds': st['seconds'] if st else None,
        'views': st['views'] if st else None,
        'likes': st['likes'] if st else None,
        'related': ' · '.join(rel.get(code, [])),
        'pinned': pinned,
        'pinned_chars': len(pinned),
        'endscreen': es.get('status', 'not set'),
        'end_note': es.get('note', 'Queued for later, by hand (Studio only).' if kind != 'film' else ''),
        'video_id': st['videoId'] if st else '',
        'published_at': st.get('at', '') if st else '',
        'published': fmt_et(st['at']) if st and st.get('at') else '',
        'published_kind': ('went public' if st['privacy'] == 'public' else 'uploaded, private') if st and st.get('at') else '',
        'url': ('https://youtu.be/' + st['videoId']) if st else '',
    }
    films.append(row)

ana = json.loads((dash / 'analytics.json').read_text()) if (dash / 'analytics.json').exists() else None
if ana:
    traffic = [{'source': LABEL.get(r['insightTrafficSourceType'], r['insightTrafficSourceType']), 'views': r['views'], 'minutes': r['estimatedMinutesWatched']} for r in sorted(ana['traffic'], key=lambda r: -r['views'])]
else:
    traffic = snap['channelTraffic']['sources']
# Thumbnails: dashboard/thumbs/<code>.jpg (320 px wide, from episodes/<code>/thumbnail.png; Shorts have no thumbnail), embedded as data URLs in the film rows.
for f in films:
    jp = dash / 'thumbs' / (f['code'] + '.jpg')
    f['thumb'] = ('data:image/jpeg;base64,' + base64.b64encode(jp.read_bytes()).decode()) if jp.exists() else ''
(out / 'films.json').write_text(json.dumps(films, separators=(',', ':')))

# Timeline: real YouTube times (publishedAt) grouped into batches per prefix (ff, fl, fs), plus what is scheduled and in production.
def batches_for(prefix):
    done = sorted([(c, v) for c, v in snap['films'].items() if c.startswith(prefix) and v.get('at')], key=lambda kv: kv[1]['at'])
    out_b = []
    for c, v in done:
        last = out_b[-1] if out_b else None
        if last and last['privacy'] == v['privacy'] and (et(v['at']) - et(last['end'])).total_seconds() <= 45 * 60:
            last['films'].append(c); last['end'] = v['at']
        else:
            out_b.append({'privacy': v['privacy'], 'start': v['at'], 'end': v['at'], 'films': [c]})
    return out_b
batches = sorted([b for pre in ('ff', 'fl', 'fs') for b in batches_for(pre)], key=lambda b: b['start'])
tl = []
for i, b in enumerate(batches):
    b['films'] = sorted(b['films'], key=lambda c: order_of(c))
    a, z = b['films'][0], b['films'][-1]
    contiguous = all(int(b['films'][i+1][2:]) - int(b['films'][i][2:]) == 1 for i in range(len(b['films']) - 1))
    rng = a if a == z else (a + ' to ' + z if contiguous else ' and '.join(b['films']) if len(b['films']) == 2 else ', '.join(b['films']))
    public = b['privacy'] == 'public'
    tl.append({
        'order': i, 'state': 'done',
        'when': fmt_et(b['start']),
        'title': ('Went public: ' if public else 'Uploaded, private: ') + rng,
        'detail': str(len(b['films'])) + (' film' if len(b['films']) == 1 else ' films') + ('. Time is the YouTube publish time.' if public else '. Time is the upload time; still private.'),
        'films': ','.join(b['films']),
    })
# Status lines from Miz's replies and the repo (Oct 27). Times are the message and commit times.
n0 = len(tl)
tl.append({'order': n0, 'state': 'done', 'when': 'Oct 27, 3:58 pm ET', 'title': 'Pilot look approved: fl01 to fl05, fs01 to fs05',
    'detail': 'Miz approved the new look (palettes signal, phosphor, riso, swiss, newsprint). The fs02 tag and the EP 102 / EP 105 thumbnail corner labels are left as they are.', 'films': ''})
tl.append({'order': n0 + 1, 'state': 'done', 'when': 'Oct 27, 3:59 pm ET', 'title': 'Series repo pushed: 18b2f08',
    'detail': 'Source for the ten new films (scripts, scenes, fixtures, tests, kits). Narration audio, rendered video, thumbnails and captions stay local and are not in the repo.', 'films': ''})
n0 += 2
private_now = [c for c, v in snap['films'].items() if v['privacy'] != 'public']
private_ff = [c for c in private_now if c.startswith('ff')]
# Approved by Miz: ff61..ff77 (Oct 26 evening) and ff78 + ff97 (Oct 26, 11 pm ET). Everything else stays private until a fresh yes.
first = [c for c in private_ff if 61 <= int(c[2:]) <= 77]
if first:
    tl.append({'order': n0, 'state': 'scheduled', 'when': 'Oct 27, 3:10 am ET (planned)',
        'title': 'Go public: ' + first[0] + ' to ' + first[-1],
        'detail': 'Approved by Miz on Oct 26. YouTube refused further changes after the daily upload quota ran out on Oct 26; a resume job runs after the reset (midnight Pacific).',
        'films': ','.join(first)})
    n0 += 1
held = [c for c in private_ff if int(c[2:]) >= 78]
if held:
    tl.append({'order': n0, 'state': 'scheduled', 'when': 'Waiting for your yes',
        'title': 'Held private: ' + held[0] + ' to ' + held[-1],
        'detail': str(len(held)) + ' films uploaded private with thumbnails and playlist entries. Miz approved ff78 and ff97 only (Oct 26, 11 pm ET); the rest need a fresh yes.',
        'films': ','.join(held)})
    n0 += 1
new_private = sorted(c for c in private_now if c[:2] in ('fl', 'fs'))
if new_private:
    tl.append({'order': n0, 'state': 'scheduled', 'when': 'Waiting for your yes',
        'title': 'Held private: ' + new_private[0] + ' to ' + new_private[-1],
        'detail': str(len(new_private)) + ' films uploaded private into the playlist FFmpeg Reality Checks: Long Films and Shorts. Publishing needs a fresh yes (--publish --confirm-public).',
        'films': ','.join(new_private)})
    n0 += 1
tl.append({'order': n0, 'state': 'scheduled', 'when': 'Queued for later, by hand',
    'title': 'Pinned comments for fl01 to fs08', 'detail': 'YouTube has no API to pin a comment. The sixteen texts are in the Pinned comments section below; paste and pin them in Studio.', 'films': ''})
tl.append({'order': n0 + 1, 'state': 'scheduled', 'when': 'Queued for later, by hand',
    'title': 'End screens: the sixteen new films, then ff01 to ff25', 'detail': 'Studio only. The 70 end screens on ff26 to ff97 are listed in the End screens section.', 'films': ''})
tl.append({'order': n0 + 2, 'state': 'scheduled', 'when': 'Open',
    'title': 'Engine commits 8aaa9e5 and 6a81fdc are not pushed to the engine remote', 'detail': 'The long-film and Shorts support, palettes, thumbnail system v2 and the end-card title option exist in the working copy only.', 'films': ''})
n0 += 3
building = sorted(f['code'] for f in films if f['status'] == 'in production')
if building:
    tl.append({'order': n0, 'state': 'building', 'when': 'In production',
        'title': 'Build and test: ' + building[0] + ' to ' + building[-1],
        'detail': str(len(building)) + ' films in the next batch. Built private only; publishing needs a fresh yes.',
        'films': ','.join(building)})
    n0 += 1
# Other series (Future of Web, Agent Trust Checks): rows come from their own repos next to this one.
OTHER = [('wl', 'ws', 'Future of Web: Emerging Tech Explained', 'future-of-web'), ('al', 'as', 'Agent Trust Checks', 'agent-trust-checks')]
snap_o = json.loads((dash / 'snapshot_other.json').read_text()) if (dash / 'snapshot_other.json').exists() else {}
tests_o = json.loads((dash / 'tests_other.json').read_text()) if (dash / 'tests_other.json').exists() else {}
others = []
for lp, sp_, sname, repo in OTHER:
    rd = root.parent / repo
    if not (rd / 'episodes').exists():
        continue
    for d in sorted(p_ for p_ in (rd / 'episodes').iterdir() if p_.is_dir() and re.fullmatch(r'(' + lp + '|' + sp_ + r')\d\d', p_.name)):
        code = d.name
        s = json.loads((d / 'script.json').read_text())
        st = snap_o.get(code)
        dist = d / 'content' / 'distribution.md'
        pm = re.search(r'### Pinned comment[^\n]*\n+(.+?)(?:\n\n|\n#|\Z)', dist.read_text(), re.S) if dist.exists() else None
        jp = dash / 'thumbs' / (code + '.jpg')
        t_ = tests_o.get(code, {})
        others.append({
            'code': code, 'series': sname, 'kind': 'long' if code.startswith(lp) else 'short',
            'ord': (0 if lp == 'wl' else 100) + (0 if code.startswith(lp) else 50) + int(code[2:]),
            'question': s['title'], 'video_title': s['fullTitle'], 'palette': s.get('palette', ''),
            'scenes': len(s.get('scenes', [])), 'words': sum(len(sc.get('narration', '').split()) for sc in s.get('scenes', [])),
            'tests': t_.get('tests'), 'tests_failed': t_.get('fail'),
            'status': ('public' if st['privacy'] == 'public' else 'private') if st else 'in production',
            'seconds': st['seconds'] if st else None, 'views': st['views'] if st else None, 'likes': st['likes'] if st else None,
            'length': (str(st['seconds'] // 60) + ':' + str(st['seconds'] % 60).zfill(2)) if st else '',
            'published': fmt_et(st['at']) if st else '',
            'published_kind': ('went public' if st['privacy'] == 'public' else 'uploaded, private') if st else '',
            'video_id': st['videoId'] if st else '', 'url': ('https://youtu.be/' + st['videoId']) if st else '',
            'pinned': pm.group(1).strip() if pm else '', 'repo': 'github.com/mizcausevic-dev/' + repo,
            'thumb': ('data:image/jpeg;base64,' + base64.b64encode(jp.read_bytes()).decode()) if jp.exists() else '',
        })
(out / 'otherfilms.json').write_text(json.dumps(others, separators=(',', ':')))
extra = []
for lp, sp_, sname, repo in OTHER:
    for priv in ('public', 'private'):
        grp = sorted([(c, v) for c, v in snap_o.items() if c[:2] in (lp, sp_) and v['privacy'] == priv], key=lambda kv: kv[1]['at'])
        cur = None
        for c, v in grp:
            if cur and (et(v['at']) - et(cur['end'])).total_seconds() <= 45 * 60:
                cur['codes'].append(c); cur['end'] = v['at']
            else:
                cur = {'start': v['at'], 'end': v['at'], 'codes': [c], 'series': sname, 'priv': priv}; extra.append(cur)
extra.sort(key=lambda b: b['start'])
first_sched = next((i for i, b in enumerate(tl) if b['state'] != 'done'), len(tl))
tl[first_sched:first_sched] = [{'order': 0, 'state': 'done', 'when': fmt_et(b['start']),
    'title': ('Went public: ' if b['priv'] == 'public' else 'Uploaded, private: ') + b['series'] + ' ' + ', '.join(sorted(b['codes'])),
    'detail': str(len(b['codes'])) + (' film' if len(b['codes']) == 1 else ' films') + ('. Time is the YouTube publish time.' if b['priv'] == 'public' else '. Time is the upload time; still private.'), 'films': ''} for b in extra]
# done items in time order (the when text is Eastern, 'Oct 27, 5:41 pm ET')
def _when(b):
    return datetime.datetime.strptime('2026 ' + b['when'].replace(' ET', '').replace(',', ''), '%Y %b %d %I:%M %p')
_done = sorted([b for b in tl if b['state'] == 'done'], key=_when)
tl[:] = _done + [b for b in tl if b['state'] != 'done']
for i, b in enumerate(tl):
    b['order'] = i
n0 = len(tl)
tl.append({'order': n0, 'state': 'scheduled', 'when': 'Oct 29, 9:00 am ET (reminder)',
    'title': 'Analytics API and OAuth scope', 'detail': 'Decision needed: extend the YouTube login with the analytics read scope (needs your explicit yes).', 'films': ''})
(out / 'timeline.json').write_text(json.dumps(tl, indent=1))
(out / 'traffic.json').write_text(json.dumps(traffic, indent=1))
(out / 'queue.json').write_text(json.dumps(queue, indent=1))
(out / 'limits.json').write_text(json.dumps(limits, indent=1))
print(f'films {len(films)}  public {sum(f["status"]=="public" for f in films)}  tests {sum(f["tests"] or 0 for f in films)}  queue {len(queue)}  limits {len(limits)}')
