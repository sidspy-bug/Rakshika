# syntax=docker/dockerfile:1

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY services/shared/requirements.txt /app/services/shared/requirements.txt
COPY services/auth-service/requirements.txt /app/services/auth-service/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/services/auth-service/requirements.txt

COPY . /app

EXPOSE 8001

CMD ["uvicorn", "services.auth-service.app.main:app", "--host", "0.0.0.0", "--port", "8001"]

