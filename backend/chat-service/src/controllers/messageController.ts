import prisma from "../config/db.ts";

export const getPrivateMessages = async (req: any, res: any) => {
  const userId = req.user.id;
  const otherId = req.params.userId;

  const messages = await prisma.privateMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(messages);
};



export const getGroupMessages = async (req: any, res: any) => {
  const groupId = req.params.groupId;

  const messages = await prisma.groupMessage.findMany({
    where: {
      groupId: groupId,
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(messages);
};

