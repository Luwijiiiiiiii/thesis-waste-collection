import { createClient, type RedisClientType } from "redis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "../config.js";

export default class RedisUtil {
  static redisClient: RedisClientType | undefined;

  static async initialize() {
    // Redis is optional: without REDIS_HOST the API runs with no cache.
    if (!REDIS_HOST) return;

    const client: RedisClientType = createClient({
      password: REDIS_PASSWORD || undefined,
      socket: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    });
    client.on("error", (error) => console.error("Redis client error", error));
    await client.connect();
    RedisUtil.redisClient = client;
  }

  static useConnection() {
    return RedisUtil.redisClient;
  }

  static async close() {
    await RedisUtil.redisClient?.quit();
    RedisUtil.redisClient = undefined;
  }
}
