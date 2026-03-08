import { Router } from "express";
import kycRoutes from "./kycRoutes";
import profileRoutes from "./profileRoutes";
import bankAccountRoutes from "./bankAccountRoutes";
import paymentRoutes from "./paymentRoutes";
import ticketBookingRoutes from "./ticketBookingRoutes";
import dashboardRoutes from "./dashboardRoutes";
import authMiddleware from "../../middlewares/authMiddleware";

const router = Router();
router.use("/kyc", authMiddleware,kycRoutes);
router.use("/profile",authMiddleware,profileRoutes);
router.use("/bank-accounts",authMiddleware,bankAccountRoutes);
router.use("/ticket-bookings",authMiddleware,ticketBookingRoutes);
router.use("/statements",authMiddleware,paymentRoutes);
router.use("/dashboard",authMiddleware,dashboardRoutes);
export default router;