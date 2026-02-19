import { Router } from "express";
import kycRoutes from "./kycRoutes";

const router = Router();
router.use("/kyc", kycRoutes);

export default router;