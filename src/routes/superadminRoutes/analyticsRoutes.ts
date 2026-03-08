import { Router } from "express";
import { getAllStatements, getAllUsers, getTransactionAmountAnalytics, getUserJoiningTrends } from "../../controllers/analyticsController";

const router = Router();
router.get("/all-users",getAllUsers)
router.get("/users-joining-trends",getUserJoiningTrends)
router.get("/transaction-amount-barchart",getTransactionAmountAnalytics)
router.get("/all-statements-records",getAllStatements)

export default router;