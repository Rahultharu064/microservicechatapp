import type { Request, Response } from "express";
export declare const getPrivateMessages: (req: Request, res: Response) => Promise<void>;
export declare const getGroupMessages: (req: Request, res: Response) => Promise<void>;
export declare const syncMessages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUnreadCount: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=messageController.d.ts.map