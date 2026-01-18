import { Router } from "express";

const router = Router();

router.get("/", (_, res) => {
  res.json({
    service: "notification-service",
    status: "UP",
    timestamp: new Date().toISOString()
  });
});

export default router;
