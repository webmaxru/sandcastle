# Sandcastle backend: FastAPI + GitHub Copilot CLI runtime.
# The agent-framework provider spawns the `copilot` CLI, so the image ships Node 22 + @github/copilot.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps + Node.js 22 (required by @github/copilot) + git
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates git gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g @github/copilot \
    && apt-get purge -y gnupg \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend/ ./backend/

# Non-root user + writable dirs (session sandbox + copilot state)
RUN useradd -m -u 1001 appuser \
    && mkdir -p /app/backend/.sessions /home/appuser/.copilot \
    && chown -R appuser:appuser /app /home/appuser
USER appuser

ENV GITHUB_COPILOT_BASE_DIRECTORY=/home/appuser/.copilot \
    SANDCASTLE_SESSIONS_ROOT=/app/backend/.sessions \
    PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
