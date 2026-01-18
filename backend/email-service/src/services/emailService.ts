import { mailTransporter } from "../config/mailConfig.ts";
import logger from "../../../shared/src/logger/logger.ts";

export async function sendOtpEmail(email: string, otp: string) {
  await mailTransporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`
  });

  logger.info(`📧 OTP email sent to ${email}`);
}
