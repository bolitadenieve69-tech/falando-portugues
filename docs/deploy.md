# Deploy & local dev quick reference

Purpose
-------
Commands and notes to reproducibly build and run the Falando Portugues backend and supporting services locally and on the VPS.

Local development
-----------------
Prerequisites: Docker Engine & Docker Compose.

Build and start (detached):

```bash
make up
# or
./scripts/dev_up.sh
```

Tail logs:

```bash
make logs
```

Stop:

```bash
make down
```

Backend tests (inside container):

```bash
make test-backend
```

VPS minimal deploy (high level)
------------------------------
1. Copy `backend/.env.example` -> `backend/.env` on the VPS and fill keys.
2. Ensure `DB_PATH` points to a writable path on the VPS (default `falando.db`).
3. Pull repository, then run:

```bash
docker compose up -d --build
```

4. Caddy is used on the VPS for TLS; update `Caddyfile` to point to your domain (or use nip.io for testing).

Notes
-----
- Do NOT commit secrets into the repo; use environment variables on the VPS.
- For CI, run tests without relying on local Docker daemon (use service containers or matrix jobs).
