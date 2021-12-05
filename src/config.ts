export const config = {
  bus: {
    aggregates: {
      todo: {
        events:
          process.env.TODO_EVENTS_BROKER_URL ||
          "http://broker-ingress.knative-eventing.svc.cluster.local/default/todo-events",
      },
    },
    source: "example-todo-model-service",
  },

  denormalizers: {
    "example-hasura-readmodel":
      process.env.CNE_HASURA_DENORMALIZER_URL || "http://localhost:5010",
  },

  enableSyncSendToDenormalizer:
    process.env.ENABLE_SYNC_SEND_TO_DENORMALIZER === "false" ? false : true,

  enableEventPublishing: process.env.ENABLE_EVENT_PUBLISHING === "true",

  handlerBasePath: process.env.HANDLER_BASE_PATH || "src",

  port: parseInt(process.env.PORT || "", 10) || 5002,

  sourced: {
    psql: {
      url:
        process.env.SOURCED_POSTGRESQL_URL ||
        "postgresql://sourced:sourced@localhost:5433/sourced?sslmode=disable",
      schema: "public",
      synchronize: false,
      ssl: {
        rejectUnauthorized: false,
      },
    },
  },
};
