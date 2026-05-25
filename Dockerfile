FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (add as needed for http libs, ca, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY actions ./actions
COPY workflows ./workflows
COPY lookups ./lookups

RUN pip install --upgrade pip && pip install -e .

# Default command is a no-op; Tracecat will mount/load these in its runtime.
CMD ["python", "-c", "print('Janus Forge integrations image ready')"]

