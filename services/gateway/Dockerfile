# syntax=docker/dockerfile:1

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY services/shared/requirements.txt /app/services/shared/requirements.txt
COPY services/gateway/requirements.txt /app/services/gateway/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/services/gateway/requirements.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "services.gateway.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

