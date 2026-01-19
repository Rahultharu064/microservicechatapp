import "dotenv/config";
import app from "./app.ts";
import { prisma } from "./config/db.ts";

const PORT = process.env.ADMIN_PORT || 5007;

async function startServer() {
    try {
        await prisma.$connect();
        console.log("Connected to database");

        app.listen(PORT, () => {
            console.log(`Admin Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
