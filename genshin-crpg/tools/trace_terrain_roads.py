"""Trace the travel-map routes along the roads drawn on the terrain atlases (0.14.8).

For every active map connection (content/db.json 47_MAP_EDGE_DB) whose two ends are anchored on the same atlas
(source/terrain_map.js points), find the cheapest path across the picture: road pixels (light sandy paths) are cheap,
land is dearer, water and the dark border dearest. The path is simplified to a few waypoints and printed as the
`roads` table of source/terrain_map.js (keyed by the two map ids in sorted order; the anchors are the ends).

usage: python tools/trace_terrain_roads.py > roads.json
Paste the result into CRPGTerrainMap.roads after changing anchors, connections or atlas pictures.
"""
import heapq
import json
import math
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def anchors():
    text = (ROOT / 'source/terrain_map.js').read_text(encoding='utf-8')
    points = {}
    for m in re.finditer(r"(MAP_[A-Z0-9_]+):\[\s*['\"](\w+)['\"]\s*,\s*(\d+)\s*,\s*(\d+)", text):
        points[m.group(1)] = (m.group(2), int(m.group(3)), int(m.group(4)))
    return points


EDGES_JS = r"""
const {fresh}=require(process.argv[1]+'/tests/helpers_v011.cjs');
const r=fresh('MAP_MOND_CITY');r.installMarketContent();
process.stdout.write(JSON.stringify(r.rows('47_MAP_EDGE_DB')));
"""


def connections(points):
    # The game adds connections at start-up (new areas, Liyue places), so ask the engine for the full table.
    rows = json.loads(subprocess.run(['node', '-e', EDGES_JS, str(ROOT)], capture_output=True, text=True, encoding='utf-8', check=True).stdout)
    pairs = {}
    for row in rows:
        if len(row) < 12 or row[8] != 'Y' or row[11] != 'ACTIVE':
            continue
        a, b = points.get(row[1]), points.get(row[2])
        if not a or not b or a[0] != b[0] or (a[1], a[2]) == (b[1], b[2]):
            continue
        first, second = sorted([row[1], row[2]])
        pairs[(first, second)] = a[0]
    return pairs


def classify(r, g, b):
    if r >= 175 and g >= 150 and b >= 95 and 35 <= r - b <= 110 and abs(r - g) <= 45 and r <= 245:
        return 'road'
    if r + g + b < 70:
        return 'void'
    # Water is dark blue-green (red below ~55 in the sea and lakes). Dragonspine's snow and ice are bluish greys with
    # more red; counting them as water sent its roads around the whole mountain.
    if b > r + 15 and g > r and r < 68:
        return 'water'
    return 'land'


# 0.14.13: land was 7.0, which let a route wander up to ~7x farther to stay on drawn paths (user: 「돌아서 가는 길이
# 상식적으로 이해가 안 된다」). At 1.9 a drawn path wins only when it is not much longer; a short ford over a narrow
# inlet now beats going round a whole bay, while lakes and the sea stay out of the way.
COST = {'road': 1.0, 'land': 1.9, 'water': 22.0, 'void': 90.0}


def grid(atlas):
    im = Image.open(ROOT / f'assets/terrain/{atlas}.png').convert('RGB')
    w, h = im.size
    px = im.load()
    kind = [[classify(*px[x, y]) for x in range(w)] for y in range(h)]
    road = [[kind[y][x] == 'road' for x in range(w)] for y in range(h)]
    cost = [[COST[kind[y][x]] for x in range(w)] for y in range(h)]
    for y in range(1, h - 1):  # close one-pixel gaps in the drawn paths
        for x in range(1, w - 1):
            if not road[y][x] and kind[y][x] != 'void' and road[y - 1][x] + road[y + 1][x] + road[y][x - 1] + road[y][x + 1] >= 2:
                cost[y][x] = 1.6
    return w, h, cost


def astar(cost, w, h, start, goal):
    steps = [(1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0), (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
    queue, best, came = [(0.0, 0.0, start)], {start: 0.0}, {}
    while queue:
        _, spent, node = heapq.heappop(queue)
        if node == goal:
            path = [node]
            while node in came:
                node = came[node]
                path.append(node)
            return path[::-1]
        if spent > best.get(node, 1e18):
            continue
        x, y = node
        for dx, dy, d in steps:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                total = spent + d * cost[ny][nx]
                if total < best.get((nx, ny), 1e18):
                    best[(nx, ny)] = total
                    came[(nx, ny)] = node
                    heapq.heappush(queue, (total + math.hypot(goal[0] - nx, goal[1] - ny), total, (nx, ny)))
    return None


def simplify(points, eps=2.2):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1.0
    far, index = 0.0, 0
    for i in range(1, len(points) - 1):
        d = abs(dy * (points[i][0] - x1) - dx * (points[i][1] - y1)) / norm
        if d > far:
            far, index = d, i
    if far > eps:
        return simplify(points[:index + 1], eps)[:-1] + simplify(points[index:], eps)
    return [points[0], points[-1]]


def main():
    points = anchors()
    grids, roads = {}, {}
    for (first, second), atlas in sorted(connections(points).items()):
        if atlas not in grids:
            grids[atlas] = grid(atlas)
        w, h, cost = grids[atlas]
        path = astar(cost, w, h, points[first][1:], points[second][1:])
        if path:
            roads[first + '>' + second] = [[x, y] for x, y in simplify(path)[1:-1]]
    json.dump(roads, sys.stdout, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
