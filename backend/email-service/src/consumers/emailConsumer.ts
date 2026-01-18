import type{ Channel } from "amqplib";
import logger from "../../../shared/src/logger/logger.ts";
import { retry } from "../utils/retryUtils.ts";
import { sendOtpEmail } from "../services/emailService.ts";
import { QUEUES } from "../../../shared/src/constants/queues.ts";

export async function consumeEmailOtp(channel: Channel) {
  await channel.assertQueue(QUEUES.SEND_OTP, { durable: true });

  channel.consume(QUEUES.SEND_OTP, async msg => {
    if (!msg) return;

    try {
      const { email, otp } = JSON.parse(msg.content.toString());
      await retry(() => sendOtpEmail(email, otp));
      channel.ack(msg);
    } catch (error) {
      logger.error("Email OTP failed", error);
      channel.nack(msg, false, false);
    }
  });

  logger.info(`📥 Listening EMAIL OTP queue`);
}
