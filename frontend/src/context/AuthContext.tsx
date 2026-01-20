import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "../services/Api";

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.post("/auth/login", { email, password });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };

   

    const register = async (email: string, password: string, fullName: string) => {
        const response = await api.post("/auth/register", { email, password, fullName });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };

    const forgotPassword = async (email: string) => {
        const response = await api.post("/auth/forgot-password", { email });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };

    const resetPassword = async (email: string, password: string, fullName: string) => {
        const response = await api.post("/auth/reset-password", { email, password, fullName });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };

    const verifyEmail = async (email: string, password: string, fullName: string) => {
        const response = await api.post("/auth/verify-email", { email, password, fullName });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };

  
    const refreshToken = async () => {
        const response = await api.post("/auth/refresh-token", {
            userId: user?.id,
            refreshToken: localStorage.getItem("refreshToken"),
        });
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        setIsAuthenticated(true);
    };



    

    const logout = async () => {
        await api.post("/auth/logout", {
            userId: user?.id,
            refreshToken: localStorage.getItem("refreshToken"),
        });
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setIsAuthenticated(false);
    };


    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, register, forgotPassword, resetPassword, verifyEmail, refreshToken }}>
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
