# 주차 관리 프론트엔드 (Parking Management SPA)

아파트/빌라 주차를 관리하는 모바일 우선 웹앱입니다. React + Vite로 만들었고, Django(JWT) 백엔드와 `/api`·`/users` 경로로 통신합니다.

## 주요 기능

- **인증** — 로그인 / 회원가입(가입 시 거주민 프로필 동시 생성) / 토큰 자동 갱신 / 비밀번호 변경
- **차량 관리** — 거주/방문 차량 등록·수정·삭제, 차주 지정 해제(→무단주차 전환), 지정주차 초과 표시
- **방문차량 티켓** — 유효시간(6/12/24h) 선택, 출차까지 남은시간 표시, 출차 30분 전까지 재등록 차단
- **알림 벨** — 내가 호스트인 방문차량의 출차 임박(30/15/5분)을 상단 벨에 목록으로 표시
- **거주민 관리** — 세대(동·호수) 배정, 빈집/거주 현황, 현재 거주민 연결
- **무단주차** — 빠른 접수, 출차 처리
- **주차 권한 확인** — 차량번호로 실시간 조회(무단/거주/방문 판정)
- **게시판** — 글/댓글

## 기술 스택

React 18 · Vite · React Router · Axios · Nginx(배포) · Docker

---

## 로컬 개발

```bash
npm install
npm run dev          # http://localhost:5173  (실제 백엔드 사용)
npm run dev:mock     # 백엔드 없이 데모 데이터로 실행 (VITE_MOCK=1)
```

빌드 / 미리보기:

```bash
npm run build        # dist/ 생성
npm run preview      # 빌드 결과 미리보기
```

### 목(mock) 모드

`VITE_MOCK=1` 이면 인메모리 데모 데이터로 동작합니다(백엔드 불필요). 아무 아이디로 로그인되고 시드 데이터가 로드됩니다.

---

## 백엔드 연결 설정

프론트는 항상 `/api/...`, `/users/...` 로 호출합니다. 이 요청을 어디로 보낼지 두 가지 방식이 있습니다.

| 변수 | 용도 | 기본값 |
|---|---|---|
| `VITE_API_BASE` | 브라우저가 **직접** 호출할 백엔드 절대주소(빌드 타임에 고정). 비우면 same-origin. | 빈 값 |
| `BACKEND_ORIGIN` | **dev 서버**(`vite.config.js`)의 프록시 대상 | `http://localhost:8000` |

- **권장:** `VITE_API_BASE`는 **비워두고**(same-origin), dev는 Vite 프록시 / 배포는 Nginx 프록시가 `/api`·`/users`를 백엔드로 전달 → **CORS 불필요**.
- 브라우저가 다른 호스트의 백엔드를 직접 부르게 하려면 빌드 시 `VITE_API_BASE=http://backend-host:port` (이 경우 백엔드 CORS 허용 필요).

---

## Docker 배포

> compose의 두 서비스는 **profile** 뒤에 있습니다. 프로필을 지정하지 않으면 `no service selected` 가 납니다. 반드시 `--profile prod` 또는 `--profile dev` 를 붙이세요.

### 운영 (Nginx + 빌드된 dist) — 권장

```bash
docker compose --profile prod up -d --build
```

- 프론트: `http://localhost:5173` (컨테이너 80 → 호스트 5173)
- `/api`·`/users` 는 **Nginx가 백엔드로 프록시** (`nginx.standalone.conf`).
- `--profile` 은 `up` **앞**(전역 옵션)에 와야 합니다: `docker compose --profile prod up ...`
- 프론트 소스를 바꿨으면 `--build` 로 재빌드(이미지에 dist가 구워짐). Nginx 설정만 바꿨으면 볼륨 마운트라 재빌드 없이 재기동으로 반영됩니다.

**백엔드 주소 바꾸기(운영):** `nginx.standalone.conf` 의 두 upstream을 백엔드 주소로:

```nginx
location /api/   { set $upstream       http://<backend-host>:<port>; proxy_pass $upstream; ... }
location /users/ { set $upstream_users http://<backend-host>:<port>; proxy_pass $upstream_users; ... }
```

> 백엔드 Django `ALLOWED_HOSTS` 에 접속 호스트가 포함돼야 합니다(없으면 400).

### 개발 (Vite 핫리로드)

```bash
docker compose --profile dev up -d --build
# 백엔드 지정: BACKEND_ORIGIN=http://<backend-host>:<port> docker compose --profile dev up -d
```

### 유용한 명령

```bash
docker compose --profile prod logs -f      # 로그
docker compose --profile prod down         # 중지/삭제
```

> `.env` 에 `COMPOSE_PROFILES=prod` 를 넣으면 이후 `docker compose up -d` 만으로 prod가 뜹니다.

---

## 환경 변수 요약

| 변수 | 예시 | 설명 |
|---|---|---|
| `VITE_MOCK` | `1` | 목 모드(백엔드 불필요) |
| `VITE_API_BASE` | `http://host:port` | 브라우저 직접 호출용 백엔드 주소(비우면 same-origin) |
| `BACKEND_ORIGIN` | `http://host:port` | dev 프록시 대상 |
| `ALLOWED_HOSTS` | `a.com,b.com` | Vite dev 서버 접근 허용 호스트(콤마 구분) |

`.env.example`, `.env.mock` 참고.

---

## 프로젝트 구조

```
src/
  api/          axios 클라이언트, 리소스 CRUD, 인증, 목 데이터
  components/   공용 UI(AppBar/Shell/Tab/Toast), 폼, 아이콘, 알림 벨
  lib/          도메인 로직(판정/유효시간/포맷/enum)
  pages/        화면(Home, Vehicles, Residents, Unauthorized, Verify, Board ...)
Dockerfile              운영 이미지(빌드 → nginx)
Dockerfile.dev          개발 이미지(Vite)
docker-compose.yml      prod/dev 프로필
nginx.conf              compose 내부 backend 서비스로 프록시
nginx.standalone.conf   외부 백엔드로 프록시(운영 기본 마운트)
vite.config.js          dev 프록시 / 허용 호스트
```

## 참고 (도메인 규칙)

- **아이디**는 입력 시 자동으로 소문자로 정규화됩니다.
- **판정**: 차주 없음 → 무단주차, 차주 있음 → 지정주차, 방문 기록/방문주차 → 방문주차.
- **소프트 삭제**: 삭제는 `is_deleted=True`(하드 삭제 아님). 목록은 활성만, 조회/복원은 `soft_delete_mode=all`.
- **방문 티켓 시각/알림**은 백엔드가 계산·발송(`parking_start_time`/`parking_end_time`, 30/15/5분 알림). 프론트는 남은시간 표시·보조 알림.
