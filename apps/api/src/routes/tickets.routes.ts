import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  getTickets,
  getTicket,
  createNewTicket,
  updateExistingTicket
} from "../controllers/tickets.controller";

const router = Router();

router.use(requireAuth, requireRole("customer", "agent", "admin"));
router.get("/", getTickets);
router.get("/:id", getTicket);
router.post("/", createNewTicket);
router.patch("/:id", updateExistingTicket);

export default router;