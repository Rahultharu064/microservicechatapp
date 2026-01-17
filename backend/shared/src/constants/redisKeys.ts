export const REDIS_KEYS = {
  otp: (email: string) => `otp:${email}`,
  otpFail: (email: string) => `otp_fail:${email}`,
  otpLock: (email: string) => `otp_lock:${email}`,

  refreshToken: (userId: string) => `refresh:${userId}`,

  rateLimit: (ip: string, path: string) =>
    `rate_limit:${ip}:${path}`,
};
