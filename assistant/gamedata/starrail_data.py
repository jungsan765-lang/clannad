"""붕괴: 스타레일 계정 정보: 원신과 같은 HoYoLAB 로그인으로 공식 통로에서만 받는다 (게임 프로그램은 건드리지 않음).

- 실시간 메모(개척력·예비 개척력·일일 훈련·주간 우주 점수·전쟁의 여운 할인·의뢰 파견): HoYoLAB (genshin.py)
- 워프 기록: 게임 안에서 워프 기록을 열면 남는 주소(authkey)로 공식 기록 조회. 최근 6개월만 주니 data/starrail/wishes.json 에 쌓는다.

원신 쪽(GenshinData)과 받는 방법·저장 방식이 같아서 그것을 이어 쓰고, 스타레일에 맞는 부분만 바꾼다.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from gamedata.genshin_data import GenshinData, _ago, _dur, _hoyolab_error, pity_summary

log = logging.getLogger("assistant.starrail")

# 워프 종류 (genshin.py StarRailBannerType 번호)
WARPS = {11: "캐릭터 이벤트 워프", 12: "광추 이벤트 워프", 1: "상시 워프"}


class StarRailData(GenshinData):
    """GenshinData 와 같은 모양 (has_uid·has_login·notes·last_error·alerts·context_text)."""

    def refresh_showcase(self, force: bool = False) -> bool:
        return False  # 진열장은 아직 안 받음 (실시간 메모·워프 기록만)

    def refresh_notes(self) -> bool:
        if not (self.has_uid and self.has_login):
            return False
        try:
            import genshin

            async def go():
                client = genshin.Client(self.cookies(), lang="ko-kr", game=genshin.Game.STARRAIL)
                return await client.get_starrail_notes(int(self.uid), autoauth=False)  # 계정 설정은 바꾸지 않는다

            notes = asyncio.run(go())
        except Exception as exc:  # noqa: BLE001
            self.last_error["notes"] = _hoyolab_error(exc).replace("실시간 메모", "스타레일 실시간 메모", 1)
            log.warning("스타레일 실시간 메모 받기 실패: %r", exc)
            return False
        with self._lock:
            self.notes, self.notes_at = notes, self.clock()
        self.last_error.pop("notes", None)
        return True

    def refresh_wishes(self, max_new: int = 3000) -> int:
        """게임에서 워프 기록을 연 적이 있으면 새 기록만 받아 쌓는다. 받은 개수."""
        try:
            import genshin

            authkey = genshin.utility.get_authkey(game=genshin.Game.STARRAIL)
        except Exception as exc:  # noqa: BLE001 - 기록 주소가 없음, 게임이 파일을 잡고 있음 등
            self.last_error["wishes"] = "게임 안에서 워프 → 기록을 한 번 열어 주세요."
            log.info("워프 기록 주소를 찾지 못함: %r", exc)
            return 0

        async def go():
            client = genshin.Client(lang="ko-kr", game=genshin.Game.STARRAIL, authkey=authkey)
            added: dict[str, list[dict]] = {}
            for banner in WARPS:
                known = {str(w["id"]) for w in self.wishes.get(str(banner), [])}
                got = []
                async for w in client.warp_history(banner, authkey=authkey, lang="ko-kr"):
                    if str(w.id) in known or len(got) >= max_new:
                        break
                    got.append({"id": str(w.id), "name": w.name, "rarity": int(w.rarity), "type": w.type,
                                "time": w.time.isoformat()})
                added[str(banner)] = got
            return added

        try:
            added = asyncio.run(go())
        except Exception as exc:  # noqa: BLE001
            self.last_error["wishes"] = "워프 기록 주소가 만료됐어요. 게임에서 워프 기록을 다시 열어 주세요."
            log.warning("워프 기록 받기 실패: %r", exc)
            return 0
        count = 0
        with self._lock:
            for key, items in added.items():
                if items:
                    self.wishes.setdefault(key, []).extend(items)
                    count += len(items)
            self._write("wishes.json", self.wishes)
        self.last_error.pop("wishes", None)
        log.info("워프 기록 %d개 새로 받음", count)
        return count

    # ------------------------------------------------------------ 다니카에게 줄 글

    def notes_text(self) -> str:
        n = self.notes
        if n is None:
            return ""
        done = sum(1 for e in n.expeditions if e.status == "Finished")
        full = _dur(n.stamina_recover_time) if n.current_stamina < n.max_stamina else "이미 가득"
        reserve = f", 예비 개척력 {n.current_reserve_stamina}{' (가득)' if n.is_reserve_stamina_full else ''}"
        weekly = f", 주간 우주 점수 {n.current_rogue_score}/{n.max_rogue_score}" if n.max_rogue_score else ""
        return (f"실시간 메모 ({_ago(self.notes_at, self.clock())}): 개척력 {n.current_stamina}/{n.max_stamina} "
                f"(가득 차기까지 {full}){reserve}, 일일 훈련 {n.current_train_score}/{n.max_train_score}{weekly}, "
                f"의뢰 파견 {len(n.expeditions)}개 중 완료 {done}개, "
                f"전쟁의 여운 할인 남은 {n.remaining_weekly_discounts}/{n.max_weekly_discounts}번")

    def context_text(self) -> str:
        parts = [p for p in (self.notes_text(), pity_summary(self.wishes, WARPS, "워프")) if p]
        if not parts:
            return ""
        return "[주인님 스타레일 계정 정보 (실제 데이터. 이 숫자를 근거로 말하고, 없는 건 지어내지 않는다)]\n- " + "\n- ".join(parts)

    def alerts(self, now: datetime | None = None) -> list[str]:
        """먼저 알려 드릴 일 (같은 일은 정해진 시간 안에 다시 알리지 않음). 초기화는 한국 시간 새벽 5시 기준."""
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

        if n.max_stamina and n.current_stamina >= n.max_stamina - 20:
            once("stamina", 4, f"개척력이 {n.current_stamina}/{n.max_stamina}라 곧 가득 찬다"
                 + (" (예비 개척력도 가득이라 넘치면 낭비)." if n.is_reserve_stamina_full else "."))
        if n.expeditions and all(e.status == "Finished" for e in n.expeditions):
            once("expedition", 6, f"의뢰 파견 {len(n.expeditions)}개가 모두 끝났다.")
        if (now.hour >= 22 or now.hour < 4) and n.max_train_score and n.current_train_score < n.max_train_score:
            once("training", 20, f"오늘 일일 훈련이 {n.current_train_score}/{n.max_train_score}이다(새벽 5시 초기화).")
        weekly_day = (now - timedelta(hours=5)).weekday()  # 월요일 새벽 5시 초기화 기준 요일
        if weekly_day == 6 and now.hour >= 20:
            if n.max_rogue_score and n.current_rogue_score < n.max_rogue_score:
                once("rogue", 20, f"이번 주 우주 점수가 {n.current_rogue_score}/{n.max_rogue_score}이다(월요일 새벽 5시 초기화).")
            if n.remaining_weekly_discounts > 0:
                once("echo", 20, f"전쟁의 여운 할인이 {n.remaining_weekly_discounts}번 남았다(월요일 새벽 5시 초기화).")
        return out
