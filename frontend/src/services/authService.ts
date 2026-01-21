import { api } from "./Api";

const authService = {
    // Backend initiates OTP flow for login
    login: async (email: string) => {
        const response = await api.post("/auth/login", { email });
        return response.data;
    },

    register: async (email: string, password: string, fullName: string) => {
        const response = await api.post("/auth/register", { email, password, fullName });
        return response.data;
    },

    logout: async (userId: string, refreshToken: string) => {
        const response = await api.post("/auth/logout", { userId, refreshToken });
        return response.data;
    },

    verifyLogin: async (email: string, otp: string) => {
        const response = await api.post("/auth/verify-login", { email, otp });
        return response.data;
    },

    refreshToken: async (userId: string, refreshToken: string) => {
        const response = await api.post("/auth/refresh", { userId, refreshToken });
        return response.data;
    },

    forgotPassword: async (email: string) => {
        const response = await api.post("/auth/forgot-password", { email });
        return response.data;
    },

    resetPassword: async (email: string, otp: string, newPassword: string) => {
        const response = await api.post("/auth/reset-password", { email, otp, newPassword });
        return response.data;
    },

    verifyEmail: async (email: string, otp: string) => {
        const response = await api.post("/auth/verify-email", { email, otp });
        return response.data;
    }
};

export default authService;