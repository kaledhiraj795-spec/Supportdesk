import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getTickets,
  getTicket,
  createNewTicket,
  updateExistingTicket
} from "../controllers/tickets.controller";
import { categoriseTicket, suggestReply } from "../controllers/ticket-ai.controller";

const router = Router();

router.use(requireAuth, requireRole("customer", "agent", "admin"));
router.post("/:id/ai/suggest-reply", requireRole("agent", "admin"), suggestReply);
router.post("/:id/ai/categorise", requireRole("agent", "admin"), categoriseTicket);
router.get("/", getTickets);
router.get("/:id", getTicket);
router.post("/", createNewTicket);
router.patch("/:id", updateExistingTicket);

export default router;