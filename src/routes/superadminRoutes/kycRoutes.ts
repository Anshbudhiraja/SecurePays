import { Router } from "express";
import { acceptKycRequest, declineKycRequest, getAllKycRequestForSuperAdmin } from "../../controllers/kycController";

const router = Router();
router.get("/",getAllKycRequestForSuperAdmin)
router.get("/accept",acceptKycRequest)
router.get("/decline",declineKycRequest)

export default router;