import { z } from "zod";

export const searchSchema = z.object({
    q: z.string().min(1),
    type: z.enum(["message", "user", "group", "channel"]),
    limit: z.coerce.number().min(1).max(50).optional(),
    offset: z.coerce.number().min(0).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    hasMedia: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
    senderId: z.string().optional(),
});
