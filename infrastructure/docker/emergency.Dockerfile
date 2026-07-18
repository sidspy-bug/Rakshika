FROM python:3.11-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache /wheels/*
COPY services/shared ./services/shared
COPY services/emergency-service ./services/emergency_service
RUN touch ./services/__init__.py
EXPOSE 8000
CMD ["uvicorn", "services.emergency_service.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
