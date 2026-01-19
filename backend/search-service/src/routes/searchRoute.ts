import { Router } from "express";
import { searchController } from "../controllers/searchController.ts";

const router = Router();

router.get("/", searchController);

export default router;
