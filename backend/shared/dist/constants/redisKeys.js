export const REDIS_KEYS = {
    otp: (email) => `otp:${email}`,
    otpFail: (email) => `otp_fail:${email}`,
    otpLock: (email) => `otp_lock:${email}`,
    refreshToken: (userId) => `refresh:${userId}`,
    rateLimit: (ip, path) => `rate_limit:${ip}:${path}`,
};
//# sourceMappingURL=redisKeys.js.map