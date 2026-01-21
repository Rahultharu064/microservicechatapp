export const SERVICE_ROUTES = {
    AUTH: {
        path: '/api/auth',
        rewrite: { '^': '/auth' },
    },
    USERS: {
        path: '/api/users',
        rewrite: { '^': '/users' },
    },
    CHAT: {
        path: '/api/chat',
        rewrite: { '^': '/chat' },
    },
    NOTIFICATIONS: {
        path: '/api/notifications',
        rewrite: { '^': '/notifications' },
    },
    MEDIA: {
        path: '/api/media',
        rewrite: { '^': '/media' },
    },
    SEARCH: {
        path: '/api/search',
        rewrite: { '^': '/search' },
    },
    ADMIN: {
        path: '/api/admin',
        rewrite: { '^': '/admin' },
    },
};
