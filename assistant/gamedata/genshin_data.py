"""원신 계정 정보: 게임 프로그램은 건드리지 않고 공개·공식 통로로만 받는다.

- 캐릭터 진열장: Enka.Network (UID 만 있으면 됨, 공개 정보)
- 실시간 메모(레진·일일 의뢰·탐사 파견·주전자 동전): HoYoLAB (주인님 로그인 정보, genshin.py)
- 기원 기록: 게임 안에서 기원 기록을 열면 남는 주소(authkey)로 공식 기록 조회 (genshin.py).
  공식 기록은 최근 6개월만 주므로 받은 것을 data/genshin/wishes.json 에 계속 쌓는다.

받은 내용은 다니카가 읽을 한국어 요약(context_text)과 먼저 알려 줄 일(alerts)로 바꾼다.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable

log = logging.getLogger("assistant.genshin")

ENKA_API = "https://enka.network/api/uid/{uid}/"
ENKA_STORE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/{name}"
STORE_FILES = {"avatars.json": "gi/avatars.json", "locs.json": "gi/locs.json", "loc.json": "loc.json"}
USER_AGENT = "danika-assistant/1.0"

ELEMENTS = {"Fire": "불", "Water": "물", "Wind": "바람", "Electric": "번개", "Grass": "풀", "Ice": "얼음", "Rock": "바위"}
WEAPONS = {"WEAPON_SWORD_ONE_HAND": "한손검", "WEAPON_CLAYMORE": "양손검", "WEAPON_POLE": "장병기",
           "WEAPON_BOW": "활", "WEAPON_CATALYST": "법구"}
DMG_BONUS = {"30": "물리", "40": "불", "41": "번개", "42": "물", "43": "풀", "44": "바람", "45": "바위", "46": "얼음"}
PROPS = {
    "FIGHT_PROP_HP": "생명력", "FIGHT_PROP_HP_PERCENT": "생명력%", "FIGHT_PROP_ATTACK": "공격력",
    "FIGHT_PROP_ATTACK_PERCENT": "공격력%", "FIGHT_PROP_DEFENSE": "방어력", "FIGHT_PROP_DEFENSE_PERCENT": "방어력%",
    "FIGHT_PROP_CRITICAL": "치명타 확률", "FIGHT_PROP_CRITICAL_HURT": "치명타 피해", "FIGHT_PROP_CHARGE_EFFICIENCY": "원소 충전 효율",
    "FIGHT_PROP_ELEMENT_MASTERY": "원소 마스터리", "FIGHT_PROP_HEAL_ADD": "치유 보너스", "FIGHT_PROP_BASE_ATTACK": "기초 공격력",
    "FIGHT_PROP_PHYSICAL_ADD_HURT": "물리 피해 보너스", "FIGHT_PROP_FIRE_ADD_HURT": "불 원소 피해 보너스",
    "FIGHT_PROP_ELEC_ADD_HURT": "번개 원소 피해 보너스", "FIGHT_PROP_WATER_ADD_HURT": "물 원소 피해 보너스",
    "FIGHT_PROP_GRASS_ADD_HURT": "풀 원소 피해 보너스", "FIGHT_PROP_WIND_ADD_HURT": "바람 원소 피해 보너스",
    "FIGHT_PROP_ROCK_ADD_HURT": "바위 원소 피해 보너스", "FIGHT_PROP_ICE_ADD_HURT": "얼음 원소 피해 보너스",
}
SLOTS = {"EQUIP_SHOES": "시계", "EQUIP_RING": "성배", "EQUIP_DRESS": "왕관"}
# 301 로 물으면 캐릭터 이벤트 기원 두 개(301·400)가 함께 나온다
BANNERS = {301: "캐릭터 이벤트 기원", 302: "무기 이벤트 기원", 200: "상시 기원", 500: "집록 기원"}
COOKIE_NAMES = ("ltuid_v2", "ltoken_v2", "ltmid_v2", "account_id_v2", "account_mid_v2", "cookie_token_v2")


def http_json(url: str, timeout: float = 20.0) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _pct(v: float) -> str:
    return f"{v * 100:.1f}%"


def _dur(td: timedelta | None) -> str:
    if td is None:
        return "?"
    m = int(td.total_seconds() // 60)
    return f"{m // 60}시간 {m % 60}분" if m >= 60 else f"{m}분"


def _ago(ts: float | None, now: float) -> str:
    if not ts:
        return "아직 못 받음"
    m = int((now - ts) // 60)
    return "방금" if m < 1 else (f"{m}분 전" if m < 60 else f"{m // 60}시간 전")


# ---------------------------------------------------------------- 진열장 (Enka)

@dataclass
class Store:
    avatars: dict
    names: dict  # 해시 → 한국어 이름 (캐릭터·무기·성유물 세트)

    def name(self, h) -> str:
        return self.names.get(str(h), "")


def load_store(folder: Path, fetch: Callable[[str], dict] = http_json, max_age_days: float = 7) -> Store:
    """Enka 데이터(캐릭터 정보·한국어 이름)를 받아 두고 일주일마다 새로 받는다."""
    folder.mkdir(parents=True, exist_ok=True)
    data = {}
    for local, remote in STORE_FILES.items():
        path = folder / local
        fresh = path.is_file() and time.time() - path.stat().st_mtime < max_age_days * 86400
        if not fresh:
            try:
                path.write_text(json.dumps(fetch(ENKA_STORE.format(name=remote)), ensure_ascii=False), encoding="utf-8")
            except Exception as exc:  # noqa: BLE001 - 못 받으면 예전 것을 쓴다
                log.warning("Enka 데이터를 받지 못함 (%s): %s", local, exc)
        try:
            data[local] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data[local] = {}
    names = dict(data["loc.json"].get("ko", {}))
    names.update(data["locs.json"].get("ko", {}))
    return Store(data["avatars.json"], names)


def showcase_summary(raw: dict, store: Store) -> str:
    pi = raw.get("playerInfo", {})
    head = (f"진열장 (모험 등급 {pi.get('level', '?')}, 세계 레벨 {pi.get('worldLevel', '?')}"
            + (f", 나선 비경 {pi['towerFloorIndex']}-{pi.get('towerLevelIndex', '?')}" if pi.get("towerFloorIndex") else "")
            + (f", 닉네임 {pi['nickname']}" if pi.get("nickname") else "") + ")")
    avatars = raw.get("avatarInfoList") or []
    if not avatars:
        return head + ": 캐릭터 진열장이 비어 있거나 상세 보기가 꺼져 있음"
    lines = [head]
    for a in avatars:
        info = store.avatars.get(str(a.get("avatarId")), {})
        name = store.name(info.get("NameTextMapHash")) or f"캐릭터 {a.get('avatarId')}"
        level = a.get("propMap", {}).get("4001", {}).get("val", "?")
        cons = len(a.get("talentIdList") or [])
        f = a.get("fightPropMap", {})
        stats = (f"생명력 {f.get('2000', 0):.0f} · 공격력 {f.get('2001', 0):.0f} · 방어력 {f.get('2002', 0):.0f} · "
                 f"치확 {_pct(f.get('20', 0))} · 치피 {_pct(f.get('22', 0))} · 원충 {_pct(f.get('23', 0))} · "
                 f"원마 {f.get('28', 0):.0f}")
        bonus = max(((k, f.get(k, 0)) for k in DMG_BONUS), key=lambda kv: kv[1])
        if bonus[1] > 0.001:
            stats += f" · {DMG_BONUS[bonus[0]]} 피해 {_pct(bonus[1])}"
        weapon, sets, mains = "", {}, []
        for e in a.get("equipList", []):
            flat = e.get("flat", {})
            if flat.get("itemType") == "ITEM_WEAPON":
                refine = (next(iter(e.get("weapon", {}).get("affixMap", {}).values()), 0) or 0) + 1
                weapon = (f"{store.name(flat.get('nameTextMapHash')) or '무기'} Lv{e.get('weapon', {}).get('level', '?')}"
                          f" {refine}재련")
            elif flat.get("itemType") == "ITEM_RELIQUARY":
                s = store.name(flat.get("setNameTextMapHash")) or "?"
                sets[s] = sets.get(s, 0) + 1
                slot = SLOTS.get(flat.get("equipType", ""))
                if slot:
                    mains.append(f"{slot} {PROPS.get(flat.get('reliquaryMainstat', {}).get('mainPropId'), '?')}")
        set_text = ", ".join(f"{s} {n}" for s, n in sorted(sets.items(), key=lambda kv: -kv[1]) if n >= 2) or "세트 없음"
        kind = f"{ELEMENTS.get(info.get('Element'), '?')}·{WEAPONS.get(info.get('WeaponType'), '?')}"
        lines.append(f"  · {name} Lv{level} {cons}돌 ({kind}) / {weapon or '무기 정보 없음'} / {stats} / "
                     f"성유물 {set_text} / {', '.join(mains)}")
    return "\n".join(lines)


# ---------------------------------------------------------------- 기원 기록

def pity_summary(wishes: dict[str, list[dict]]) -> str:
    parts, recent = [], []
    for key, label in BANNERS.items():
        items = sorted(wishes.get(str(key), []), key=lambda w: int(w["id"]))
        if not items:
            continue
        since5 = next((i for i, w in enumerate(reversed(items)) if w["rarity"] == 5), len(items))
        since4 = next((i for i, w in enumerate(reversed(items)) if w["rarity"] == 4), len(items))
        parts.append(f"{label}: 마지막 5성 뒤 {since5}번, 4성 뒤 {since4}번 (기록 {len(items)}번)")
        recent += [(w["time"], w["name"], label) for w in items if w["rarity"] == 5]
    if not parts:
        return ""
    text = "기원: " + " / ".join(parts)
    if recent:
        recent.sort(reverse=True)
        text += "\n  최근 5성: " + ", ".join(f"{n}({t[:10]}, {b})" for t, n, b in recent[:5])
    return text


# ---------------------------------------------------------------- 전체

class GenshinData:
    def __init__(self, folder: Path, uid: str = "", cookies: Callable[[], dict | None] = lambda: None,
                 fetch: Callable[[str], dict] = http_json, clock: Callable[[], float] = time.time):
        self.folder = folder
        self.uid = str(uid or "").strip()
        self.cookies = cookies
        self.fetch = fetch
        self.clock = clock
        self._lock = threading.Lock()
        self.store: Store | None = None
        self.showcase_text = ""
        self.showcase_at: float | None = None
        self.showcase_next = 0.0  # Enka 가 알려 준 ttl 이 지나기 전엔 다시 묻지 않는다
        self.notes = None
        self.notes_at: float | None = None
        self.last_error: dict[str, str] = {}
        self.alerted: dict[str, float] = {}
        self.wishes: dict[str, list[dict]] = self._read("wishes.json", {})

    # ------------------------------------------------------------ 상태

    @property
    def has_uid(self) -> bool:
        return self.uid.isdigit() and 9 <= len(self.uid) <= 10

    @property
    def has_login(self) -> bool:
        c = self.cookies() or {}
        return bool(c.get("ltuid_v2") and c.get("ltoken_v2"))

    def _read(self, name: str, default):
        try:
            return json.loads((self.folder / name).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return default

    def _write(self, name: str, value) -> None:
        self.folder.mkdir(parents=True, exist_ok=True)
        tmp = self.folder / (name + ".tmp")
        tmp.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.folder / name)

    # ------------------------------------------------------------ 받기 (뒤에서 실행)

    def refresh_showcase(self, force: bool = False) -> bool:
        if not self.has_uid or (not force and self.clock() < self.showcase_next):
            return False
        if self.store is None:
            self.store = load_store(self.folder / "enka", self.fetch)
        try:
            raw = self.fetch(ENKA_API.format(uid=self.uid))
        except Exception as exc:  # noqa: BLE001
            self.last_error["showcase"] = _enka_error(exc)
            self.showcase_next = self.clock() + 300
            log.warning("진열장 받기 실패: %s", exc)
            return False
        self.showcase_text = showcase_summary(raw, self.store)
        self.showcase_at = self.clock()
        self.showcase_next = self.clock() + max(60, int(raw.get("ttl", 60)))
        self.last_error.pop("showcase", None)
        return True

    def refresh_notes(self) -> bool:
        if not (self.has_uid and self.has_login):
            return False
        try:
            import genshin

            async def go():
                client = genshin.Client(self.cookies(), lang="ko-kr", game=genshin.Game.GENSHIN)
                return await client.get_genshin_notes(int(self.uid), autoauth=False)  # 계정 설정은 바꾸지 않는다

            notes = asyncio.run(go())
        except Exception as exc:  # noqa: BLE001
            self.last_error["notes"] = _hoyolab_error(exc)
            log.warning("실시간 메모 받기 실패: %r", exc)
            return False
        with self._lock:
            self.notes, self.notes_at = notes, self.clock()
        self.last_error.pop("notes", None)
        return True

    def refresh_wishes(self, max_new: int = 3000) -> int:
        """게임에서 기원 기록을 연 적이 있으면 새 기록만 받아 쌓는다. 받은 개수."""
        try:
            import genshin

            authkey = genshin.utility.get_authkey(game=genshin.Game.GENSHIN)
        except Exception as exc:  # noqa: BLE001 - 기록 주소가 없음, 게임이 파일을 잡고 있음 등
            self.last_error["wishes"] = "게임 안에서 기원 → 기록을 한 번 열어 주세요."
            log.info("기원 기록 주소를 찾지 못함: %r", exc)
            return 0

        async def go():
            client = genshin.Client(lang="ko-kr", game=genshin.Game.GENSHIN, authkey=authkey)
            added: dict[str, list[dict]] = {}
            for banner in BANNERS:
                known = {str(w["id"]) for w in self.wishes.get(str(banner), [])}
                got = []
                async for w in client.wish_history(banner, authkey=authkey, lang="ko-kr"):
                    if str(w.id) in known or len(got) >= max_new:
                        break
                    got.append({"id": str(w.id), "name": w.name, "rarity": int(w.rarity), "type": w.type,
                                "time": w.time.isoformat()})
                added[str(banner)] = got
            return added

        try:
            added = asyncio.run(go())
        except Exception as exc:  # noqa: BLE001
            self.last_error["wishes"] = "기원 기록 주소가 만료됐어요. 게임에서 기원 기록을 다시 열어 주세요."
            log.warning("기원 기록 받기 실패: %r", exc)
            return 0
        count = 0
        with self._lock:
            for key, items in added.items():
                if items:
                    self.wishes.setdefault(key, []).extend(items)
                    count += len(items)
            self._write("wishes.json", self.wishes)
        self.last_error.pop("wishes", None)
        log.info("기원 기록 %d개 새로 받음", count)
        return count

    # ------------------------------------------------------------ 다니카에게 줄 글

    def notes_text(self) -> str:
        n = self.notes
        if n is None:
            return ""
        done = sum(1 for e in n.expeditions if e.status == "Finished")
        full = _dur(n.remaining_resin_recovery_time) if n.current_resin < n.max_resin else "이미 가득"
        return (f"실시간 메모 ({_ago(self.notes_at, self.clock())}): 레진 {n.current_resin}/{n.max_resin} (가득 차기까지 {full}), "
                f"일일 의뢰 {n.completed_commissions}/{n.max_commissions}"
                f"{' (보상 받음)' if n.claimed_commission_reward else ' (보상 아직)'}, "
                f"탐사 파견 {len(n.expeditions)}개 중 완료 {done}개, 주전자 동전 {n.current_realm_currency}/{n.max_realm_currency}, "
                f"주간 보스 할인 남은 {n.remaining_resin_discounts}번")

    def context_text(self) -> str:
        parts = [p for p in (self.notes_text(), pity_summary(self.wishes),
                             (f"{self.showcase_text}\n  (진열장 정보 {_ago(self.showcase_at, self.clock())})"
                              if self.showcase_text else "")) if p]
        if not parts:
            return ""
        return "[주인님 원신 계정 정보 (실제 데이터. 이 숫자를 근거로 말하고, 없는 건 지어내지 않는다)]\n- " + "\n- ".join(parts)

    def alerts(self, now: datetime | None = None) -> list[str]:
        """먼저 알려 드릴 일 (같은 일은 정해진 시간 안에 다시 알리지 않음)."""
        n = self.notes
        if n is None:
            return []
        now = now or datetime.now()
        t = self.clock()
        out = []

        def once(key: str, hours: float, text: str) -> None:
            if t - self.alerted.get(key, -1e18) >= hours * 3600:
                self.alerted[key] = t
                out.append(text)

        if n.current_resin >= n.max_resin - 12:
            once("resin", 4, f"레진이 {n.current_resin}/{n.max_resin}이라 곧 넘친다(넘치면 낭비).")
        if n.max_realm_currency and n.current_realm_currency >= n.max_realm_currency:
            once("coin", 24, f"주전자 동전이 {n.current_realm_currency}/{n.max_realm_currency}로 가득 찼다.")
        if n.expeditions and all(e.status == "Finished" for e in n.expeditions):
            once("expedition", 6, f"탐사 파견 {len(n.expeditions)}개가 모두 끝났다.")
        if (now.hour >= 22 or now.hour < 4) and n.completed_commissions < n.max_commissions:
            once("commission", 20, f"오늘 일일 의뢰가 {n.completed_commissions}/{n.max_commissions}이다(새벽 5시 초기화).")
        elif (now.hour >= 20 or now.hour < 4) and n.completed_commissions >= n.max_commissions \
                and not getattr(n, "claimed_commission_reward", True):
            once("commission_reward", 20, "일일 의뢰는 다 했는데 캐서린에게 보상을 아직 안 받았다(새벽 5시 초기화).")
        weekly_day = (now - timedelta(hours=5)).weekday()  # 월요일 새벽 5시 초기화 기준 요일
        if weekly_day == 6 and now.hour >= 20 and getattr(n, "remaining_resin_discounts", 0) > 0:
            once("weekly_boss", 20, f"주간 보스 레진 할인이 {n.remaining_resin_discounts}번 남았다(월요일 새벽 5시 초기화).")
        return out


def _enka_error(exc: Exception) -> str:
    code = getattr(exc, "code", None)
    return {400: "UID 형식이 틀렸어요.", 404: "그 UID 의 계정을 찾지 못했어요.", 424: "게임 점검 중이라 진열장을 못 받아요.",
            429: "요청이 많아 잠시 뒤에 다시 받을게요."}.get(code, f"진열장을 받지 못했어요: {exc}")


def _hoyolab_error(exc: Exception) -> str:
    name = type(exc).__name__
    if "InvalidCookies" in name or "CookieException" in name:
        return "HoYoLAB 로그인이 풀렸어요. 설정에서 다시 로그인해 주세요."
    if "DataNotPublic" in name or "not enabled" in str(exc):
        return "HoYoLAB 에서 '실시간 메모' 공개가 꺼져 있어요. HoYoLAB → 전적 → 설정에서 켜 주세요."
    return f"실시간 메모를 받지 못했어요: {exc}"
