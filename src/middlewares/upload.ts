import multer, { FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import { Request } from "express";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const videoDir = path.join(uploadDir, "videos");
if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir);
}

const pdfDir = path.join(uploadDir, "pdfs");
if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
}

const storage = multer.diskStorage({
    destination: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, destination: string) => void
    ) => {
        if (file.mimetype === "application/pdf") {
            cb(null, pdfDir);
        } else {
            cb(null, videoDir);
        }
    },
    filename: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, filename: string) => void
    ) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const fileFilter = (
    req: Request, 
    file: Express.Multer.File, 
    cb: FileFilterCallback
) => {
    const allowedTypes = ["application/pdf", "video/mp4"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF and video files are allowed"));
    }
};

const upload = multer({
    storage: storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

export default upload;