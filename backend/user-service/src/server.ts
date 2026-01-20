import "dotenv/config";
import app from "./app.ts";
import logger from "../../shared/src/logger/logger.ts";
import prisma from "./config/db.ts";
import { consumeUserEvents } from "./events/userConsumer.ts";

const PORT = process.env.USER_SERVICE_PORT || 5003;

async function start() {
  try {
    await prisma.$connect();
    logger.info("User DB connected");

    // Start Consumer
    await consumeUserEvents();

    app.listen(PORT, () =>
      logger.info(`User Service running on port ${PORT}`)
    );
  } catch (err) {
    logger.error("User service failed", err);
    process.exit(1);
  }
}

start();
