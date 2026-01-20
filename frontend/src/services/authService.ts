import { api } from "./Api";


const authService ={
    login: async (username: string, password: string) => {
        const response = await api.post("/auth/login", { username, password });
        return response.data;
    },

    register: async (username: string, password: string, email: string) => {
        const response = await api.post("/auth/register", { username, password, email });
        return response.data;
    },
    logout: async () => {
        const response = await api.post("/auth/logout");
        return response.data;
    } ,
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
    },
    


}


export default authService;