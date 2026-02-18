import { Router } from "express";
import userRoutes from "./userRoutes";
import kycRoutes from "./kycRoutes";

const router = Router();

router.use("/auth", userRoutes);
router.use("/kyc", kycRoutes);

export default router;