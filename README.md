# 주차 관리 (Parking Desk)

소규모 공동주택의 경비·관리 담당자와 거주민이 휴대폰으로 "이 차가 여기 서도 되는가"를 판정하고,
방문차량·무단주차를 기록하는 모바일 웹앱(PWA).

## 문서 색인 - 무엇이 궁금한가

| 질문 | 문서 |
|---|---|
| 화면 기능, 로컬 실행, 배포(Docker·Nginx), 환경변수 | `frontend/README.md` |
| API 구조, 권한 규칙, 테스트, 마이그레이션 주의 | `backend/README.md` |

## 구성

```
frontend/   React 18 + Vite SPA, PWA. 테스트: npm test
backend/    Django 5 + DRF API. 테스트: sh run_tests.sh
docker-compose.yml
```
