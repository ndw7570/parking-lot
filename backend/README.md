# 주차 관리 백엔드 (Django REST)

주차 관리 SPA(`../frontend`)가 쓰는 API 서버. Django 5 · DRF · SimpleJWT · PostgreSQL.

## 구조

```
core/                  설정, 공통 ViewSet(소프트 삭제·필터·페이지), 권한(permissions.py)
  constants/filters.py   리소스별 허용 조회 조건
users/                 회원가입·로그인 사용자(me)·비밀번호 변경
parking_management/    주차 도메인
  models/parking/        세대(dong_ho), 거주민 프로필, 차량, 방문 티켓, 무단주차 기록
  models/posts/          게시판 글·댓글·좋아요
  views/                 리소스 ViewSet + 일반 사용자 쓰기 규칙(can_*)
  tests/                 API 테스트
```

API: `/api/parking/<리소스>/` (vehicle, user-profile, dong-ho, visitant, unauthorized-parking-record, post, comment, post-like, comment-like, attachment-file), 인증 `/users/auth/...`, 문서 `/docs/`.

## 권한

- 읽기: 로그인한 사용자 누구나.
- 쓰기: **관리자**(`is_staff` 또는 `is_superuser`)는 전부. 일반 사용자는 각 ViewSet 의 `can_create / can_change / can_delete` 가 허용한 것만 (본인 차량·티켓·프로필·글 등).
- 규칙을 선언하지 않은 리소스는 관리자만 쓴다(기본 거절).
- 관리자는 **계정 플래그로만** 정한다. 아이디 문자열로 판정하지 않는다.
- `DJANGO_DEBUG=True` 면 권한 검사를 끈다(개발용). 운영에서 켜지 않는다.

## 주요 규칙

- **소프트 삭제**: DELETE 는 `is_deleted=True` 만 켠다. `?soft_delete_mode=all|deleted` 로 조회, `PATCH .../{id}/restore/` 로 복구. 같은 값의 살아 있는 행이 있으면 복구는 400.
- **방문 티켓**: `valid_hours` 는 6/12/24 필수. 시작·종료 시각은 서버가 정한다. 유효 티켓이 30분 넘게 남았으면 재발급 400.
- **무단주차 처리자**: 열린 기록을 닫은(종료 시각을 넣은) 계정을 서버가 `processed_by` 에 남긴다.
- **조회 조건**: 허용 목록 밖의 쿼리 파라미터는 400. 차량 번호는 `plate_number`(정확 일치, 중복 검사용)와 `plate_number_contains`(부분 검색)를 구분한다.
- **전체 목록**: `?no_page=1` 이면 페이지를 나누지 않는다(프론트 기본). 페이지 크기 상한은 200.

## 실행

환경변수는 `.env.example` 참고(비밀값은 저장소에 넣지 않는다).

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## 테스트

모델 테이블 이름에 스키마(`"parking_lot".xxx`)가 박혀 있어 SQLite 로는 못 돌린다. 일회용 Postgres 컨테이너를 쓴다. 준비 명령은 `run_tests.sh` 머리말에 있다.

```bash
sh run_tests.sh            # 전체
sh run_tests.sh -k Visitant
```

## 마이그레이션 적용 시 주의

- `0007_like_unique_alive_only`: 좋아요 유일 제약을 "삭제 안 된 행끼리만"으로 바꾼다.
- `0008_unauthorized_processed_by`: 무단주차 기록에 처리자 칸을 추가한다. 이전 기록은 비어 있다.
- 운영 DB 에는 사람이 검토한 뒤 적용한다.
