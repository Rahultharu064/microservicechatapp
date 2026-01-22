import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/Api';

/**
 * Component that validates authentication on mount
 * Clears invalid tokens and redirects to login if needed
 */
export const AuthValidator = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Skip validation on public routes
        const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
        if (publicRoutes.some(route => location.pathname.startsWith(route))) {
            return;
        }

        const validateAuth = async () => {
            const accessToken = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');
            const userId = localStorage.getItem('userId');

            // If no tokens at all, redirect to login (user needs to log in)
            if (!accessToken && !refreshToken) {
                console.log('No auth tokens found, redirecting to login...');
                navigate('/login', { replace: true });
                return;
            }

            // If we have partial auth data, it's corrupted - clear it
            if (!accessToken || !refreshToken || !userId) {
                console.warn('Corrupted auth data detected, clearing...');
                localStorage.clear();
                sessionStorage.clear();
                navigate('/login', { replace: true });
                return;
            }

            // Try to validate the token with a simple request
            try {
                await api.get('/users/me');
                console.log('✓ Token is valid');
            } catch (error: any) {
                // If we get a 401 and the interceptor couldn't refresh, tokens are invalid
                if (error?.response?.status === 401 || error?.message?.includes('No refresh token')) {
                    console.warn('Token validation failed, clearing auth data...');
                    localStorage.clear();
                    sessionStorage.clear();
                    navigate('/login', { replace: true });
                }
            }
        };

        validateAuth();
    }, [navigate, location.pathname]);

    return null; // This component doesn't render anything
};
