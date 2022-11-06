import debug from "debug";
import { persistenceLayer } from "sourced-repo-typeorm";
import axios from "axios";

// Note: The parts of these tests that are commented out because they are not currently in use, though they are a good patterns.
// They'll likely return when this model has more than a "create fake todo" command.
// If it's been awhile, and they haven't, feel free to delete them :)

const info = debug("tests");
const error = debug("tests:error");

const todoModelUrl = process.env.TODO_MODEL_URL || "http://localhost:5002";

const sourced = {
  psql: {
    url:
      process.env.SOURCED_POSTGRESQL_URL ||
      "postgresql://sourced:sourced@localhost:5433/sourced?sslmode=disable",
    schema: "public",
    synchronize: process.env.SOURCED_SCHEMA_SYNC === "false" ? false : true,
    ssl: {
      rejectUnauthorized: false,
    },
  },
};

const post = async (event, payload, session = {}): Promise<any> => {
  const url = `${todoModelUrl}/${event}`;
  info("Posting to ", url);
  return axios.post(url, {
    action: {
      name: event,
    },
    input: {
      ...payload,
    },
    session_variables: {
      ...session,
    },
  });
};
const send = post;

const get = async (path) => {
  const url = `${todoModelUrl}/${path}`;
  info("Getting from ", url);
  return axios.get(url);
};

describe("todo model integration tests", () => {
  // let repository

  beforeAll(async () => {
    info("connecting to psql");
    try {
      await persistenceLayer.connect({
        type: "postgres" as const,
        url: sourced.psql.url,
        schema: sourced.psql.schema,
        synchronize: sourced.psql.synchronize,
        extra: {
          ssl: {
            rejectUnauthorized: sourced.psql.ssl.rejectUnauthorized,
          },
        },
      });
    } catch (err) {
      error("Error connecting to psql");
      error(err);
      process.exit(1);
    }
    info("connected to psql");
  });

  afterAll(async () => {
    info("disconnecting from psql");
    await persistenceLayer.disconnect();
  });

  it("should respond 200 to healthcheck", async () => {
    info("Starting healthcheck test");

    const healthCheck = await get("health");
    expect(healthCheck.status).toBe(200);
  });

  it("should get 401 when calling todo.initialize without auth session info", async () => {
    info("sending command todo.initialize");
    let response;
    try {
      response = await send("todo.initialize", {
        todo: "integration tests",
      });
    } catch (err: any) {
      expect(err.response.status).toBe(401);
    }
  });

  it("should get 201 when calling todo.initialize with auth session info", async () => {
    info("sending command todo.initialize");
    const initializeTodoResponse = await send(
      "todo.initialize",
      {
        todo: "integration tests",
      },
      {
        "x-hasura-user-id": "0x0TestUser1",
      }
    );

    expect(initializeTodoResponse.status).toBe(200);
    expect(initializeTodoResponse.data.id).toBeDefined();
    expect(initializeTodoResponse.data.todo).toBe("integration tests");

    info("sending command todo.complete");
    const completeTodoResponse = await send(
      "todo.complete",
      {
        id: initializeTodoResponse.data.id,
      },
      {
        "x-hasura-user-id": "0x0TestUser1",
      }
    );

    expect(completeTodoResponse.status).toBe(200);
  });
});
