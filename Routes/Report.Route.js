import { Router } from "express";
import {
  getDailyReport,
  getMonthlyReport,
  getPaymentSummary,
  getDateRangeReport,
} from "../Controllers/ReportController.js";
import { protect, ownerOnly } from "../Middlewares/auth.js";

const router = Router();

// Apply middleware to all routes
router.use(protect, ownerOnly);

// ─── Report Routes ─────────────────────────────────
router.get("/daily", getDailyReport);
router.get("/monthly", getMonthlyReport);
router.get("/payment-summary", getPaymentSummary);
router.get("/date-range", getDateRangeReport);

export default router;