#!/usr/bin/env python3
"""Build the dashboard datasets for the FFmpeg Reality Checks ledger.

Reads (all in this repo):
  episodes/ffNN/script.json   title, fullTitle, thumb, narration
  dashboard/snapshot.json     YouTube stats snapshot (ids, seconds, views, likes, privacy) and channel traffic
  dashboard/tests.json        test counts per episode, {ffNN: {tests, pass, fail}}, measured by build
  dashboard/queue.json        the next-episode queue (hand-maintained)
  dashboard/limits.json       upload and quota facts (hand-maintained)

Writes dashboard/out/{films,traffic,queue,limits}.json (row arrays, the shape the dashboard loads).
Usage: python3 dashboard/build_data.py
"""
import json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
dash = root / 'dashboard'
out = dash / 'out'
out.mkdir(exist_ok=True)

snap = json.loads((dash / 'snapshot.json').read_text())
tests = json.loads((dash / 'tests.json').read_text()) if (dash / 'tests.json').exists() else {}
queue = json.loads((dash / 'queue.json').read_text())
limits = json.loads((dash / 'limits.json').read_text())

# Films where the same command gave different results on 6.1.1 and 8.1.2 (found in the tests).
differs = {
    'ff26': 'Black level after -color_range pc: 16 on 6.1.1, 0 on 8.1.2.',
    'ff31': 'Byte count after the hvc1 retag: 2 on 6.1.1, 5 on 8.1.2 (frames unchanged on both).',
    'ff33': '-stream_loop with a short audio track: 355 frames on 6.1.1, 359 on 8.1.2.',
    'ff44': 'Matrix tag after scale=out_color_matrix=bt709: bt2020nc kept on 6.1.1, bt709 on 8.1.2 (pixels identical).',
    'ff45': 'Plain .mov trim: 50 frames with 25 repeats on 6.1.1, 25 frames with a 1 s gap on 8.1.2.',
}
# Films measured on 6.1.1 only (the first 25 films were not re-run on 8.1.2).
BOTH_FROM = 26

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
        'builds': '6.1.1 and 8.1.2' if n >= BOTH_FROM else '6.1.1',
        'build_difference': 'yes' if code in differs else 'no',
        'build_note': differs.get(code, ''),
        'status': 'public' if st and st['privacy'] == 'public' else ('private' if st else 'in production'),
        'seconds': st['seconds'] if st else None,
        'views': st['views'] if st else None,
        'likes': st['likes'] if st else None,
        'video_id': st['videoId'] if st else '',
        'url': ('https://youtu.be/' + st['videoId']) if st else '',
    }
    films.append(row)

traffic = snap['channelTraffic']['sources']
(out / 'films.json').write_text(json.dumps(films, indent=1))
(out / 'traffic.json').write_text(json.dumps(traffic, indent=1))
(out / 'queue.json').write_text(json.dumps(queue, indent=1))
(out / 'limits.json').write_text(json.dumps(limits, indent=1))
print(f'films {len(films)}  public {sum(f["status"]=="public" for f in films)}  tests {sum(f["tests"] or 0 for f in films)}  queue {len(queue)}  limits {len(limits)}')
