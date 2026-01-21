import { Navigate, useRoutes } from "react-router-dom";
import Login from "../components/Auth/Login";
import Register from "../components/Auth/Register";
import Dashboard from "../pages/Dashboard";
import Chat from "../pages/Chat";
import NotFound from "../pages/NotFound";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default function AppRoutes() {
    const element = useRoutes([
        {
            path: "/",
            element: <Navigate to="/dashboard" replace />,
        },
        {
            path: "/login",
            element: <Login />,
        },
        {
            path: "/register",
            element: <Register />,
        },
        {
            path: "/dashboard",
            element: (
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            ),
        },
        {
            path: "/chat",
            element: (
                <ProtectedRoute>
                    <Chat />
                </ProtectedRoute>
            ),
        },
        {
            path: "*",
            element: <NotFound />,
        },
    ]);

    return element;
}
