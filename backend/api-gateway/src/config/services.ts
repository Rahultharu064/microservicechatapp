export const SERVICE_ROUTES = {
    AUTH: {
        path: '/api/auth',
        rewrite: { '^/api/auth': '/auth' },
    },
    USERS: {
        path: '/api/users',
        rewrite: { '^/api/users': '/users' },
    },
    CHAT: {
        path: '/api/chat',
        rewrite: { '^/api/chat': '/api' },
    },
    NOTIFICATIONS: {
        path: '/api/notifications',
        rewrite: { '^/api/notifications': '/api/notifications' },
    },
    MEDIA: {
        path: '/api/media',
        rewrite: { '^/api/media': '/api/media' },
    },
    SEARCH: {
        path: '/api/search',
        rewrite: { '^/api/search': '/search' },
    },
    ADMIN: {
        path: '/api/admin',
        rewrite: { '^/api/admin': '/admin' },
    },
};
