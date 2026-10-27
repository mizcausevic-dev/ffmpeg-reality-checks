#!/usr/bin/env python3
"""Build the dashboard datasets for the FFmpeg Reality Checks ledger.

Reads (all in this repo):
  episodes/ffNN/script.json   title, fullTitle, thumb, narration
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
    'ff76': 'format=gray on a bt709 file keeps the file luma on 6.1.1 (red 55) and uses the 601 weights on 8.1.2 (red 76).',
}
# Films measured on 6.1.1 only (the first 25 films were not re-run on 8.1.2).
BOTH_FROM = 26
# Films whose build-dependent claims are asserted on 6.1.1 only; 8.1.2 ran the build-independent checks.
PARTIAL = {'ff51','ff52','ff53','ff54','ff55','ff56','ff57'}
# Films whose path grid needs file names Windows cannot hold: measured on 6.1.1 only.
LINUX_ONLY = {'ff60'}

films = []
for d in sorted((root / 'episodes').glob('ff[0-9][0-9]')):
    code = d.name
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
        'builds': '6.1.1 (8.1.2 partly)' if code in PARTIAL else ('6.1.1 only (tests skip on Windows)' if code in LINUX_ONLY else None) or ('6.1.1 and 8.1.2' if n >= BOTH_FROM else '6.1.1'),
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
        'end_note': es.get('note', ''),
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
# Thumbnails: dashboard/thumbs/ffNN.jpg (320 px wide, from episodes/ffNN/thumbnail.png), embedded as data URLs in the film rows.
for f in films:
    jp = dash / 'thumbs' / (f['code'] + '.jpg')
    f['thumb'] = ('data:image/jpeg;base64,' + base64.b64encode(jp.read_bytes()).decode()) if jp.exists() else ''
(out / 'films.json').write_text(json.dumps(films, separators=(',', ':')))

# Timeline: real YouTube times (publishedAt) grouped into batches, plus what is scheduled and in production.
done = sorted([(c, v) for c, v in snap['films'].items() if v.get('at')], key=lambda kv: kv[1]['at'])
batches = []
for c, v in done:
    last = batches[-1] if batches else None
    if last and last['privacy'] == v['privacy'] and (et(v['at']) - et(last['end'])).total_seconds() <= 45 * 60:
        last['films'].append(c); last['end'] = v['at']
    else:
        batches.append({'privacy': v['privacy'], 'start': v['at'], 'end': v['at'], 'films': [c]})
tl = []
for i, b in enumerate(batches):
    a, z = b['films'][0], b['films'][-1]
    rng = a if a == z else a + ' to ' + z
    public = b['privacy'] == 'public'
    tl.append({
        'order': i, 'state': 'done',
        'when': fmt_et(b['start']),
        'title': ('Went public: ' if public else 'Uploaded, private: ') + rng,
        'detail': str(len(b['films'])) + (' film' if len(b['films']) == 1 else ' films') + ('. Time is the YouTube publish time.' if public else '. Time is the upload time; still private.'),
        'films': ','.join(b['films']),
    })
private_now = [c for c, v in snap['films'].items() if v['privacy'] != 'public']
n0 = len(tl)
if private_now:
    tl.append({'order': n0, 'state': 'scheduled', 'when': 'Oct 27, 3:10 am ET (planned)',
        'title': 'Go public: ' + private_now[0] + ' to ' + private_now[-1],
        'detail': 'Approved by Miz on Oct 26. YouTube refused further changes after the daily upload quota ran out on Oct 26; a resume job runs after the reset (midnight Pacific).',
        'films': ','.join(private_now)})
building = sorted(f['code'] for f in films if f['status'] == 'in production')
if building:
    tl.append({'order': n0 + 1, 'state': 'building', 'when': 'In production',
        'title': 'Build and test: ' + building[0] + ' to ' + building[-1],
        'detail': str(len(building)) + ' films in the next batch. Built private only; publishing needs a fresh yes.',
        'films': ','.join(building)})
tl.append({'order': n0 + 2, 'state': 'scheduled', 'when': 'Oct 29, 9:00 am ET (reminder)',
    'title': 'Analytics API and OAuth scope', 'detail': 'Decision needed: extend the YouTube login with the analytics read scope (needs your explicit yes).', 'films': ''})
(out / 'timeline.json').write_text(json.dumps(tl, indent=1))
(out / 'traffic.json').write_text(json.dumps(traffic, indent=1))
(out / 'queue.json').write_text(json.dumps(queue, indent=1))
(out / 'limits.json').write_text(json.dumps(limits, indent=1))
print(f'films {len(films)}  public {sum(f["status"]=="public" for f in films)}  tests {sum(f["tests"] or 0 for f in films)}  queue {len(queue)}  limits {len(limits)}')
