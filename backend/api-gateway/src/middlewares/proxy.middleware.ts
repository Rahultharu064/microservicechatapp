import { createServiceProxy } from '../utils/proxy.ts';

export const createProxyMiddleware = (
    target: string,
    pathRewrite: { [key: string]: string },
    ws: boolean = false
) => {
    return createServiceProxy(target, pathRewrite, ws);
};
