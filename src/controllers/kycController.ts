import { Response } from "express";
import fs from "fs";
import path from "path";
import KYC from "../models/Kyc";
import { AuthRequest } from "../middlewares/authMiddleware";
import { config } from "../config/config";
import { responseHandler } from "../handlers/responseHandler";

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
        if (!req.user) {
            responseHandler(resp,401,"Unauthorized User","error")
            return;
        }
        
        const id = req.user._id;
        
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        if (!files || !files.video || !files.video[0] || !files.pdf || !files.pdf[0]) {
            if (files?.video?.[0]?.filename) {
                deleteFile(files.video[0].filename, "video");
            }
            if (files?.pdf?.[0]?.filename) {
                deleteFile(files.pdf[0].filename, "pdf");
            }
            responseHandler(resp,400,"File does not exist" ,"error")
            return;
        }

        const video = files.video[0];
        const pdf = files.pdf[0];
        
        const videoLink = `${config.BACKEND_DOMAIN}/uploads/videos/${video.filename}`;
        const pdfLink = `${config.BACKEND_DOMAIN}/uploads/pdfs/${pdf.filename}`;
        const existingKyc = await KYC.findOne({userId:id})
        if(existingKyc){
           if (files?.video?.[0]?.filename) {
                deleteFile(video.filename, "video");
            }
            if (files?.pdf?.[0]?.filename) {
                deleteFile(pdf.filename, "pdf");
            }
            responseHandler(resp,400,"You have already requested for Kyc","error")
            return; 
        }
        const result = await KYC.create({ userId: id, video: videoLink, pdf: pdfLink });
        responseHandler(resp,201,"File uploaded successfully","success",result)
    } catch (error) {
        console.log(error);
        responseHandler(resp,500,"Internal Server Error","fail")
    }
};

export const getKycDocument = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp,401,"Unauthorized User","error")
            return;
        }
        
        const id = req.user._id;
        const existingKyc = await KYC.findOne({ userId: id });
        
        if (!existingKyc) {
            responseHandler(resp,400,"This user does not request Kyc Verification","error")
            return;
        }
        responseHandler(resp,200,"Kyc fetched successfully","success",existingKyc)
    } catch (error) {
        responseHandler(resp,500,"Internal Server Error","fail")
    }
};