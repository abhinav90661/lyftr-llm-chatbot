.PHONY: up down build logs test

# Starts the entire stack with Docker Compose
up:
	docker compose up --build -d

# Stops and removes containers
down:
	docker compose down

# Builds images without starting
build:
	docker compose build

# Follow container logs
logs:
	docker compose logs -f

# Run backend unit & integration tests
test:
	cd backend && PYTHONPATH=. ./venv/bin/pytest -v
