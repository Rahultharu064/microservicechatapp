import { createServiceProxy } from '../utils/proxy.ts';

export const createProxyMiddleware = (
    target: string,
    pathRewrite: { [key: string]: string },
    pathFilter?: string | string[] | ((pathname: string, req: any) => boolean),
    ws: boolean = false
) => {
    return createServiceProxy(target, pathRewrite, pathFilter, ws);
};
