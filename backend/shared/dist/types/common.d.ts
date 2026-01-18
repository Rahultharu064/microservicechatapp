export interface JwtPayload {
    userId: string;
    iat?: number;
    exp?: number;
}
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}
//# sourceMappingURL=common.d.ts.map