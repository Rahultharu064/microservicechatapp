import type { Request, Response } from "express";
import { searchSchema } from "../validators/searchValidator.ts";
import { SearchService } from "../services/searchService.ts";

export const searchController = async (req: Request, res: Response) => {
    try {
        const { q, type, limit = 20, offset = 0, startDate, endDate, hasMedia, senderId } = searchSchema.parse(req.query);
        const userId = (req as any).headers["x-user-id"] || (req as any).user?.id || "unknown"; // Assuming middleware populates user or gateway passes header

        let results;

        switch (type) {
            case "message":
                results = await SearchService.searchMessages(q, limit, offset, userId, { startDate, endDate, hasMedia, senderId });
                break;
            case "user":
                results = await SearchService.searchUsers(q, limit, offset);
                break;
            case "group":
                results = await SearchService.searchGroups(q, limit, offset);
                break;
            case "channel":
                results = await SearchService.searchChannels(q, limit, offset);
                break;
        }

        res.json({ type, results });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
};
