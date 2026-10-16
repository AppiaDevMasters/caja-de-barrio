FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH"

WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY servidor ./servidor

ENV PUERTO=8104
EXPOSE 8104
CMD ["python", "-m", "servidor.main"]
