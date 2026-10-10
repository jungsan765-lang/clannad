"""Read-only arithmetic; no Runtime fights or natural acquisition claims.

Exact 0.16.23 source/runtime_enhancement.js inputs copied below. Expected
first passage costs include HOLD and DOWN (one current enhancement level).
Does not include cap ascension, recipes, ingredient acquisition, or travel.
"""
import json

SUCCESS = [0, 10000, 9500, 9000, 8500, 8000, 7000, 6000, 5000, 4000, 3000]
DOWN = [0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 100]
MORA = [0, 80, 120, 180, 390, 760, 1375, 2400, 4400, 7500, 12000]
IRON = [0, 1, 2, 3, 6, 10, 15, 0, 0, 0, 0]
WHITE = [0, 0, 0, 0, 0, 2, 5, 9, 16, 25, 36]
CRYSTAL = [0, 0, 0, 0, 0, 0, 0, 3, 8, 15, 24]


def solve(matrix, rhs):
    """Gaussian elimination with pivoting, using only Python stdlib."""
    a = [row[:] + [float(value)] for row, value in zip(matrix, rhs)]
    n = len(a)
    for col in range(n):
        pivot = max(range(col, n), key=lambda row: abs(a[row][col]))
        a[col], a[pivot] = a[pivot], a[col]
        divisor = a[col][col]
        if abs(divisor) < 1e-12:
            raise ValueError("singular transition matrix")
        a[col] = [v / divisor for v in a[col]]
        for row in range(n):
            if row == col:
                continue
            factor = a[row][col]
            a[row] = [x - factor * y for x, y in zip(a[row], a[col])]
    return [row[-1] for row in a]


def expected(cap, costs):
    matrix = [[0.0] * cap for _ in range(cap)]
    for level in range(cap):
        target = level + 1
        up, down = SUCCESS[target] / 10000, DOWN[target] / 10000
        matrix[level][level] = up + down
        if level + 1 < cap:
            matrix[level][level + 1] = -up
        if level:
            matrix[level][level - 1] = -down
    return solve(matrix, [costs[level + 1] for level in range(cap)])[0]


def main():
    resources = {"mora": MORA, "attempts": [1] * 11,
                 "iron": IRON, "white_iron": WHITE, "crystal": CRYSTAL}
    result = {
        "scope": "arithmetic only; exact success/hold/down costs; no actual fights or campaign",
        "source_sha256": "87f2a730364a25d69b0c0fa60bad3cdc9fec6563589a7118d9a2085384a4bd8b",
        "inputs": {"success_bp": SUCCESS, "down_bp": DOWN, "resources": resources},
        "enhancement": {str(cap): {name: expected(cap, costs)
                                   for name, costs in resources.items()}
                        for cap in (3, 6, 9, 10)},
        "artifact_0_to_5": {
            "mora": sum(cost / chance for cost, chance in
                        zip((400, 700, 1200, 2000, 3500), (.9, .75, .55, .35, .2))),
            "crystals": sum(cost / chance for cost, chance in
                            zip((1, 1, 2, 3, 4), (.9, .75, .55, .35, .2))),
            "assumed_mean_crystals_per_successful_azhdaha_win": 3,
        },
    }
    result["artifact_0_to_5"]["successful_wins_quantity_expectation"] = (
        result["artifact_0_to_5"]["crystals"] / 3)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
