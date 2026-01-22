import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import authService from "../services/authService";

export interface User {
    id: string;
    email: string;
    fullName: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (email: string) => Promise<void>;
    verifyLogin: (email: string, otp: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
    verifyEmail: (email: string, otp: string) => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return null;
        try { return JSON.parse(storedUser); } catch { return null; }
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem("accessToken"));

    const login = async (email: string) => {
        await authService.login(email);
        // Login initiates OTP, so we don't set tokens here
    };

    const verifyLogin = async (email: string, otp: string) => {
        const data = await authService.verifyLogin(email, otp);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Assuming the backend returns user info in the response, we can set it here.
        // If not, we might need to decode the token or fetch the profile.
        if (data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("userId", data.user.id);
        }

        setToken(data.accessToken);
        setIsAuthenticated(true);
    };

    const register = async (email: string, password: string, fullName: string) => {
        await authService.register(email, password, fullName);
        // Registration might send token or require verification. 
    };

    const forgotPassword = async (email: string) => {
        await authService.forgotPassword(email);
    };

    const resetPassword = async (email: string, otp: string, newPassword: string) => {
        await authService.resetPassword(email, otp, newPassword);
    };

    const verifyEmail = async (email: string, otp: string) => {
        await authService.verifyEmail(email, otp);
    };

    const refreshToken = async () => {
        const currentRefreshToken = localStorage.getItem("refreshToken");
        if (!currentRefreshToken) return;

        // Note: user?.id might be undefined if user is not set. 
        // Ensure backend handles missing userId if it relies only on token.
        const data = await authService.refreshToken(user?.id || "", currentRefreshToken);

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        setToken(data.accessToken);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            const currentRefreshToken = localStorage.getItem("refreshToken");
            if (currentRefreshToken) {
                await authService.logout(user?.id || "", currentRefreshToken);
            }
        } catch (error) {
            console.error("Logout failed", error);
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, token, login, verifyLogin, logout, register, forgotPassword, resetPassword, verifyEmail, refreshToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
