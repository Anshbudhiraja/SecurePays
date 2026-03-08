import { Router } from "express";
import kycRoutes from "./kycRoutes"
import bankRoutes from "./bankRoutes"
import ticketRoutes from "./ticketRoutes"
import profileRoutes from "./profileRoutes"
import analyticsRoutes from "./analyticsRoutes"
import authMiddleware from "../../middlewares/authMiddleware";
const router = Router();

router.use("/kyc",authMiddleware, kycRoutes);
router.use("/bank-accounts",authMiddleware ,bankRoutes);
router.use("/tickets",authMiddleware ,ticketRoutes);
router.use("/profile",authMiddleware ,profileRoutes);
router.use("/analytics",authMiddleware ,analyticsRoutes);
export default router;