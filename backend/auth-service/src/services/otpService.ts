import redisClient from "../../../shared/src/redis/client.ts";
import { createConnectRabbitMQ } from "../../../shared/src/rabbitmq/connection.ts";
import logger from "../../../shared/src/logger/logger.ts";
import { REDIS_KEYS } from "../../../shared/src/constants/redisKeys.ts";
import { QUEUES } from "../../../shared/src/constants/queues.ts";

const OTP_EXPIRY = Number(process.env.OTP_EXPIRY_SECONDS) || 300;
const MAX_FAILS = Number(process.env.MAX_OTP_ATTEMPTS) || 5;
const LOCK_TIME = 900;

export const generateOTP = async (email: string) => {
  const locked = await redisClient.exists(REDIS_KEYS.otpLock(email));
  if (locked) throw new Error("Account locked. Try later.");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.set(REDIS_KEYS.otp(email), otp, { EX: OTP_EXPIRY });

  const channel = await createConnectRabbitMQ();
  await channel.assertQueue(QUEUES.SEND_OTP, { durable: true });
  channel.sendToQueue(QUEUES.SEND_OTP, Buffer.from(JSON.stringify({ email, otp })), { persistent: true });

  logger.info(`OTP generated and published for ${email}`);
};

export const verifyOTP = async (email: string, otp: string) => {
  const locked = await redisClient.exists(REDIS_KEYS.otpLock(email));
  if (locked) throw new Error("Account locked due to multiple failed attempts");

  const storedOtp = await redisClient.get(REDIS_KEYS.otp(email));
  if (!storedOtp || storedOtp !== otp) {
    const fails = await redisClient.incr(REDIS_KEYS.otpFail(email));
    if (fails === 1) await redisClient.expire(REDIS_KEYS.otpFail(email), LOCK_TIME);
    if (fails >= MAX_FAILS) await redisClient.set(REDIS_KEYS.otpLock(email), "locked", { EX: LOCK_TIME });
    throw new Error("Invalid OTP");
  }

  // Success
  await redisClient.del([REDIS_KEYS.otp(email), REDIS_KEYS.otpFail(email)]);
  logger.info(`OTP verified for ${email}`);
};
