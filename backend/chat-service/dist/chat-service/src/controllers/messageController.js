import prisma from "../config/db.js";
import logger from "../../../shared/src/logger/logger.js";
export const getPrivateMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otherId } = req.params;
        const { limit = "50", offset = "0" } = req.query;
        const otherIdStr = otherId;
        const messages = await prisma.privateMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherIdStr },
                    { senderId: otherIdStr, receiverId: userId },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        res.json(messages.reverse());
    }
    catch (err) {
        logger.error("Failed to fetch private messages", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = "50", offset = "0" } = req.query;
        const groupIdStr = groupId;
        const messages = await prisma.groupMessage.findMany({
            where: { groupId: groupIdStr },
            orderBy: { createdAt: "desc" },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        res.json(messages.reverse());
    }
    catch (err) {
        logger.error("Failed to fetch group messages", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
//# sourceMappingURL=messageController.js.map