---
name: Parking Desk (주차관리)
description: 순찰 중 한 손으로 "이 차가 여기 서도 되는가"를 판정하는 모바일 주차 관리 도구
colors:
  night-shift-navy: "#071a3a"
  console-navy: "#0b2a5b"
  command-navy: "#0e3a7a"
  horizon-navy: "#14509e"
  ink: "#0d1b2a"
  cool-paper: "#f5f7fb"
  card-white: "#ffffff"
  hairline: "#e4e9f2"
  field-line: "#cdd6e6"
  deep-ink-text: "#10233f"
  slate-muted: "#5a6b85"
  faded-slate: "#8a99b3"
  on-navy: "#eaf1ff"
  on-navy-muted: "#9fb6e0"
  signal-cyan: "#16b8d4"
  signal-cyan-deep: "#0e93ab"
  signal-cyan-mist: "#e2f7fb"
  go-green: "#1f9d57"
  go-green-mist: "#e3f6ec"
  caution-amber: "#d98a1a"
  caution-amber-mist: "#fbf0da"
  stop-red: "#d6413f"
  stop-red-mist: "#fbe6e5"
  segment-well: "#eef1f7"
typography:
  display:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, IBM Plex Sans KR, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  list:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.06em"
  caption:
    fontFamily: "IBM Plex Sans KR, -apple-system, Malgun Gothic, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
rounded:
  segment-item: "9px"
  icon-button: "10px"
  tile: "11px"
  field: "12px"
  button: "13px"
  card: "16px"
  fab: "18px"
  pill: "999px"
spacing:
  hairline: "4px"
  tight: "8px"
  gap: "12px"
  gutter: "16px"
  section: "22px"
components:
  button-primary:
    backgroundColor: "{colors.command-navy}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.button}"
    padding: "15px 18px"
    typography: "{typography.body}"
  button-signal:
    backgroundColor: "{colors.signal-cyan}"
    textColor: "{colors.night-shift-navy}"
    rounded: "{rounded.button}"
    padding: "15px 18px"
  button-ghost:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.deep-ink-text}"
    rounded: "{rounded.button}"
    padding: "15px 18px"
  button-danger:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.button}"
    padding: "15px 18px"
  fab:
    backgroundColor: "{colors.signal-cyan}"
    textColor: "{colors.night-shift-navy}"
    rounded: "{rounded.fab}"
    size: "56px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.deep-ink-text}"
    rounded: "{rounded.field}"
    padding: "13px 14px"
  chip:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.slate-muted}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  chip-selected:
    backgroundColor: "{colors.command-navy}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
  segment:
    backgroundColor: "{colors.segment-well}"
    textColor: "{colors.slate-muted}"
    rounded: "{rounded.field}"
    padding: "4px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "16px"
  kpi-tile:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.command-navy}"
    rounded: "{rounded.tile}"
    padding: "12px 10px"
    typography: "{typography.headline}"
  badge-ok:
    backgroundColor: "{colors.go-green-mist}"
    textColor: "{colors.go-green}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
    typography: "{typography.caption}"
  badge-warn:
    backgroundColor: "{colors.caution-amber-mist}"
    textColor: "{colors.caution-amber}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  badge-danger:
    backgroundColor: "{colors.stop-red-mist}"
    textColor: "{colors.stop-red}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  verdict-ok:
    backgroundColor: "{colors.go-green}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "20px"
    typography: "{typography.display}"
  verdict-warn:
    backgroundColor: "{colors.caution-amber}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "20px"
  verdict-danger:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "20px"
  app-bar:
    backgroundColor: "{colors.console-navy}"
    textColor: "{colors.on-navy}"
    padding: "14px 18px"
    typography: "{typography.title}"
  tab-active:
    backgroundColor: "{colors.signal-cyan-mist}"
    textColor: "{colors.command-navy}"
    rounded: "{rounded.icon-button}"
---

# Design System: Parking Desk (주차관리)

> 2026-11-23 코드(`frontend/src/styles/app.css`, `components/ui.jsx`)와 배포 화면(parking-lot.duckdns.org, 데모 모드)에서 뽑았다. 값의 정본은 위 frontmatter, 원본은 `app.css` 의 `:root`. 부품 전체 목록은 `docs/COMPONENTS.md`.

## Overview

**Creative North Star: "The Gatehouse Console" (경비실 계기판)**

밤에 순찰하는 경비원이 차 앞에 서서 한 손으로 폰을 들고 보는 계기판이다. 화면의 할 일은 하나, "이 차가 여기 서도 되는가"를 1초 안에 알려 주는 것. 그래서 바탕은 차분하게 물러서고(짙은 네이비 앱바, 차가운 종이색 바탕, 흰 카드), 크게 말하는 것은 판정 하나뿐이다. 판정은 신호등 색(초록 / 주황 / 빨강)으로, 화면에서 가장 크고 가장 진한 면이다.

밀도는 "모바일 업무 도구" 수준이다. 한 화면에 카드 서너 장, 글자는 15px 본문을 기준으로 쓰고, 숫자(KPI·번호판)는 Space Grotesk 로 따로 세운다. 장식은 거의 없다. 표현은 정확한 디테일에 산다: 시안 한 점이 "지금 누를 것"을 가리키고, 나머지는 네이비 농담으로 위계를 만든다.

데스크톱에서도 480px 폭 한 줄 그대로 쓴다. 이 도구의 자리는 순찰하는 손 안이고, 넓은 화면용 배치는 따로 만들지 않는다.

**Key Characteristics:**
- 네이비 앱바 + 차가운 종이색 바탕 + 흰 카드의 3층
- 시안은 "지금 실행" 한 곳에만
- 판정은 신호등 3색, 화면에서 가장 큰 면
- 숫자는 Space Grotesk, 글은 IBM Plex Sans KR
- 480px 단일 열, 하단 탭 5개, 등록은 FAB

## Colors

밤의 네이비 위에 신호 시안 하나와 신호등 3색만 얹은 절제된 팔레트.

### Primary
- **Command Navy** (`command-navy`): 기본 버튼, 선택된 칩, 활성 탭 글자, KPI 숫자. "확정·주 행동"의 색.
- **Console Navy → Command Navy 그라데이션** (`console-navy` → `command-navy`): 앱바. 화면 맨 위의 경비실 유리창.
- **Night-shift Navy** (`night-shift-navy`): 시안 위 글자, 가장 어두운 면.

### Secondary
- **Signal Cyan** (`signal-cyan`): signal 버튼, FAB, 입력 포커스 테두리, 브랜드 마크. "지금 실행"만.
- **Signal Cyan Deep** (`signal-cyan-deep`): 활성 탭 아이콘, 아이콘 버튼 글자. 큰 면이 아닌 작은 표식.
- **Signal Cyan Mist** (`signal-cyan-mist`): 포커스 링, 활성 탭 바탕.

### Tertiary (판정 신호등)
- **Go Green** (`go-green`) / **Go Green Mist**: 허용 · 지정·거주주차 · 거주 중.
- **Caution Amber** (`caution-amber`) / **Caution Amber Mist**: 조건부 · 방문주차 · 입주 예정.
- **Stop Red** (`stop-red`) / **Stop Red Mist**: 불허 · 무단주차 · 빈집 · 삭제.

### Neutral
- **Cool Paper** (`cool-paper`): 페이지 바탕.
- **Card White** (`card-white`): 카드·입력·고스트 버튼 바탕.
- **Hairline** (`hairline`): 카드 테두리, 목록 구분선.
- **Field Line** (`field-line`): 입력·칩·고스트 버튼 테두리.
- **Deep Ink Text** (`deep-ink-text`): 본문. **Slate Muted** (`slate-muted`): 보조 설명. **Faded Slate** (`faded-slate`): 힌트·비활성 탭·섹션 제목 - 지금 대비 2.7:1 로 본문용 기준 미달(감사 P1).
- **Ink** (`ink`): 토스트 바탕.

### Named Rules
**The One Signal Rule.** 시안은 한 화면에 "지금 실행" 하나에만 쓴다. 시안이 둘이면 무엇을 누를지 흐려진다.

**The Traffic Light Rule.** 초록·주황·빨강은 판정과 상태에만 쓴다. 장식·카테고리 구분·그래프 색으로 쓰지 않는다. 이 세 색을 보면 늘 "서도 되나"로 읽혀야 한다.

## Typography

**Body Font:** IBM Plex Sans KR (fallback: -apple-system, 맑은 고딕)
**Numeric Font:** Space Grotesk (fallback: 본문 글꼴)

**Character:** 단정한 한글 산세리프에, 숫자만 기하학적인 Space Grotesk 로 계기판 눈금처럼 세운다.

### Hierarchy
- **Display** (700, 30px, -0.02em): 판정 결과("무단주차") 한 곳.
- **Headline** (Space Grotesk 700, 22px, 줄간 1): KPI 숫자.
- **Title** (600, 16px): 앱바 제목. 로그인 제목은 20px.
- **Body** (400, 15px, 1.5): 본문·입력·버튼.
- **List** (600, 14.5px): 목록 제목, 타일 제목.
- **Label** (600, 12px, 0.06em, 대문자): 섹션 제목.
- **Caption** (600, 11.5px): 배지·힌트·메타. 이보다 작게 쓰지 않는다.

### Named Rules
**The Eleven Floor Rule.** 기능하는 글자(탭 라벨, KPI 라벨, 힌트)는 11px 아래로 내리지 않는다. 지금 탭·KPI 라벨 10.5px 는 위반(감사 P2).

## Layout

- **단일 열 셸**: 최대 폭 480px, 가운데 정렬. 위 sticky 앱바, 아래 고정 탭바(반투명 흰색 92% + blur 12px), 사이 페이지.
- **여백 리듬**: 페이지 좌우 16px, 카드 안 16px, 요소 사이 8 / 12px, 섹션 제목 위 22px.
- **탭 페이지 / 상세 페이지**: 탭 페이지는 앱바 왼쪽에 브랜드 마크, 상세·폼 페이지는 ← 와 홈. 폼은 탭바를 숨긴다.
- **FAB**: 등록이 있는 목록에만, 오른쪽 아래, 탭바 위 84px.
- 안전 영역: 아래 `env(safe-area-inset-bottom)`, 앱(Android)은 상태바·내비게이션 바만큼 안쪽.

## Elevation & Depth

평면에 가깝고, 그림자는 두 단계만 쓴다. 깊이는 주로 바탕 3층(앱바 네이비 → 종이색 → 흰 카드)과 테두리로 만든다.

### Shadow Vocabulary
- **Card rest** (`0 1px 2px rgba(13,27,42,.04), 0 8px 24px rgba(13,27,42,.06)`): 카드·검색창. 거의 안 보이는 받침.
- **Float** (`0 12px 32px rgba(7,26,58,.24)`): FAB·토스트처럼 화면 위에 떠 있는 것만.

### Named Rules
**The Two Heights Rule.** 그림자는 "놓임"과 "떠 있음" 두 단계뿐이다. 새 단계를 만들지 않는다.

## Shapes

둥글지만 무르지 않다. 반경은 크기를 따라 커진다: 세그먼트 칸 9px → 아이콘 버튼 10px → KPI 타일 11px → 입력·세그먼트 12px → 버튼 13px → 카드·판정 16px → FAB 18px. 배지·칩은 알약(999px). 판정 카드만 오른쪽 위에 반투명 원 장식 하나를 가진다.

## Components

### Buttons
- **Shape:** 13px 반경, 폭 100%, 15px 600, 위아래 15px.
- **Primary (Command Navy):** 저장·확정. 화면당 하나.
- **Signal (Signal Cyan):** "지금 실행" 하나(번호판 인식 등). One Signal Rule.
- **Ghost:** 흰 바탕 + Field Line 테두리. 보조 행동.
- **Danger (Stop Red):** 무단 접수·로그아웃·삭제.
- **Press:** 누르면 살짝 줄어든다(transform 0.1s). 포커스 표시는 지금 브라우저 기본값뿐(감사 P2).

### Chips
- **Style:** 흰 바탕, Field Line 테두리, Slate Muted 13px, 알약.
- **State:** 선택되면 Command Navy 채움 + 흰 글자. 선택 상태가 색으로만 전달된다(`aria-pressed` 없음).

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Card White, Hairline 테두리, Card rest 그림자, 안쪽 16px.
- **KPI 타일:** 11px 반경, 가운데 정렬, Space Grotesk 숫자 + 10.5px 라벨.

### Inputs / Fields
- **Style:** 흰 바탕, Field Line 테두리, 12px 반경, 13/14px 여백, 15px.
- **Focus:** 테두리 Signal Cyan + 3px Signal Cyan Mist 링.
- **Label / Hint:** 라벨 위, 힌트 아래 11.5px Faded Slate(대비 미달).

### Navigation
- **App bar:** 네이비 그라데이션, 제목 16px 600 + 위에 11px 대문자 영문 부제(Parking Desk, VERIFY …), 오른쪽 38px 아이콘 버튼(흰 10% 바탕): 알림 벨, 내 정보 / 홈.
- **Tab bar:** 5개 고정(홈·차량·거주민·무단주차·게시판). 홈은 맨 왼쪽. 활성은 아이콘 칸 Signal Cyan Mist + 글자 Command Navy.
- **Segment:** Segment Well 바탕 안에 흰 선택 칸. 목록 필터.

### Verdict Card (signature)
화면에서 가장 큰 면. 판정 색 그라데이션(어두운 쪽 → 기본색, 135deg) 위에 흰 글자: 작은 "주차 판정", 30px 결과, 이유 한 줄, 번호판 알약. 오른쪽 위 반투명 원 하나. 바로 아래 차량 상세 카드와 행동 버튼이 이어진다.

### Status Badge
알약, 11.5px 600, 앞에 점. 판정 3색의 Mist 바탕 + 기본색 글자. 주황 배지는 대비 2.4:1 로 미달(감사 P1).

## Do's and Don'ts

### Do:
- **Do** 판정은 Verdict Card 하나로, 신호등 3색 그라데이션과 30px 결과로 보여 준다.
- **Do** 시안은 화면당 "지금 실행" 하나(Signal 버튼 또는 FAB)에만.
- **Do** 숫자(KPI·번호판·시각)는 Space Grotesk.
- **Do** 새 색은 `:root` 토큰으로 먼저 만들고 이름으로 쓴다.
- **Do** 터치 대상은 44px 이상을 기본으로(지금 앱바 아이콘 38px, 세그먼트 37px 는 미달).

### Don't:
- **Don't** 초록·주황·빨강을 판정·상태가 아닌 곳(그래프·카테고리·장식)에 쓰지 않는다.
- **Don't** Faded Slate(`faded-slate`)를 읽어야 하는 글자에 쓰지 않는다. 힌트·섹션 제목은 Slate Muted 로.
- **Don't** 기능하는 글자를 11px 아래로 쓰지 않는다.
- **Don't** 카드 안에 카드를 겹치지 않는다(지금 목록 카드 안 카드 9곳).
- **Don't** 확대를 막지 않는다(`user-scalable=no` 는 WCAG 1.4.4 위반).
- **Don't** 같은 판정을 화면마다 다른 이름으로 부르지 않는다(지금 "거주주차"/"지정주차").
