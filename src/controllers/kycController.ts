import { Response } from "express";
import fs from "fs";
import path from "path";
import KYC from "../models/Kyc";
import { AuthRequest } from "../middlewares/authMiddleware";

const deleteFile = (filename: string, type: "video" | "pdf"): void => {
    const uploadsDir = path.resolve("uploads");
    const folderDir = type === "video" ? "videos" : "pdfs";
    const finalDir = path.join(uploadsDir, folderDir, filename);
    
    if (fs.existsSync(finalDir)) {
        fs.unlinkSync(finalDir);
    }
};

export const createKycDocument = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        // TypeScript safety check to ensure req.user exists
        if (!req.user) {
            resp.status(401).send({ message: "Unauthorized User" });
            return;
        }
        
        const id = req.user._id;
        
        // Define the specific shape Multer returns when using upload.fields()
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        if (!files || !files.video || !files.video[0] || !files.pdf || !files.pdf[0]) {
            if (files?.video?.[0]?.filename) {
                deleteFile(files.video[0].filename, "video");
            }
            if (files?.pdf?.[0]?.filename) {
                deleteFile(files.pdf[0].filename, "pdf");
            }
            resp.status(400).send({ message: "File does not exist" });
            return;
        }

        const video = files.video[0];
        const pdf = files.pdf[0];
        
        // Note: Hardcoding localhost is fine for dev, but consider using an env variable for production URLs
        const videoLink = `http://localhost:5000/uploads/videos/${video.filename}`;
        const pdfLink = `http://localhost:5000/uploads/pdfs/${pdf.filename}`;
        
        const result = await KYC.create({ userId: id, video: videoLink, pdf: pdfLink });
        
        resp.status(201).send({ message: "File uploaded successfully", result });
    } catch (error) {
        console.log(error);
        resp.status(500).send({ message: "Internal Server Error" });
    }
};

export const getKycDocument = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            resp.status(401).send({ message: "Unauthorized User" });
            return;
        }
        
        const id = req.user._id;
        const existingKyc = await KYC.findOne({ userId: id });
        
        if (!existingKyc) {
            resp.status(400).send({ message: "This user does not request Kyc Verification" });
            return;
        }
        
        resp.status(200).send({ message: "Kyc fetched successfully", data: existingKyc });
    } catch (error) {
        resp.status(500).send({ message: "Internal Server Error" });
    }
};