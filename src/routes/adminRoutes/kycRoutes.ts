import { Router } from "express";
import authMiddleware from "../../middlewares/authMiddleware";
import { createKycDocument, getKycDocument } from "../../controllers/kycController";
import upload from "../../middlewares/upload";

const router = Router();

router.post(
    "/create",
    authMiddleware,
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "pdf", maxCount: 1 }
    ]),
    createKycDocument
);

router.get("/", authMiddleware, getKycDocument);

export default router;