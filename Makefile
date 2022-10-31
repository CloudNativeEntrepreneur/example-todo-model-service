LOCAL_DEV_CLUSTER ?= kind-local-dev-cluster
NOW := $(shell date +%m_%d_%Y_%H_%M)
SERVICE_NAME := example-todo-model-service
DEBUG ?= example*

onboard: install create-env-file

create-env-file:
	./scripts/create-env-file.sh

dev:
	DEBUG=$(DEBUG) npm run dev

install:
	npm ci

open:
	code .
