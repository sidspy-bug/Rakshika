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

# Convert hyphens to underscores for Python module paths
RUN MODULE_NAME=$(echo ${SERVICE_NAME} | tr '-' '_') && echo $MODULE_NAME > /app/.module_name

# Copy shared library
COPY services/shared /app/services/shared

# Copy the specific service (rename to use underscores for valid Python imports)
COPY services/${SERVICE_NAME} /app/services/${SERVICE_NAME}
RUN MODULE_NAME=$(cat /app/.module_name) && \
    if [ "${SERVICE_NAME}" != "$MODULE_NAME" ]; then \
        mv /app/services/${SERVICE_NAME} /app/services/$MODULE_NAME; \
    fi

# Create services package init
RUN touch /app/services/__init__.py

EXPOSE 8000

# Start command (convert hyphens to underscores for Python import)
CMD sh -c "MODULE_NAME=$(cat /app/.module_name) && uvicorn services.${MODULE_NAME}.app.main:app --host 0.0.0.0 --port 8000"
