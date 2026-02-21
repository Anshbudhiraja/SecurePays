import { Router } from "express";
import { acceptKycRequest, declineKycRequest, getAllKycRequestForSuperAdmin } from "../../controllers/kycController";

const router = Router();
router.get("/",getAllKycRequestForSuperAdmin)
router.put("/accept",acceptKycRequest)
router.put("/decline",declineKycRequest)

export default router;