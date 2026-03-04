import { Router } from "express";
import { createKycDocument, getKycDocument } from "../../controllers/kycController";
import upload from "../../middlewares/upload";

const router = Router();

router.post(
    "/create",
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "pdf", maxCount: 1 }
    ]),
    createKycDocument
);

router.get("/", getKycDocument);

export default router;