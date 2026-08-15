## Makefile — tareas de desarrollo y despliegue local

.PHONY: help build up down logs backend-shell test-backend

help:
	@echo "Make targets: build, up, down, logs, backend-shell, test-backend"

build:
	@echo "Building docker images..."
	docker compose build --pull

up:
	@echo "Starting services (detached)"
	docker compose up -d --build

down:
	@echo "Stopping services"
	docker compose down

logs:
	@echo "Tailing compose logs"
	docker compose logs -f --tail=200

backend-shell:
	@echo "Open a shell inside the backend service"
	docker compose run --rm backend sh

test-backend:
	@echo "Run backend tests inside container (depends on image)
	docker compose run --rm backend pytest -q
