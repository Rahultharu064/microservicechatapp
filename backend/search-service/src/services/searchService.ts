import prismaClient from "../config/db.ts";
import redisClient from "../../../shared/src/redis/client.ts";

const CACHE_TTL = 300 as const;

export class SearchService {
    static async searchMessages(
        q: string,
        limit: number,
        offset: number,
        userId: string,
        filters?: { startDate?: Date | undefined; endDate?: Date | undefined; hasMedia?: boolean | undefined }
    ) {
        const filterKey = JSON.stringify(filters || {});
        const key = `search:messages:${userId}:${q}:${limit}:${offset}:${filterKey}`;
        const cached = await redisClient.get(key);
        if (cached) return JSON.parse(cached);

        const where: any = {
            content: { contains: q },
            OR: [
                { senderId: userId },
                {
                    chatId: {
                        in: await prismaClient.groupMember
                            .findMany({
                                where: { userId },
                                select: { groupId: true },
                            })
                            .then((members) => members.map((m) => m.groupId)),
                    },
                },
            ],
        };

        if (filters?.startDate) {
            where.createdAt = { ...where.createdAt, gte: filters.startDate };
        }
        if (filters?.endDate) {
            where.createdAt = { ...where.createdAt, lte: filters.endDate };
        }

        const data = await prismaClient.chatMessage.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { createdAt: "desc" },
        });

        await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL });
        return data;
    }

    static async searchUsers(q: string, limit: number, offset: number) {
        const key = `search:users:${q}:${limit}:${offset}`;
        const cached = await redisClient.get(key);
        if (cached) return JSON.parse(cached);

        const data = await prismaClient.user.findMany({
            where: { username: { contains: q } },
            take: limit,
            skip: offset,
        });

        await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL });
        return data;
    }

    static async searchGroups(q: string, limit: number, offset: number) {
        const key = `search:groups:${q}:${limit}:${offset}`;
        const cached = await redisClient.get(key);
        if (cached) return JSON.parse(cached);

        const data = await prismaClient.group.findMany({
            where: { name: { contains: q } },
            take: limit,
            skip: offset,
        });

        await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL });
        return data;
    }

    static async searchChannels(q: string, limit: number, offset: number, channelId?: string) {
        const key = `search:channels:${q}:${limit}:${offset}:${channelId || "all"}`;
        const cached = await redisClient.get(key);
        if (cached) return JSON.parse(cached);

        const where: any = {
            isPublic: true,
            name: { contains: q },
        };

        if (channelId) {
            where.id = channelId;
        }

        const data = await prismaClient.channel.findMany({
            where,
            take: limit,
            skip: offset,
        });

        await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL });
        return data;
    }
}
