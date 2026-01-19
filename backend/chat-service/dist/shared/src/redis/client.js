import { createClient } from "redis";
import logger from "../logger/logger.js";
const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.on("connect", () => {
    logger.info("Redis connected");
});
redisClient.on("error", (err) => {
    logger.error("Redis connection error", err);
});
export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        logger.info("Redis client connected successfully");
    }
};
export default redisClient;
//# sourceMappingURL=client.js.map