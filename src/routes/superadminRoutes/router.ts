import { Router } from "express";
import kycRoutes from "./kycRoutes"
import bankRoutes from "./bankRoutes"
import ticketRoutes from "./ticketRoutes"
import authMiddleware from "../../middlewares/authMiddleware";
const router = Router();

router.use("/kyc",authMiddleware, kycRoutes);
router.use("/bank-accounts",authMiddleware ,bankRoutes);
router.use("/tickets",authMiddleware ,ticketRoutes);
export default router;