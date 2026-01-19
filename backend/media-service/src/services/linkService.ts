import crypto from "crypto";
import   prismaClient  from "../config/db.ts";

export const generateExpiringToken = async (
  mediaId: string,
  expiresInSeconds = 60
) => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  await prismaClient.media.update({
    where: { id: mediaId },
    data: { expiresAt },
  });

  return token;
};
