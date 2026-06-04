FROM python:3.11-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY pyproject.toml ./
# Create minimal package structure so pip install works
RUN mkdir -p app && touch app/__init__.py
RUN pip install --no-cache-dir .

FROM deps AS production
# Remove the placeholder and copy real app code
RUN rm -rf app/
COPY app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
