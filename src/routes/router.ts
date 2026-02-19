import { Router } from "express";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes/router";
import superadminRoutes from "./superadminRoutes/router";

const router = Router();

router.use("/auth", userRoutes);
router.use("/admin", adminRoutes);
router.use("/superadmin", superadminRoutes);

export default router;