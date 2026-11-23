# 주차 관리 (Parking Desk)

소규모 공동주택의 경비·관리 담당자와 거주민이 휴대폰으로 "이 차가 여기 서도 되는가"를 판정하고,
방문차량·무단주차를 기록하는 모바일 웹앱(PWA).

## 문서 색인 - 무엇이 궁금한가

| 질문 | 문서 |
|---|---|
| 화면 기능, 로컬 실행, 배포(Docker·Nginx), 환경변수 | `frontend/README.md` |
| API 구조, 권한 규칙, 테스트, 마이그레이션 주의 | `backend/README.md` |
| 디자인 시스템(색·글꼴·반경·그림자 토큰, 규칙) | `DESIGN.md` (impeccable 형식, 사이드카 `.impeccable/design.json`) |
| 화면 부품 카탈로그·추출 후보 | `docs/COMPONENTS.md` |
| 디자인 감사 보고 | `docs/design-audit-2026-11-23.md` |

## 구성

```
frontend/   React 18 + Vite SPA, PWA. 테스트: npm test
backend/    Django 5 + DRF API. 테스트: sh run_tests.sh
docker-compose.yml
```

## 운영 배포 구조

```
폰/브라우저 --HTTPS--> 서버 본체 nginx (/etc/nginx, 여러 사이트 공용, TLS 담당)
                       --> parking_lot_frontend 컨테이너 nginx (frontend/nginx.conf)
                           - 화면 파일, /api·/users 를 backend 로 프록시
                           - APK 전송(/protected-downloads/, ./downloads 마운트)
                       --> parking_lot_backend 컨테이너 (Django)
```

- 서버는 저장소의 `docker-compose.yml` 을 그대로 쓴다(`git pull` 후 `docker compose up -d --build`). 서버에서 이 파일을 손으로 고치면 다음 pull 때 충돌한다.
- `frontend/nginx.ssl.conf` 는 컨테이너가 HTTPS 를 직접 맡을 때만 쓴다. 지금 운영에서는 쓰지 않는다.

