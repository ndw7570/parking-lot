"""E2E: 거주민이 무단주차를 접수할 때 상황별 오류 문장 (P005-027).

준비: 로컬 백엔드(:8000)·Vite(:5173), 테스트 DB 의 거주민 계정, pip install playwright, Chrome.
    E2E_USER=res1 E2E_PASSWORD=<로컬 테스트 비밀번호> python e2e/unauthorized_errors.py
운영 서버·실제 계정으로 돌리지 않는다(무단 기록이 실제로 생긴다).
"""
import re
import sys
import os
import tempfile
import time

sys.stdout.reconfigure(encoding="utf-8")
from playwright.sync_api import sync_playwright

B = os.environ.get("E2E_BASE", "http://127.0.0.1:5173")
SHOTS = r"C:\tmp\p005\shots"
PLATE = f"9{int(time.time()) % 100}무{int(time.time()) % 10000:04d}"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(("PASS " if ok else "FAIL ") + name + (f"  | {detail}" if detail else ""))


def toast_text(pg):
    pg.wait_for_selector(".toast", timeout=8000)
    return pg.locator(".toast").inner_text()


def open_form(pg, plate):
    pg.goto(B + "/unauthorized/new")
    pg.wait_for_timeout(1200)
    pg.fill("input[placeholder='차량번호 입력']", plate)
    pg.get_by_role("button", name="적용", exact=True).click()
    pg.wait_for_timeout(1200)
    pg.get_by_role("button", name="지상", exact=True).click()
    pg.wait_for_selector(".toast", state="detached", timeout=8000)


def submit(pg):
    pg.locator("form button").last.click()


with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 390, "height": 844})
    pg.goto(B + "/login")
    pg.fill("input[placeholder='아이디']", os.environ.get("E2E_USER", "res1"))
    pg.fill("input[placeholder='비밀번호']", os.environ["E2E_PASSWORD"])
    pg.click("button.btn.primary")
    pg.wait_for_url(B + "/")

    # 1) 처음 보는 번호: 한 번에 접수되고 목록에 보인다
    open_form(pg, PLATE)
    submit(pg)
    t = toast_text(pg)
    check("새 번호 접수 성공", "무단주차로 등록되었습니다" in t, t)
    pg.wait_for_url(re.compile(r".*/unauthorized$"))
    pg.wait_for_timeout(1200)
    check("목록에 보임", pg.get_by_text(PLATE).count() > 0)

    # 2) 같은 번호 다시: 이유가 보인다
    open_form(pg, PLATE)
    submit(pg)
    t = toast_text(pg)
    pg.screenshot(path=f"{SHOTS}/err-duplicate.png")
    check("중복 접수 -> 이미 주차 중 안내", "이미 주차 중으로 접수된 차량" in t, t)

    # 3) 서버 500 (예: 운영 DB 마이그레이션 누락): 서버 문제라고 말한다
    pg.route("**/api/parking/unauthorized-parking-record/", lambda r: r.fulfill(
        status=500, content_type="application/json",
        body='{"detail":"x","error":{"code":"SERVER_ERROR","message":"x"}}') if r.request.method == "POST" else r.continue_())
    open_form(pg, PLATE + "1")
    submit(pg)
    t = toast_text(pg)
    pg.screenshot(path=f"{SHOTS}/err-500.png")
    check("서버 500 -> 서버 문제 + 코드", "서버에 문제가 생겨" in t and "500" in t, t)
    pg.unroute("**/api/parking/unauthorized-parking-record/")

    # 4) nginx 가 HTML 오류 페이지를 줄 때(502): HTML 이 새지 않는다
    pg.route("**/api/parking/unauthorized-parking-record/", lambda r: r.fulfill(
        status=502, content_type="text/html", body="<html><body>502 Bad Gateway nginx</body></html>") if r.request.method == "POST" else r.continue_())
    open_form(pg, PLATE + "2")
    submit(pg)
    t = toast_text(pg)
    check("502 HTML -> 내부 내용 없이 서버 문제", "nginx" not in t and "(오류 502)" in t, t)
    pg.unroute("**/api/parking/unauthorized-parking-record/")

    # 5) 연결 끊김: 인터넷 확인 안내
    pg.route("**/api/parking/unauthorized-parking-record/", lambda r: r.abort("internetdisconnected") if r.request.method == "POST" else r.continue_())
    open_form(pg, PLATE + "3")
    submit(pg)
    t = toast_text(pg)
    pg.screenshot(path=f"{SHOTS}/err-network.png")
    check("연결 끊김 -> 인터넷 확인", "인터넷 연결을 확인" in t, t)
    pg.unroute("**/api/parking/unauthorized-parking-record/")

    # 6) 너무 긴 번호: 필드 이름 + 사람 말
    open_form(pg, "1" * 210)
    submit(pg)
    t = toast_text(pg)
    check("너무 긴 번호 -> 차량번호 200자 이하", "차량번호" in t and "200자 이하" in t, t)
    b.close()

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
