FROM python:3.11-slim

# 기본 패키지 설치 (psycopg2 빌드용)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# requirements 설치
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY . /app/

# Gunicorn 포트
EXPOSE 8000

# Django static 파일 (whitenoise 사용 시 필요)
# 워커 수는 compose 가 GUNICORN_WORKERS 로 넘긴다. bash -c 라 여기서 확장된다.
CMD ["bash", "-c", \
    "python manage.py collectstatic --noinput && \
     gunicorn core.wsgi:application --bind 0.0.0.0:8000 \
       --workers ${GUNICORN_WORKERS:-3} --timeout ${GUNICORN_TIMEOUT:-60} \
       --access-logfile - --error-logfile -"]
