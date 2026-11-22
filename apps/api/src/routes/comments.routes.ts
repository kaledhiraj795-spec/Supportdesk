import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createTicketComment, listComments } from "../controllers/comments.controller";

const router = Router();

router.use(requireAuth, requireRole("customer", "agent", "admin"));
router.get("/:ticketId/comments", listComments);
router.post("/:ticketId/comments", createTicketComment);

export default router;
