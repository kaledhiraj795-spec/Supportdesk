import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    data: { status: "ok" },
    error: null,
    meta: null
  });
});

export default router;
