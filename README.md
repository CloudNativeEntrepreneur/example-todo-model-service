# example-todo-model-service

The ToDo Model.

## Architecture

This is a model service that uses event sourcing in a CQRS/ES+AR architecture. Model services represent an event sourced aggregate. They should define a commands broker for receiving commands, and an events broker for publishing events. These can be found in the `charts` directory.

## Testing

### Unit Tests

Unit tests should not hit any external dependencies. Use mocks. 

100% Code Coverage is required for tests to pass.

To setup local unit tests, run:

```bash
npm ci
```

To run the unit tests, run:

```bash
npm t
# or
npm run test
```

To run the unit tests in watch mode, run:

```bash
npm run test:watch
```

### Integration Tests

Integrations tests should be performed against running services and sometimes their dependencies are required as well.

You can run these tests in two ways:

1. Locally, against a PostgreSQL Database via docker-compose
2. In the local development cluster

#### Local integration tests

First, in a terminal, start the PostgreSQL database with:

```
docker-compose up
```

This will leave the database running via Docker in your terminal. You can also run docker-compose services in the background by using the `-d` flag.

Once the database is running, start the service in debug mode by clicking the play icon with a bug on the left hand menu of VSCode, and then "Debug" at the top of the pane that opens, or alternatively, run without the debugging with:

```
npm run dev
```

And finally, run the integration tests against your running service with:

```
npm run test:integration
```

To start the tests in watch mode run, which will rerun as you make code changes:

```
npm run test:integration:watch
```

#### Local development cluster integration tests

To run these tests locally, first set up a [local-development-cluster](https://github.com/cloudnativeentrepreneur/local-development-cluster), and then run the following to deploy a local copy of your app that local cluster:

```bash
make refresh-kind-image
```

Or


```bash
make hard-refresh-kind-image
```


Make sure `localizer` is running (`make localizer` in the [meta repo](https://github.com/cloudnativeentrepreneur/cne-meta), then, trigger the integration tests using:

```
npm run test:integration
```

## Linting

To format the code automatically and fix any automatically fixable errors, run:

```
npm run lint:fix
```
