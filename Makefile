.DEFAULT_GOAL := bootstrap

.PHONY: bootstrap up down logs db-migrate db-seed codegen checkov

bootstrap:
	@bash iaac/scripts/bootstrap.sh

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-migrate:
	docker compose exec backend npm run db:migrate:up

db-seed:
	docker compose exec backend npm run db:seed

codegen:
	docker compose exec frontend pnpm codegen

checkov:
	checkov -d iaac/ --framework terraform --output cli --config-file iaac/checkov.yaml
