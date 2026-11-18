#!/usr/bin/env sh
# 로컬 테스트 실행. 운영·개발 DB 대신 일회용 Postgres 컨테이너를 쓴다.
# 모델 테이블 이름에 스키마("parking_lot".xxx)가 박혀 있어 SQLite 로는 못 돌린다.
#
# 처음 한 번:
#   docker run -d --name p005-test-pg -e POSTGRES_PASSWORD=localtest \
#     -p 127.0.0.1:55432:5432 postgres:16-alpine
#   docker exec p005-test-pg psql -U postgres -d template1 -c 'CREATE SCHEMA parking_lot;'
# (template1 에 스키마를 만들어 두면 Django 가 만드는 테스트 DB 가 그대로 물려받는다.)
set -e
cd "$(dirname "$0")"
export DJANGO_SECRET_KEY=local-test-only
export DJANGO_DEBUG=False
export ACTIVE_DB=dev
export DEV_DB_NAME=p005
export DEV_DB_USER=postgres
export DEV_DB_PASSWORD=localtest
export DEV_DB_HOST=127.0.0.1
export DEV_DB_PORT=55432
exec python manage.py test parking_management --noinput "$@"
