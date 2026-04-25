import { Router } from "express";
import {
  getActivityFeed,
  getActivityById,
} from "../controllers/activity.controller";
import { authenticate } from "../middleware/auth";        // existing middleware

const router = Router();

// ── Global feed (all groups the user belongs to) ──────────────────────────────
// GET /api/v1/activity
router.get("/", authenticate, getActivityFeed);

// ── Single record ─────────────────────────────────────────────────────────────
// GET /api/v1/activity/:id
router.get("/:id", authenticate, getActivityById);

export default router;