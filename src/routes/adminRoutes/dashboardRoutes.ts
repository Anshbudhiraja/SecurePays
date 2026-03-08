import { Router } from "express";
import { getCashFlowAnalysis, getDashboardSummary, getSpendingComposition, getTicketBookingTrends } from "../../controllers/dashboardController";

const router = Router();
router.get("/cash-flow-analysis",getCashFlowAnalysis)
router.get("/spending-composition",getSpendingComposition)
router.get("/ticket-booking-trends",getTicketBookingTrends)
router.get("/dashboard-summary",getDashboardSummary)
export default router;