# 컴포넌트 카탈로그 - Parking Desk (주차관리)

> 2026-11-23 정리. 토큰 이름·값은 `../DESIGN.md` frontmatter 가 정본이다. 여기는 **부품 하나하나의 쓰임·상태·문제**를 적는다.
> 코드: React `frontend/src/components/ui.jsx`·`form.jsx`, 클래스 `frontend/src/styles/app.css`. 코드는 복사하지 않고 위치만 적는다.
> 감사 근거: `.impeccable/` 의 감사 보고(2026-11-23, 배포 화면 데모 모드 + 탐지기). "감사" 칸의 P1~P3 은 그 보고의 등급.
> 이전 자리: agent-management `projects/P005-parking-lot/design/components/catalog.md` (여기로 옮김).

## 한눈에

| 부품 | 코드 | 쓰는 곳(대략) | 감사 |
|---|---|---|---|
| AppBar | `ui.jsx` AppBar, `.appbar` | 로그인 뒤 모든 화면 | P2 아이콘 버튼 38px |
| TabBar | `ui.jsx` TabBar, `.tabbar` | 탭 화면 5개 | P1 라벨 대비 2.7, P2 라벨 10.5px |
| Shell | `ui.jsx` Shell | 모든 화면 | - |
| DemoBanner | `ui.jsx`, `.demo-banner` | 데모 중 모든 화면 | P2 [로그인] 40×22 |
| Button | `.btn` + primary / signal / ghost / danger | 37곳 | P2 포커스 표시 없음 |
| IconButton | `.icon-btn`, `.phone-action` | 앱바·목록 전화 | P2 38~40px |
| FAB | `.fab` | 목록 4곳 | - |
| ActionTile | `.action-tile` | 홈 빠른 등록 | P3 로그인 화면 아이콘 타일 |
| Field | `form.jsx` Field | 45곳 | P1 힌트 대비 2.7, P2 힌트 11.5px |
| TextInput / TextArea | `form.jsx`, `.input` `.textarea` | 폼 전체 | - |
| ChipPicker | `form.jsx`, `.chip` | 차종·색상·위치·유효시간 | P2 `aria-pressed` 없음 |
| Segment | `form.jsx`, `.segment` | 목록 필터 5곳 | P2 37px, 선택이 색으로만 |
| SearchBar | `.searchbar` | 목록 4곳 | - |
| VerifyEntry | `Home.jsx`, `.verify-cta` | 홈 맨 위 | - |
| Badge | `ui.jsx` Badge | 7곳 | P1 대비 2.4~3.7 |
| VerdictCard | `Verify.jsx` VerdictCard, `.verdict` | 권한 확인, 차량 상세 | P2 이름 불일치(거주/지정) |
| KPI | `Home.jsx` KPI, `.kpi` | 홈, 거주민 | P2 라벨 10.5px |
| Card | `.card` | 26곳 | P3 카드 안 카드 9화면 |
| ListRow | `.list-row`, `.avatar` | 차량·거주민 목록 | P2 메타 줄바꿈 깨짐 |
| DetailLine | `.detail-line` | 상세 화면 | - |
| SectionTitle | `.section-title` | 10곳 | P1 대비 2.7 |
| MiniBars | `Home.jsx`, `.bars` | 홈 주간 방문 | P3 시안 그라데이션 막대 |
| Toast | `ui.jsx` ToastProvider | 26곳 | - |
| Loading / Empty | `ui.jsx` | 목록·상세 | - |
| NotificationBell | `components/NotificationBell.jsx` | 앱바 | P2 인라인 스타일·토큰 밖 색 |
| TextLink | `.text-link` | 로그인 | - |
| PlateScanDemo | `components/PlateScanDemo.jsx`, `.scan-demo` | 웹 데모 권한 확인 | - |
| ScanActivity (Android) | `android/.../activity_scan.xml`, `PlateGuideView.kt` | 앱 권한 확인 | 감사 범위 밖(네이티브) |

## 골격

### AppBar
- 용도: 로그인 뒤 모든 화면 위. sticky.
- 변형: **탭형**(왼쪽 브랜드 마크, 장식) / **상세형**(`back`: 왼쪽 ←, 오른쪽 홈). ← 는 이전, 홈은 홈 - 둘을 섞지 않는다.
- 구성: [마크 또는 ←] [부제 11px 영문 대문자 + 제목 16/600] ··· [알림 벨] [홈 또는 내 정보] [right 슬롯]
- 값: `console-navy → command-navy` 그라데이션, 글자 `on-navy`, 아이콘 버튼 38px·반경 10·흰 10% 바탕.
- 접근성: ←·홈·내 정보 `aria-label` 있음. 로고 링크 여부는 상수 `LOGO_LINKS_HOME`(false).
- 감사: 아이콘 버튼 38px(44 권장, AA 24 는 통과).

### TabBar
- 용도: 탭 화면 아래 고정. 5개 고정 - 홈(맨 왼쪽)·차량·거주민·무단주차·게시판.
- 상태: 기본 `faded-slate` / 활성 글자 `command-navy` + 아이콘 칸 `signal-cyan-mist` 바탕·`signal-cyan-deep`.
- 값: 흰 92% + blur 12, 아이콘 칸 40×28 반경 9, 라벨 10.5px.
- 감사: 비활성 라벨 대비 2.9:1(P1), 라벨 10.5px(P2). 고칠 때 `slate-muted` + 11px.

### Shell
- 앱바 + (데모 띠) + 페이지 + 탭바 묶음. `hideTabs` 로 탭 숨김(폼·상세).

### DemoBanner
- 둘러보기 중 앱바 아래 한 줄 "데모 구경 중 · 실제 데이터가 아닙니다 [로그인]". `caution-amber-mist` 바탕, 12px.
- 가짜 데이터를 실제로 오해하지 않게 모든 화면에 둔다.
- 감사: [로그인] 버튼 40×22(AA 24 미달, 글줄 안 예외로 볼 수도 있음).

## 행동

### Button (`.btn`)
- 변형: `primary`(네이비, 확정) / `signal`(시안, 지금 실행 하나) / `ghost`(흰 바탕·테두리, 보조) / `danger`(빨강, 무단 접수·삭제).
- 상태: default / active(살짝 줄어듦) / disabled(흐리게). hover·focus-visible·loading 스타일 **없음**.
- 값: 폭 100%, 안쪽 15×18, 반경 13, 15/600. `.btn-row` 안에서는 등분.
- `<a class="btn">` 로 전화 걸기에도 쓴다.
- 감사: 포커스가 브라우저 기본 1px 외곽선뿐(P2). 권한 확인 화면에서 [권한 조회](primary)와 [번호판 인식](signal)이 둘 다 크게 보인다 - One Signal Rule 은 지키지만 위계 확인 필요.

### IconButton (`.icon-btn`)
- 40px 정사각, 반경 12, 흰 바탕·`field-line` 테두리, 글자 `signal-cyan-deep`.
- 변형: `phone-action`(시안 미스트 바탕). 앱바 안에서는 AppBar 값으로 덮인다.
- 상태: hover(위로 1px + 시안 테두리) / active(줄어듦).

### FAB (`.fab`)
- 목록의 "새로 등록". 56px, 반경 18, `signal-cyan` 바탕·`night-shift-navy` 아이콘, float 그림자.
- 위치: 탭바 위(아래 84px + 안전 영역), 480px 틀 오른쪽 안쪽 16px.

### ActionTile (`.action-tile`)
- 홈 빠른 등록 2열. 아이콘 42px(네이비 칸) + 제목 14.5/600 + 설명 11.5.
- 변형 `hot`: 아이콘 칸 시안(가장 자주 쓰는 행동).
- 감사: 로그인 화면의 68px 아이콘 타일 + 제목은 흔한 AI 템플릿 모양으로 탐지됨(P3).

### VerifyEntry (`.verify-cta`)
- 홈 맨 위, 앱바 바로 아래. 검색창과 같은 흰 카드 + `field-line` 테두리 + 카드 그림자.
- 왼쪽 돋보기 + "주차 권한 조회" 15.5px 굵게 + 설명 12px. 오른쪽 48px 시안 칸 = 이 화면의 "지금 실행"(앱은 카메라, 웹은 화살표).
- 앱에서는 본문과 카메라가 별개 버튼, 웹에서는 카드 전체가 버튼 하나.

## 입력

### Field
- 라벨 12.5/600 + 입력 + 힌트 11.5 `faded-slate`. 필드 사이 14.
- 감사: 힌트 대비 2.7(P1), 11.5px 본문(P2).

### TextInput / TextArea (`.input` `.textarea` `.select`)
- 반경 12, 안쪽 13×14, 15px, `field-line` 테두리.
- focus: 테두리 `signal-cyan` + 3px `signal-cyan-mist` 링. TextArea 최소 84px, 세로 조절.

### 입력 + 조회 버튼 (패턴)
- 차량번호 [적용], 아이디 [조회]. 조회 전 primary → 조회 후 ghost. 값을 바꾸면 다시 조회.

### ChipPicker (`.chip`)
- 여러 값 중 하나(차종·색상·위치·유효시간). 줄바꿈 허용, 간격 8.
- 상태: 기본 흰 바탕·`slate-muted` / `on` `command-navy` 채움·흰 글자.
- 감사: 선택이 색으로만 전달(`aria-pressed` 없음, P2).

### Segment (`.segment`)
- 목록 필터(전체/지정/방문/미등록 등). `segment-well` 트랙 안 흰 칸.
- 감사: 칸 높이 37px(P2), 선택이 색으로만(P2).

### SearchBar (`.searchbar`)
- 아이콘 + 테두리 없는 입력, 반경 13. 입력 자체 높이 24px - 감싼 카드 전체를 눌러도 입력으로 가는지 확인 필요(확인 안 함).

## 표시

### VerdictCard (`.verdict`) - 대표 부품
- 판정 결과. 신호등 3색 그라데이션(135deg, 어두운 쪽 → 기본색) + 오른쪽 위 반투명 원 하나.
- 구성: eyebrow 11 → 결과 30/700 → 이유 13 → 번호판 알약(Space Grotesk, 흰 18% 바탕).
- 쓰는 곳: 권한 확인, 차량 상세.
- 감사: 같은 차를 판정 카드는 "거주주차", 상세는 "지정주차"로 부른다(P2). 주황 카드 위 13px 흰 글자 대비 2.8.

### Badge
- 변형: `ok` / `warn` / `danger` / `neutral`. 앞에 6px 점, 11.5/600, 알약, 바탕은 각 Mist 색.
- 감사: 주황 2.4 / 초록 3.1 / 빨강 3.7 - 셋 다 본문 기준 미달(P1). 글자를 한 단계 진한 색으로.

### KPI (`.kpi-row` `.kpi`)
- 4열(거주민 화면은 3열). 숫자 22/700 Space Grotesk `command-navy` + 라벨 10.5.
- 변형: `accent`(시안 숫자) / `danger`(빨강 숫자). 누르면 해당 필터 목록.
- 감사: 라벨 10.5px(P2).

### Card (`.card`)
- 흰 바탕, `hairline` 테두리, 반경 16, 안쪽 16, 카드 받침 그림자. 연속 카드 사이 12.
- 감사: 목록 카드 안에 카드가 겹친 화면 9곳(P3).

### ListRow (`.list-row`)
- 아바타 42px(네이비, 숫자 글꼴) + 제목 14.5/600·메타 12 muted + 오른쪽 배지, 행 사이 `hairline`.
- 감사: 메타 줄에 붙은 "초과(2)" 배지가 글자 단위로 줄바꿈되고, 거주민 목록은 "102호미등록"처럼 제목과 메타가 붙어 보인다(P2).

### DetailLine (`.detail-line`)
- 라벨(muted) ↔ 값(500, 오른쪽) 한 줄. 빈 값은 "-".

### SectionTitle (`.section-title`)
- 12/600, 대문자, 자간 0.06em, `faded-slate`, 위 22 아래 10.
- 감사: 대비 2.7(P1).

### MiniBars (`.bars`)
- 홈 주간 방문 그래프. 높이 120, 막대 시안 → 네이비 그라데이션, 값 Space Grotesk.
- 감사: 시안 그라데이션 막대가 흔한 AI 팔레트로 탐지(P3). 시안이 "지금 실행" 외에 쓰이는 곳.

## 피드백

### Toast
- 아래 가운데(탭바 위 110px), 2.6초 뒤 사라짐. 기본 `ink`, 오류 `stop-red`. 한 번에 하나.

### Loading / Empty
- Loading: 22px 스피너(위 테두리 시안).
- Empty: 56px 회색 아이콘 칸 + 제목(600 muted) + 힌트 13.

### NotificationBell
- 앱바 안. 내가 호스트인 방문차량의 출차 임박 목록, 30초마다 갱신. 항목 → 차량 상세.
- 색: 5분 이하 `stop-red`, 15분 이하 #b45309(토큰 아님).
- 감사: 펼침 목록이 인라인 스타일과 토큰 밖 색으로 만들어져 있다(P2).

### TextLink (`.text-link`)
- 위계를 바꾸지 않는 보조 이동("로그인 없이 데모 구경하기"). 13px `slate-muted` + 밑줄, focus-visible 시안 2px.

## 번호판 인식

### PlateScanDemo (`.scan-demo`, 웹 데모 전용)
- 앱 인식 화면과 같은 배치로 흐름만 보여 준다: 위 닫기 / 가운데 3:1 박스(위 안내, 아래 진행 알약) / 아래 [직접 입력].
- 480px 틀 안 전체 화면(`role="dialog"`), 어두운 원형 그라데이션 바탕.
- 오른쪽 위 `caution-amber-mist` 꼬리표 "예시 화면 · 실제 인식은 Android 앱에서".
- 꺾쇠 흰색 → 확정되면 `go-green`. 진행 알약 `aria-live="polite"`. 닫기 44px, [직접 입력] 52px, focus-visible 시안 2px.

### ScanActivity (Android 네이티브)
- 구현: `frontend/android/app/src/main/res/layout/activity_scan.xml`, `PlateGuideView.kt`.
- 배치: 위 왼쪽 닫기 / 위 오른쪽 플래시 / 가운데 가이드 박스 / 아래 "직접 입력". 위아래는 상태바·내비게이션 바만큼 안쪽.
- 원형 아이콘 버튼 48dp, 검정 45% 바탕, 흰 아이콘.
- 플래시: 켜짐(노란 번개)/꺼짐. 자동 판단 중이면 시안 "자동" 배지, 누르면 사라짐. 플래시 없는 기기는 숨김.
- 가이드 박스: 네 모서리 꺾쇠(4dp, 흰색 → 읽히면 초록), 박스 밖 검정 60%, 가로 85%·3:1.
- 문구: 박스 위 안내 17sp 굵게, 아래 진행 알약 "12가3456 확인 중 2/3"(night-shift-navy 반투명).
- 직접 입력: 52dp 알약, night-shift-navy 70% + 흰 테두리.

### 앱 아이콘 (Android)
- 짙은 남색 바탕 + 흰 P + 시안 조준선. 적응형 벡터, Android 13 테마 아이콘, 구형 기기용 PNG.
- PWA 아이콘과 다르다(통일할지는 정하지 않음).

## 추출 후보 (코드는 아직 안 바꿈)

반복이 3번 이상이고 뜻이 같은 것만 적었다. 옮기는 작업은 사람 결정 뒤 `/impeccable extract` 로 한다.

| 후보 | 지금 | 옮기면 |
|---|---|---|
| 상태 색 토큰 `--warn-strong` 류 | `#b45309`(벨), `#b9740f`·`#157a44`·`#b32e2c`(판정 그라데이션)가 `:root` 밖에 | 판정 3색의 "진한 쪽" 토큰 3개 |
| 트랙 회색 `--segment-well` | `#eef1f7` 이 세그먼트·중립 배지 등에 따로 | 토큰 1개 |
| 인라인 스타일 | JSX `style={{}}` 150곳(가장 많은 속성은 `marginTop` 55곳, `fontSize` 31곳) | `.stack` / `.mt-12` 류 간격 유틸 또는 컴포넌트 props |
| 벨 펼침 목록 | `NotificationBell.jsx` 안 인라인 스타일 덩어리 | `.popover` + `.popover-item` 클래스 |
| 상세 정보 묶음 | 차종·모델·색상·타워 DetailLine 4줄이 권한 확인·차량 상세에 반복 | `VehicleFacts` 컴포넌트 |
