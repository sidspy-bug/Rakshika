# syntax=docker/dockerfile:1
FROM python:3.11-slim as builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install poetry or use pip (We'll use pip for simplicity if requirements.txt isn't available, but wait, do we have requirements.txt?)
# Since this is a monorepo structure, we will just install fastapi, uvicorn, sqlalchemy, etc.
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install runtime dependencies (like libpq)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache /wheels/*

# Argument for which service to run (e.g. auth-service, user-service)
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}

# Copy shared library
COPY services/shared /app/services/shared

# Copy the specific service
COPY services/${SERVICE_NAME} /app/services/${SERVICE_NAME}

EXPOSE 8000

# Start command
CMD uvicorn services.${SERVICE_NAME}.app.main:app --host 0.0.0.0 --port 8000
