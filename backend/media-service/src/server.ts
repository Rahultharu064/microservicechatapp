import app from "./app.ts";

import dotenv from "dotenv";
dotenv.config();

import prismaClient from "./config/db.ts";

const PORT = process.env.MEDIASERVICEPORT || 5005;

    app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});