import app from "./app.ts";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import prismaClient from "./config/db.ts";

const PORT = process.env.MEDIASERVICEPORT || 5005;

// Ensure required directories exist
const ensureDirectories = () => {
    const dirs = [
        path.join(process.cwd(), "temp"),
        path.join(process.cwd(), "temp", "uploads"),
        path.join(process.cwd(), "storage"),
        path.join(process.cwd(), "storage", "media"),
    ];

    dirs.forEach((dir) => {
        if (!fs.existsSync(dir)) {
            console.log(`Creating directory: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

ensureDirectories();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});