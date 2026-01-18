export declare const REDIS_KEYS: {
    otp: (email: string) => string;
    otpFail: (email: string) => string;
    otpLock: (email: string) => string;
    refreshToken: (userId: string) => string;
    rateLimit: (ip: string, path: string) => string;
};
//# sourceMappingURL=redisKeys.d.ts.map