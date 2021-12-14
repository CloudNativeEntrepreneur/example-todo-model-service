#!/bin/sh
export PG_PASS=$(kubectl get secret sourced.example-sourced-db-postgresql.credentials.postgresql.acid.zalan.do -o jsonpath={.data.password} | base64 -D)
export SOURCED_POSTGRESQL_URL="postgresql://sourced:${PG_PASS}@example-sourced-db-postgresql.default.svc.cluster.local:5432/sourced"

cat .env > .local.env
echo "\nSOURCED_POSTGRESQL_URL=${SOURCED_POSTGRESQL_URL}" >> .local.env