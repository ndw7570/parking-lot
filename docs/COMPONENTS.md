# 컴포넌트 카탈로그 - Parking Desk (주차관리)

> 2026-11-26 개정(2026-11-23 초판). 토큰 이름·값은 `../DESIGN.md` frontmatter 가 정본이다. 여기는 **부품 하나하나가 왜 있고, 어디까지 공용이고, 무엇을 조심하는지**를 적는다.
> 코드: React `frontend/src/components/`, 클래스 `frontend/src/styles/app.css`. 코드는 복사하지 않고 위치만 적는다.
> 감사 근거: `design-audit-2026-11-23.md`. "남은 감사"는 아직 안 고친 것만 적는다(P1 3건은 2026-11-26 `bd2095d` 에서 고침).

## 읽는 법

부품마다 같은 칸을 둔다.

- **목적**: 이 부품이 왜 있는가. 없으면 무엇이 불편한가.
- **구분**: 아래 셋 중 하나. 새 화면을 만들 때 어디서 가져올지가 여기서 갈린다.
  - **공용 부품** - `components/` 의 React 컴포넌트. import 해서 쓴다.
  - **공용 클래스** - `app.css` 의 클래스만 있고 컴포넌트는 없다. 마크업에 클래스를 붙여 쓴다.
  - **화면 전용** - 한 화면 파일 안에만 있다. 다른 화면에서 쓰려면 먼저 `components/` 로 옮긴다(복사 금지).
- **주의**: 지키지 않으면 깨지는 약속.
- **쓰지 말 때**: 비슷해 보여도 다른 부품을 써야 하는 경우.

## 한눈에

| 부품 | 구분 | 코드 | 남은 감사 |
|---|---|---|---|
| Shell | 공용 부품 | `ui.jsx` | - |
| AppBar | 공용 부품 | `ui.jsx` | - |
| TabBar | 공용 부품 | `ui.jsx` | - |
| DemoBanner | 공용 부품(Shell 안) | `ui.jsx` | - |
| AccountButton | 공용 부품 | `ui.jsx` | - |
| NotificationBell | 공용 부품 | `NotificationBell.jsx` | P2 인라인 스타일·토큰 밖 색 |
| NativeBackHandler | 공용 부품(화면 없음) | `NativeBackHandler.jsx` | - |
| Icons | 공용 부품 | `Icons.jsx` (16개) | - |
| Toast | 공용 부품 | `ui.jsx` ToastProvider·useToast | - |
| Loading / Empty | 공용 부품 | `ui.jsx` | - |
| Badge | 공용 부품 | `ui.jsx` | - |
| Field / TextInput / TextArea | 공용 부품 | `form.jsx` | P2 힌트 11.5px |
| ChipPicker | 공용 부품 | `form.jsx` | - |
| Segment | 공용 부품 | `form.jsx` | - |
| Button | 공용 클래스 | `.btn` | - |
| IconButton | 공용 클래스 | `.icon-btn` `.phone-action` | - |
| FAB | 공용 클래스 | `.fab` | - |
| Card | 공용 클래스 | `.card` | P3 카드 안 카드 |
| ListRow | 공용 클래스 | `.list-row` `.avatar` | - |
| DetailLine | 공용 클래스 | `.detail-line` | - |
| SectionTitle | 공용 클래스 | `.section-title` | - |
| SearchBar | 공용 클래스 | `.searchbar` | - |
| TextLink | 공용 클래스 | `.text-link` | - |
| ActionTile | 공용 클래스 | `.action-tile` | P3 로그인 아이콘 타일 |
| VerdictCard | 화면 전용 | `Verify.jsx` VerdictCard, `VehicleDetail.jsx` 는 `.verdict` 직접 | 주황 카드 13px 글자 2.8 |
| KPI | 화면 전용 | `Home.jsx` KPI, `.kpi` | - |
| VerifyEntry | 화면 전용 | `Home.jsx`, `.verify-cta` | - |
| MiniBars | 화면 전용 | `Home.jsx`, `.bars` | P3 시안 그라데이션 |
| PlateScanDemo | 공용 부품(웹 데모 전용) | `PlateScanDemo.jsx` | - |
| ScanActivity | Android 네이티브 | `activity_scan.xml`, `PlateGuideView.kt` | 감사 범위 밖 |

## 골격

### Shell
- 목적: 앱바·데모 띠·페이지·탭바를 한 번에 묶는다. 화면마다 골격을 다시 짜면 앱바 높이·탭바 여백이 어긋난다.
- 쓰는 법: `<Shell bar={<AppBar …/>} hideTabs>`. 폼·상세는 `hideTabs`.
- 주의: 탭바·FAB 를 피하는 아래 여백(96px + 안전 영역)이 Shell 의 `.page` 에 들어 있다. 페이지에서 따로 여백을 더하지 않는다. `NativeBackHandler` 는 Shell 이 아니라 `App.jsx` 에 한 번 있다.
- 쓰지 말 때: 로그인·가입·비밀번호 변경. 셸 없이 가운데 정렬 단독 화면이다.

### AppBar
- 목적: 지금 어느 화면인지와 빠져나갈 길(← 이전 / 홈)을 늘 같은 자리에 둔다.
- 변형: **탭형**(왼쪽 브랜드 마크, 누르지 않음) / **상세형**(`back`: 왼쪽 ←, 오른쪽 홈).
- 구성: [마크 또는 ←] [부제 11px 영문 대문자 + 제목 16/600] ··· [알림 벨] [홈 또는 내 정보] [`right` 슬롯]
- 값: `console-navy → command-navy` 그라데이션, 글자 `on-navy`, 아이콘 버튼 보이는 크기 38px·반경 10·흰 10% 바탕, 누르는 영역 44px(`::after` inset -3px).
- 주의: ← 는 이전, 홈은 홈. 둘을 섞지 않는다. 로고를 홈 링크로 바꾸는 스위치는 상수 `LOGO_LINKS_HOME`(지금 false).
- 쓰지 말 때: `right` 슬롯에 행동 버튼을 여러 개 넣지 않는다. 화면 행동은 본문 버튼이나 FAB 로.

### TabBar
- 목적: 하루 대부분의 일(홈·차량·거주민·무단주차·게시판)을 엄지 한 번으로 오간다.
- 상태: 기본 `slate-muted` / 활성 글자 `command-navy` + 아이콘 칸 `signal-cyan-mist` 바탕.
- 값: 흰 92% + blur 12, 아이콘 칸 40×28 반경 9, 라벨 11px.
- 주의: 탭은 5개 고정, 홈이 맨 왼쪽. 탭을 늘리려면 기획(`plan/specs/planning.md` 3장)부터 바꾼다.
- 쓰지 말 때: 폼·상세 화면(`hideTabs`). 입력 중 탭을 누르면 작성 내용이 사라진다.

### DemoBanner
- 목적: 둘러보기 중 가짜 데이터를 진짜로 오해하지 않게 한다. "데모 구경 중 · 실제 데이터가 아닙니다 [로그인]".
- 구분: Shell 이 데모 모드일 때 스스로 넣는다. 화면에서 직접 쓰지 않는다.
- 주의: 데모 중 모든 화면에 보여야 한다. Shell 을 거치지 않는 화면을 데모에 넣으면 띠가 빠진다.

### AccountButton
- 목적: 탭 화면 앱바 오른쪽의 "내 정보"(`/mypage`) 입구.
- 쓰는 법: `<AppBar right={<AccountButton />} />`. 지금 홈·차량·거주민·무단주차·게시판이 쓴다.
- 쓰지 말 때: 상세형 앱바. 그 자리는 홈 버튼이다.

### NotificationBell
- 목적: 내가 등록한 방문차량의 출차 임박을 놓치지 않게 한다. 30초마다 갱신, 항목을 누르면 차량 상세.
- 색: 5분 이하 `stop-red`, 15분 이하 `--warn-text`(2026-11-26 토큰으로).
- 주의: 펼침 목록이 인라인 스타일로 되어 있다. 고칠 때는 `.popover` 클래스로 옮긴다(아래 추출 후보).

### NativeBackHandler
- 목적: Android 하드웨어 뒤로가기를 앱 규칙대로 처리한다. 없으면 어느 화면에서든 한 번에 앱이 백그라운드로 간다.
- 동작: 되돌아갈 곳이 있으면 이전 / 없으면 홈 / 홈이면 "한 번 더 누르면 앱이 닫힙니다" 뒤 백그라운드. 규칙은 `lib/backButton.js`(테스트 있음).
- 구분: 화면에 그리는 것이 없다. `App.jsx` 에 한 번만 있다. 웹에서는 아무것도 하지 않는다.
- 주의: 화면마다 따로 뒤로가기 리스너를 붙이지 않는다. 규칙이 갈라진다.

### Icons
- 목적: 선 굵기·크기가 같은 아이콘 16개를 한 파일에서. 화면마다 SVG 를 붙이면 굵기가 제각각이 된다.
- 쓰는 법: `<IconSearch width={20} height={20} />`. 색은 `currentColor` 를 따른다.
- 주의: 장식 아이콘의 `color: var(--text-faint)` 는 괜찮다. 같은 색을 **글자**에 쓰지 않는다(대비 2.7).

## 행동

**키보드 포커스(공통)**: `.btn` `.icon-btn` `.chip` `.segment button` `.tabbar a` `.list-row` `.fab` `.action-tile` 은 키보드로 옮기면 시안 2px 외곽선(`:focus-visible`, 2026-11-26). 마우스·터치에는 안 보인다. 새 버튼류 클래스를 만들면 이 목록에 넣는다.

### Button (`.btn`)
- 목적: 화면에서 할 일을 크기와 색으로 줄 세운다.
- 변형과 쓰임:
  - `primary`(네이비) - 확정. 저장·조회.
  - `signal`(시안) - 이 화면의 "지금 실행" **하나**.
  - `ghost`(흰 바탕·테두리) - 보조. 돌아가기·조회 뒤 다시 조회.
  - `danger`(빨강) - 무단 접수·삭제.
- 값: 폭 100%, 안쪽 15×18, 반경 13, 15/600. `.btn-row` 안에서 등분. 순서는 왼쪽부터 ghost → 실행 → danger.
- 주의: **한 화면에 `signal` 은 하나.** 지금 차량 상세가 어긋남([거주민에게 전화]와 [수정]이 둘 다 signal). `<a class="btn">` 로 전화 걸기에도 쓴다.
- 쓰지 말 때: 위계를 바꾸지 않는 보조 이동은 TextLink. 목록에서 새로 등록은 FAB.

### IconButton (`.icon-btn`)
- 목적: 글자 없이 뜻이 분명한 행동(전화·뒤로·내 정보)을 작게.
- 값: 보이는 크기 40px 정사각(누르는 영역 44px, `::after` inset -2px), 반경 12, 흰 바탕·`field-line` 테두리, 글자 `signal-cyan-deep`. 변형 `phone-action`(시안 미스트 바탕).
- 주의: 누르는 영역을 `::after` 로 넓혔으니 `.icon-btn` 에 다른 `::after` 를 쓰지 않는다. 아이콘 버튼끼리는 4px 이상 띄운다(영역이 겹치지 않게).
- 주의: `aria-label` 필수. 앱바 안에서는 AppBar 값으로 덮인다.
- 쓰지 말 때: 뜻이 아이콘만으로 모호한 행동(예: 출차 처리). 글자 버튼으로.

### FAB (`.fab`)
- 목적: 목록 화면의 "새로 등록". 스크롤해도 같은 자리에 있다.
- 값: 56px, 반경 18, `signal-cyan` 바탕, 탭바 위(아래 84px + 안전 영역).
- 주의: 한 화면에 하나. 빈 목록에서도 FAB 가 다음 행동이다(Empty 에 버튼을 따로 넣지 않는 이유).
- 쓰지 말 때: 폼·상세 화면. 탭바가 없는 화면에서는 위치가 뜬다.

### ActionTile (`.action-tile`)
- 목적: 홈의 빠른 등록 2열. 자주 쓰는 등록을 탭 이동 없이.
- 변형 `hot`: 아이콘 칸 시안. 가장 자주 쓰는 행동 하나에만.
- 쓰지 말 때: 홈 밖. 다른 화면은 Button 이나 ListRow.

## 입력

### Field
- 목적: 라벨·입력·힌트를 같은 간격으로 묶는다.
- 값: 라벨 12.5/600 + 입력 + 힌트 11.5 `slate-muted`. 필드 사이 14.
- 주의: 힌트는 읽어야 하는 글자다. `--text-faint` 로 되돌리지 않는다.

### TextInput / TextArea (`.input` `.textarea` `.select`)
- 값: 반경 12, 안쪽 13×14, **16px**, `field-line` 테두리. focus 는 시안 테두리 + 3px 링. TextArea 최소 84px.
- 주의: 글자를 16px 아래로 줄이지 않는다. iOS 가 입력란을 누를 때 화면을 확대해 버린다(화면 확대는 접근성 때문에 막지 않는다).

### 입력 + 조회 버튼 (패턴)
- 목적: 번호·아이디처럼 서버 확인이 필요한 칸. 차량번호 [적용], 아이디 [조회].
- 주의: 조회 전 primary → 조회 후 ghost. 값을 바꾸면 다시 조회해야 한다.

### ChipPicker (`.chip`)
- 목적: 몇 개 안 되는 값 중 하나(차종·색상·위치·유효시간)를 한 번 눌러 고른다.
- 상태: 기본 흰 바탕·`slate-muted` / `on` 네이비 채움·흰 글자.
- 접근성: 고른 칩에 `aria-pressed="true"`(2026-11-26). 화면 읽기 프로그램이 무엇이 골라졌는지 말한다.
- 쓰지 말 때: 값이 8개를 넘거나 자주 바뀌면 select. 목록 걸러보기는 Segment.

### Segment (`.segment`)
- 목적: 목록 걸러보기(전체/지정/방문/미등록 등). 고르면 바로 목록이 바뀐다.
- 값: 칸 높이 44px 이상.
- 쓰는 법: `<Segment options value onChange label="차량 걸러보기" />`. `label` 은 묶음 이름(`role="group"` 의 `aria-label`)이라 꼭 넣는다.
- 접근성: 칸마다 `aria-pressed`, `type="button"`(폼 안에서 눌러도 제출 안 됨). tablist 가 아닌 이유는 방향키 이동·tabpanel 연결을 약속하지 않기 때문.
- 쓰지 말 때: 저장할 값을 고를 때는 보통 ChipPicker. 예외로 거주민 폼의 "거주 유형"(2개)은 Segment 를 쓴다.

### SearchBar (`.searchbar`)
- 목적: 목록 안 찾기. 아이콘 + 테두리 없는 입력, 반경 13.
- 주의: 입력 자체 높이 24px. 감싼 카드를 눌러도 입력으로 가는지는 확인 안 함.

## 표시

### VerdictCard (`.verdict`) - 대표 부품
- 목적: "이 차가 여기 서도 되는가"를 1초 안에. 화면에서 가장 크고 진한 면.
- 구성: eyebrow 11 → 결과 30/700 → 이유 13 → 번호판 알약(Space Grotesk).
- 구분: **화면 전용.** `Verify.jsx` 에 컴포넌트, `VehicleDetail.jsx` 는 클래스만 직접 쓴다. 세 번째로 쓰게 되면 `components/` 로 옮긴다.
- 주의: 신호등 3색은 판정에만. ok=허용·거주 중, warn=조건부·방문·예정·종료, danger=무단·빈집.
- 이름: 차주가 있는 차는 어느 화면이든 "거주주차"(2026-11-26, P005-031). 저장값 "지정주차"(옛 값)도 같은 이름·같은 허용.
- 남은 감사: 주황 카드 위 13px 흰 글자 대비 2.8.

### Badge
- 목적: 목록 한 줄의 상태(지정·방문·빈집 등)를 오른쪽에 짧게.
- 변형: `ok` / `warn` / `danger` / `neutral`. 앞에 6px 점, 11.5/600, 알약.
- 색: 글자는 배지 전용 진한 톤 `--ok-text` #157a44 · `--warn-text` #a14a07 · `--danger-text` #b32e2c, 바탕은 각 Mist. 대비 4.8 / 5.3 / 5.3.
- 주의: 배지 글자에 `--ok`·`--warn`·`--danger` 를 다시 쓰지 않는다(대비 2.4~3.7, 2026-11-26 고침).
- 쓰지 말 때: 판정 결과. 그건 VerdictCard.

### KPI (`.kpi-row` `.kpi`)
- 목적: 홈에서 숫자 하나로 상황 파악(무단·방문·빈집 수). 누르면 그 조건으로 걸러진 목록.
- 구분: 화면 전용(`Home.jsx`). 거주민 화면은 클래스만 3열로.
- 변형: `accent`(시안 숫자) / `danger`(빨강 숫자). 라벨 11px.

### Card (`.card`)
- 목적: 한 덩어리 정보의 바탕. 흰 바탕, 반경 16, 안쪽 16, 카드 사이 12.
- 쓰지 말 때: 카드 안에 또 카드. 안쪽 구분은 DetailLine 이나 `hairline` 선으로.

### ListRow (`.list-row`)
- 목적: 목록 한 줄 = 아바타 + 제목·메타 + 오른쪽 배지. 행 전체가 `button`.
- 구조: `.grow` 는 세로 flex. 제목·메타·작은 배지를 `<span>` 으로 넣어도 줄이 나뉜다(행이 `button` 이라 `div` 를 못 넣는다). 2026-11-26 전에는 "102호미등록"처럼 붙고 "초과(2)" 가 꺾였다.
- 주의: 메타 줄 안 작은 배지는 `white-space: nowrap`.

### DetailLine (`.detail-line`)
- 목적: 상세 화면의 라벨 ↔ 값 한 줄. 빈 값은 "-".
- 주의: 상세 정보는 카드 하나에 모은다.

### SectionTitle (`.section-title`)
- 목적: 화면 안 구역 나누기. 12/600, 대문자, 자간 0.06em, `slate-muted`.
- 주의: 2026-11-26 `faded-slate` → `slate-muted` 로 바꿨다(대비 2.7 → 5.1).

### MiniBars (`.bars`)
- 목적: 홈 주간 방문 흐름. 높이 120.
- 구분: 화면 전용(`Home.jsx`).
- 남은 감사: 시안 그라데이션 막대. 시안이 "지금 실행" 밖에서 쓰이는 곳.

## 피드백

### Toast
- 목적: 결과를 화면을 떠나지 않고 짧게 알린다. 아래 가운데, 2.6초, 한 번에 하나. 기본 `ink`, 오류 `stop-red`.
- 쓰는 법: `const toast = useToast(); toast("저장되었습니다")`.
- 주의: 오류 문장은 직접 쓰지 말고 `lib/apiError.js` 의 `errorMessage(err)` 로. 상황별 문장이 한 곳에 모여 있다.
- 쓰지 말 때: 사용자가 반드시 읽고 결정해야 하는 것(삭제 확인 등). 확인창으로.

### Loading / Empty
- 목적: 기다리는 중과 비어 있음을 구분해 보여 준다.
- Loading: 22px 스피너. Empty: 56px 회색 아이콘 칸 + 제목 + 힌트 13(`slate-muted`).
- 주의: 목록 호출이 실패하면 Empty 가 아니라 오류 토스트다. 실패를 빈 화면으로 보이게 하지 않는다(홈은 아직 그렇게 보인다 - `design/system.md` 3장).

### TextLink (`.text-link`)
- 목적: 위계를 바꾸지 않는 보조 이동("로그인 없이 데모 구경하기"). 13px `slate-muted` + 밑줄.

## 번호판 인식

### PlateScanDemo (`.scan-demo`, 웹 데모 전용)
- 목적: 웹 둘러보기에서 앱 인식 화면의 흐름만 보여 준다. 실제 인식은 하지 않는다.
- 배치: 위 닫기 / 가운데 3:1 박스 / 아래 [직접 입력]. 오른쪽 위 꼬리표 "예시 화면 · 실제 인식은 Android 앱에서".
- 주의: 꼬리표를 빼지 않는다. 웹에서 인식이 되는 줄 오해한다.

### ScanActivity (Android 네이티브)
- 목적: 실제 번호판 인식. 구현 `frontend/android/app/src/main/res/layout/activity_scan.xml`, `PlateGuideView.kt`.
- 배치: 위 왼쪽 닫기 / 위 오른쪽 플래시 / 가운데 가이드 박스(가로 85%·3:1) / 아래 "직접 입력".
- 주의: 박스 위치·플래시 밝기·반사는 실기기에서만 확인된다(아직 안 함).

### 앱 아이콘 (Android)
- 짙은 남색 바탕 + 흰 P + 시안 조준선. PWA 아이콘과 다르다(통일할지는 정하지 않음).

## 추출 후보 (코드는 아직 안 바꿈)

반복이 3번 이상이고 뜻이 같은 것만. 옮기는 작업은 사람 결정 뒤에 한다.

| 후보 | 지금 | 옮기면 |
|---|---|---|
| 판정 그라데이션 진한 쪽 | `#b9740f` 등이 `.verdict` 안에 | 토큰 3개 |
| 트랙 회색 `--segment-well` | `#eef1f7` 이 세그먼트·중립 배지에 따로 | 토큰 1개 |
| 인라인 스타일 | JSX `style={{}}` 150곳(`marginTop` 55, `fontSize` 31) | 간격 유틸 또는 props |
| 벨 펼침 목록 | `NotificationBell.jsx` 인라인 스타일 | `.popover` + `.popover-item` |
| 상세 정보 묶음 | 차종·모델·색상·타워 DetailLine 4줄이 권한 확인·차량 상세에 반복 | `VehicleFacts` 컴포넌트 |
| VerdictCard | 2화면에서 다른 방식으로 | `components/` 공용 부품 |
