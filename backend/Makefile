.PHONY: run dev lint format typecheck test compile migrate migration docker-up docker-down

run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000

dev:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

lint:
	ruff check app tests

format:
	ruff format app tests

typecheck:
	mypy app

test:
	pytest

compile:
	python -m compileall app

migrate:
	alembic upgrade head

migration:
	alembic revision --autogenerate -m "$${MSG:-migration}"

docker-up:
	docker compose up --build

docker-down:
	docker compose down
