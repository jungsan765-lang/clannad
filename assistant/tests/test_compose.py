import numpy as np

from sprites.compose import compose_sequence, frame_diff, morph, small_rep


def _square(x: int, y: int = 20, size: int = 60) -> np.ndarray:
    f = np.zeros((100, 160, 4), np.uint8)
    f[y : y + 40, x : x + 30] = (220, 60, 60, 255)
    return f


def test_morph_moves_instead_of_ghosting():
    a, b = _square(30), _square(50)
    mids = morph(a, b, 3)
    assert len(mids) == 3
    mid = mids[1]  # t = 0.5 → 대략 x=40 위치에 하나의 네모
    cols = np.nonzero(mid[..., 3].max(axis=0) > 200)[0]
    assert 36 <= cols.min() <= 44 and 66 <= cols.max() <= 74
    # 단순 겹치기라면 30~79 전체가 반투명해짐 → 그렇지 않아야 한다
    assert (mid[..., 3].max(axis=0) > 20).sum() <= 40


def _bob(phase0: float, n: int) -> list[np.ndarray]:
    return [_square(60, int(30 + 8 * np.sin(phase0 + 2 * np.pi * i / 24))) for i in range(n)]


def test_compose_sequence_reaches_length_and_closes_loop():
    parts = [_bob(0.0, 20), _bob(2.0, 18), _bob(4.0, 22)]
    frames, joins = compose_sequence(parts, 150, max_join=6)
    assert len(frames) >= 120
    assert len(joins) >= 3
    first, last = small_rep(frames[0]), small_rep(frames[-1])
    step = frame_diff(small_rep(frames[0]), small_rep(frames[1]))
    assert frame_diff(last, first) <= 3 * max(step, 1e-3)  # 끝에서 처음으로 부드럽게
    assert all(f.shape == frames[0].shape for f in frames)
