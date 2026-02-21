import { Response } from "express";
import fs from "fs";
import path from "path";
import KYC from "../models/Kyc";
import { AuthRequest } from "../middlewares/authMiddleware";
import { config } from "../config/config";
import { responseHandler } from "../handlers/responseHandler";
import mongoose from "mongoose";
import User from "../models/User";

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

export const getAllKycRequestForSuperAdmin = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp,401,"Unauthorized User","error")
            return;
        }

        if (req.user.role !== "superadmin") {
            responseHandler(resp,403,"Forbidden: Access denied. Superadmin only.","error")
            return;
        }

        const kycRequests = await KYC.find().populate(
            "userId", 
            "firstName lastName email verified kyc_verified"
        );

        if (!kycRequests || kycRequests.length === 0) {
            responseHandler(resp,404,"No KYC requests found","error",[])
            return;
        }

        responseHandler(resp,200,"Fetched successfully","success",kycRequests)

    } catch (error) {
        console.error("Error fetching KYC requests:", error);
        responseHandler(resp,500,"Internal Server Error","fail")
    }
};
export const acceptKycRequest = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        if (req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Access denied. Superadmin only.", "error");
            return;
        }

        const { kycId } = req.query;

        if (!kycId || !mongoose.isValidObjectId(kycId)) {
            responseHandler(resp, 400, "Invalid or Missing Kyc Id", "error");
            return;
        }

        const existingKyc = await KYC.findById(kycId)
        if(!existingKyc){
            return responseHandler(resp,404,"Kyc not found","error")
        }

        const user = await User.findById(existingKyc.userId);
        if (!user) {
            responseHandler(resp, 404, "User not found", "error");
            return;
        }

        if (user.kyc_verified) {
            responseHandler(resp, 400, "User KYC is already verified", "error");
            return;
        }

        user.kyc_verified = true;
        await user.save();
        existingKyc.status = true
        await existingKyc.save()
        responseHandler(resp, 200, "KYC request accepted successfully", "success");

    } catch (error) {
        console.error("Error accepting KYC request:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const declineKycRequest = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        if (req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Access denied. Superadmin only.", "error");
            return;
        }

        const { kycId } = req.query;

        if (!kycId || !mongoose.isValidObjectId(kycId)) {
            responseHandler(resp, 400, "Invalid or Missing Kyc Id", "error");
            return;
        }

        const existingKyc = await KYC.findById(kycId)
        if(!existingKyc){
            return responseHandler(resp,404,"Kyc not found","error")
        }

        const videoFilename = existingKyc.video.split('/').pop();
        const pdfFilename = existingKyc.pdf.split('/').pop();

        if (videoFilename) deleteFile(videoFilename, "video");
        if (pdfFilename) deleteFile(pdfFilename, "pdf");

        await existingKyc.deleteOne()
        responseHandler(resp, 200, "KYC request declined and files removed", "success");
    } catch (error) {
        console.error("Error declining KYC request:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};