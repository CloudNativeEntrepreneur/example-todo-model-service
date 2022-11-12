import path from "path";
import pino from "pino";
import { persistenceLayer } from "sourced-repo-typeorm";
import { config } from "../config.js";
import { microservice } from "knative-microservice";

const { port, sourced, handlerBasePath } = config;
const handlersPath = path.resolve(process.cwd(), handlerBasePath, "handlers");

export const start = async () => {
  const logger = pino();

  const connectionOptions = {
    type: "postgres" as const,
    url: sourced.psql.url,
    schema: sourced.psql.schema,
    synchronize: sourced.psql.synchronize,
    extra: {
      ssl: {
        rejectUnauthorized: sourced.psql.ssl.rejectUnauthorized,
      },
    },
  };

  logger.info({
    msg: "⏳ connecting to psql",
    sync: connectionOptions.synchronize,
    schema: connectionOptions.schema,
  });
  try {
    await persistenceLayer.connect(connectionOptions);
  } catch (error) {
    logger.error({ msg: "🚨 Error connecting to psql", error });
    process.exit(1);
  }
  logger.info("✅ connected to psql");

  const { server, shutdown, onListen } = await microservice({
    handlers: {
      path: handlersPath,
      options: {
        enableSyncSendToDenormalizer: config.enableSyncSendToDenormalizer,
        enableEventPublishing: config.enableEventPublishing,
      },
    },
    logger,
  });

  server.listen(port, onListen(port));

  process.on("SIGTERM", shutdown(persistenceLayer));
};

await start();
