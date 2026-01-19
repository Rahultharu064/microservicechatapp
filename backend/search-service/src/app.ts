import express from "express";
import searchRoute from "./routes/searchRoute.ts";

const app = express();

app.use(express.json());
app.use("/api/search", searchRoute);

export default app;