import { Router } from 'express';
import { createProxyMiddleware } from '../middlewares/proxy.middleware.ts';
import config from '../config/env.ts';
import { SERVICE_ROUTES } from '../config/services.ts';

const router = Router();

router.use('/', createProxyMiddleware(
    config.services.auth,
    SERVICE_ROUTES.AUTH.rewrite
));

export default router;
