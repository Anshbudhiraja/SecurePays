import { Router } from "express";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes/router";

const router = Router();

router.use("/auth", userRoutes);
router.use("/admin", adminRoutes);

export default router;