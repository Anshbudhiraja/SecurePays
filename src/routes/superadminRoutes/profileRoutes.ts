import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware";
import { uploadProfileImage } from "../../middlewares/uploadProfile";
import { handleUpiDetails, updateProfileDetails, updateProfileImage } from "../../controllers/profileController";

const router = Router();
router.put("/image", uploadProfileImage.single("image"), updateProfileImage);
router.put("/profileDetails",updateProfileDetails)
router.put("/upiDetails",handleUpiDetails)

export default router;