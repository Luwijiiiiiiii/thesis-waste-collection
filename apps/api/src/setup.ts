import RedisUtil from "./utils/redis.util.js";

export default async () => {
  await RedisUtil.initialize();
};
