import { Router } from "express";
import {
  getTickets,
  getTicket,
  createNewTicket,
  updateExistingTicket
} from "../controllers/tickets.controller";

const router = Router();

router.get("/", getTickets);
router.get("/:id", getTicket);
router.post("/", createNewTicket);
router.patch("/:id", updateExistingTicket);

export default router;