# 디자인 감사 보고 - 2026-11-23

> impeccable audit 결과 사본(13/20, P1 3 · P2 6 · P3 4). impeccable 은 감사 기록을 로컬(`.impeccable/audit/`, 커밋 안 됨)에만 두므로 저장소에 한 벌 남긴다.

## 감사 대상

- 배포 화면 https://parking-lot.duckdns.org (2026-11-23). 로그인 화면 + "로그인 없이 데모 구경하기"로 13개 화면(가짜 데이터). 실제 계정 화면은 보지 않았다(비밀번호를 받지 않음).
- 방법: 시스템 Chrome(헤드리스, 390×844 터치 / 1280×800)으로 열고 impeccable 탐지기를 화면마다 CDP 로 실행(61건). DOM 측정으로 터치 대상·포커스·제목·랜드마크 확인. 코드 정적 검사(탐지기 0건), CSS·JSX 하드코딩 집계.
- 확인 안 함: Android 앱(네이티브 인식 화면), 실제 스크린리더, 실제 기기 터치.

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | 확대 금지(user-scalable=no) + 힌트·섹션 제목·배지 대비 2.4~3.1 |
| 2 | Performance | 3 | JS 한 덩어리 345KB(압축 전), 그 밖에 무거운 효과 없음 |
| 3 | Theming | 2 | 토큰은 있으나 `:root` 밖 색 39곳, JSX 인라인 스타일 150곳 |
| 4 | Responsive Design | 3 | 480px 단일 열 안정. 터치 대상 38~37px 다수, 목록 메타 줄바꿈 깨짐 |
| 5 | Implementation Integrity | 3 | 네이비·시안·신호등 체계가 일관. 카드 안 카드, 판정 이름 불일치 |
| **Total** | | **13/20** | **Acceptable (손볼 곳 뚜렷함)** |

### Implementation Integrity Verdict

**통과.** 제품 고유의 체계가 분명하다: 네이비 앱바 + 차가운 종이색 바탕 + 흰 카드, "지금 실행" 하나에만 시안, 판정은 신호등 3색의 큰 카드(VerdictCard). 13개 화면이 같은 골격(AppBar·Segment·Card·FAB·TabBar)을 쓴다. 탐지기의 "AI 템플릿" 경고는 2건뿐(로그인 아이콘 타일, 홈 그래프 시안 그라데이션)이고 둘 다 주변부다. 흔들리는 곳은 구현 습관이다: 인라인 스타일, 토큰 밖 색, 카드 안 카드.

### Executive Summary

- Audit Health Score: **13/20** (Acceptable)
- 문제 13건: P0 0 / P1 3 / P2 6 / P3 4
- 가장 급한 것
  1. 확대 금지 - 시력이 약한 사람이 글자를 키울 수 없다(WCAG 1.4.4)
  2. `faded-slate`(#8a99b3) 글자 대비 2.7:1 - 힌트·섹션 제목·비활성 탭 전부
  3. 상태 배지 대비 - 주황 2.4:1, 초록 3.1:1
  4. 기능 글자 10.5px(탭 라벨·KPI 라벨)
  5. 목록 메타 줄바꿈 깨짐("초과(2)"가 글자 단위로 꺾임)
- 다음 단계: 대비·확대 → 글자 크기·터치 대상 → 토큰 정리

### Detailed Findings by Severity

**[P1] 화면 확대 금지**
- Location: `frontend/index.html` viewport `maximum-scale=1.0, user-scalable=no`
- Category: Accessibility
- Impact: 손가락으로 확대가 안 된다. 순찰 중 밤에 작은 글자를 키워 볼 수 없다.
- WCAG/Standard: 1.4.4 Resize Text (AA)
- Recommendation: `maximum-scale`·`user-scalable` 제거. 입력 포커스 때 iOS 자동 확대가 걱정이면 입력 글자 16px 이상으로.
- Suggested command: /impeccable harden

**[P1] 흐린 회색 글자 대비 2.7:1**
- Location: `app.css` `--text-faint` 를 쓰는 `.section-title`, `.field .hint`, `.tabbar a`, `.divider` (13개 화면 22건)
- Category: Accessibility
- Impact: 밝은 야외·밤 화면 밝기 낮춤에서 힌트와 섹션 제목이 안 읽힌다.
- WCAG/Standard: 1.4.3 Contrast (AA 4.5:1)
- Recommendation: 읽어야 하는 글자는 `--text-muted`(5.4:1)로. `--text-faint` 는 장식 구분선에만.
- Suggested command: /impeccable colorize

**[P1] 상태 배지 대비 미달**
- Location: `.badge.warn` 2.4:1, `.badge.ok` 3.1:1, `.badge.danger` 3.7:1 (11.5px)
- Category: Accessibility
- Impact: 차량·거주민 목록의 상태(지정·방문·빈집)를 색 점과 흐린 글자로만 읽게 된다.
- WCAG/Standard: 1.4.3 Contrast (AA)
- Recommendation: 배지 글자만 한 단계 진한 색(#b45309 / #157a44 / #b32e2c 수준)으로. 판정 카드 색은 그대로.
- Suggested command: /impeccable colorize

**[P2] 기능 글자 10.5px**
- Location: `.tabbar a` 라벨, `.kpi .l` 라벨 (19건)
- Category: Accessibility
- Impact: 탭 이름과 요약 숫자의 뜻이 작아서 한눈에 안 읽힌다.
- Recommendation: 11~12px. 탭 아이콘 칸은 그대로.
- Suggested command: /impeccable typeset

**[P2] 터치 대상 44px 미만**
- Location: 앱바 아이콘 38px, 세그먼트 칸 37px, 목록 전화 40px, 고스트 [수정] 53×36, 데모 띠 [로그인] 40×22
- Category: Responsive
- Impact: 장갑·한 손 사용에서 잘못 누름. AA(24px)는 데모 띠 [로그인]만 미달.
- WCAG/Standard: 2.5.8 Target Size (AA, 24px) / 권장 44px
- Recommendation: 아이콘 버튼 44px, 세그먼트 높이 44px, 데모 띠 [로그인] 위아래 여백.
- Suggested command: /impeccable adapt

**[P2] 포커스 표시 약함**
- Location: `.btn`, `.chip`, `.segment button`, `.tabbar a`, `.list-row` - 브라우저 기본 1px 외곽선만(키보드 Tab 으로 확인)
- Category: Accessibility
- Impact: 블루투스 키보드·스위치 사용자가 위치를 잃는다. 네이비 앱바 위 기본 외곽선은 거의 안 보인다(추정, 확대 확인 안 함).
- WCAG/Standard: 2.4.7 Focus Visible (AA)
- Recommendation: 입력과 같은 시안 2px `:focus-visible` 를 버튼·칩·탭에 공통으로.
- Suggested command: /impeccable harden

**[P2] 선택 상태가 색으로만**
- Location: `form.jsx` ChipPicker·Segment (`aria-pressed`/`aria-selected` 없음)
- Category: Accessibility
- Impact: 스크린리더가 어떤 필터·차종이 골라졌는지 말하지 않는다.
- WCAG/Standard: 4.1.2 Name, Role, Value
- Recommendation: 칩 `aria-pressed`, 세그먼트 `role="tablist"`·`aria-selected`.
- Suggested command: /impeccable harden

**[P2] 목록 메타 줄바꿈 깨짐**
- Location: 차량 목록(`Vehicles.jsx`) "초과(2)" 배지가 "초 / 과(2)"로 꺾임, 거주민 목록 "102호미등록" 붙어 보임
- Category: Responsive
- Impact: 상태 정보가 깨져 보여 판정을 다시 확인하게 만든다.
- Recommendation: 메타 배지 `white-space: nowrap`, 제목·메타 사이 간격.
- Suggested command: /impeccable layout

**[P2] 같은 판정, 다른 이름**
- Location: 판정 카드 "거주주차"(Verify `verdictFromType`) vs 차량 상세·목록 "지정주차"
- Category: Implementation Integrity
- Impact: 같은 차가 화면마다 다른 판정처럼 보인다.
- Recommendation: 한 이름으로. 판정 카드가 `parking_type` 을 그대로 쓰는 것(I-04)과 함께 정리.
- Suggested command: /impeccable clarify

**[P2] 토큰 밖 색·인라인 스타일**
- Location: `app.css` `:root` 밖 색 39곳(판정 그라데이션 진한 쪽 #157a44·#b9740f·#b32e2c, #eef1f7 등), JSX `style={{}}` 150곳(marginTop 55, fontSize 31), `NotificationBell.jsx` 펼침 목록 전체
- Category: Theming
- Impact: 색·간격을 한 곳에서 바꿀 수 없다. 대비 수정도 여러 곳을 따로 고쳐야 한다.
- Recommendation: 진한 판정 3색·트랙 회색을 토큰으로, 반복 여백은 클래스로. 목록은 `docs/COMPONENTS.md` 추출 후보.
- Suggested command: /impeccable layout

**[P3] 카드 안 카드**
- Location: 목록·상세 9개 화면 (`div.card` 안 `div.card`)
- Category: Implementation Integrity
- Impact: 테두리·그림자가 겹쳐 무게가 늘고 위계가 흐려진다.
- Recommendation: 안쪽은 구분선 목록(ListRow)이나 배경 없는 묶음으로.
- Suggested command: /impeccable distill

**[P3] 동작 줄이기가 전부 끔**
- Location: `app.css` `@media (prefers-reduced-motion)` 에서 모든 animation·transition 0.001ms
- Category: Accessibility
- Impact: 토스트 등장·누름 반응까지 사라진다. 지금 움직임이 작아서 실제 손해는 작다.
- Recommendation: 이동(transform)만 끄고 투명도 변화는 남긴다.
- Suggested command: /impeccable animate

**[P3] 로그인 아이콘 타일·그래프 시안 그라데이션**
- Location: 로그인 68px 아이콘 타일 + 제목, 홈 주간 그래프 막대
- Category: Implementation Integrity
- Impact: 흔한 템플릿처럼 보이는 두 곳. 그래프 시안은 One Signal Rule 과도 어긋난다.
- Recommendation: 그래프는 네이비 단색, 로그인 마크는 브랜드 마크 그대로 작게.
- Suggested command: /impeccable quieter

**[P3] JS 한 덩어리 345KB**
- Location: `dist/assets/index-*.js` (압축 전)
- Category: Performance
- Impact: 첫 방문 로딩. PWA 캐시 뒤에는 영향 작음.
- Recommendation: 라우트 단위 `React.lazy` (게시판·거주민 폼 등).
- Suggested command: /impeccable optimize

### Patterns & Systemic Issues

- `--text-faint` 하나가 대비 문제의 대부분을 만든다(탐지된 저대비 글자 대부분이 #8a99b3). 토큰 하나 고치면 대부분 풀린다.
- 작은 글자(10.5~11.5px)가 탭·KPI·힌트·배지에 퍼져 있다 - 바닥 크기 규칙이 없었다.
- 인라인 스타일이 컴포넌트 클래스를 우회한다(150곳). 새 화면도 같은 습관을 따를 것이다.

### Positive Findings

- 판정 카드가 화면에서 가장 크고 진해서 "서도 되나"가 1초 안에 읽힌다.
- 시안을 "지금 실행" 한 곳에만 쓰는 규칙이 대부분 화면에서 지켜진다.
- 모든 화면에 h1·header·main·nav 가 있고, 아이콘 버튼에는 `aria-label` 이 있다.
- 입력 포커스(시안 테두리 + 링)는 분명하다.
- 데모 띠·예시 화면 꼬리표로 가짜 데이터를 실제로 오해하지 않게 했다.

## Recommended Actions

1. **[P1] `/impeccable harden`**: viewport 확대 허용, 버튼·칩·탭 공통 `:focus-visible`, 칩·세그먼트 선택 상태 ARIA.
2. **[P1] `/impeccable colorize`**: `--text-faint` 를 읽는 글자에서 빼고, 상태 배지 글자를 진한 색으로.
3. **[P2] `/impeccable typeset`**: 탭·KPI 라벨 11px 이상, Eleven Floor Rule 적용.
4. **[P2] `/impeccable adapt`**: 앱바 아이콘·세그먼트·데모 띠 [로그인] 터치 대상 44px.
5. **[P2] `/impeccable layout`**: 목록 메타 줄바꿈, 토큰 밖 색·인라인 여백 정리.
6. **[P2] `/impeccable clarify`**: 거주주차/지정주차 이름 통일.
7. **[P3] `/impeccable distill`**: 카드 안 카드 걷어 내기.
8. **[P3] `/impeccable polish`**: 마지막 점검.

## 조치 (2026-11-26)

P1 3건을 고쳤다. P2·P3 는 그대로.

| P1 | 고친 것 | 대비(계산값) |
|---|---|---|
| 확대 금지 | viewport 에서 `maximum-scale`·`user-scalable` 제거. iOS 포커스 확대를 막으려고 입력란 글자 15px → 16px | - |
| 흐린 글자 | 탭 라벨·섹션 제목·힌트·빈 목록 문구·구분선 글자·막대 라벨·알림 빈 문구·글 메타를 `--text-faint` → `--text-muted`. `--text-faint` 는 아이콘 장식에만 남김 | 2.7 → 5.1(종이 배경)·5.4(흰 배경) |
| 상태 배지 | 배지 글자 전용 토큰 `--ok-text` #157a44 · `--warn-text` #a14a07 · `--danger-text` #b32e2c. 판정 카드 색은 그대로 | 초록 4.8 · 주황 5.3 · 빨강 5.3 |

대비는 WCAG 공식으로 계산했다. 실제 화면 재감사(`/impeccable audit`)는 아직 안 했다.
