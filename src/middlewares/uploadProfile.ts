import multer, { FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import { Request } from "express";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const profileDir = path.join(uploadDir, "profile");
if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir);
}

const storage = multer.diskStorage({
    destination: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, destination: string) => void
    ) => {
        cb(null, profileDir);
    },
    filename: (
        req: Request, 
        file: Express.Multer.File, 
        cb: (error: Error | null, filename: string) => void
    ) => {
        const sanitizedOriginalName = file.originalname.replace(/\s+/g, '-');
        const uniqueName = `${Date.now()}-${sanitizedOriginalName}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (
    req: Request, 
    file: Express.Multer.File, 
    cb: FileFilterCallback
) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PNG and JPG/JPEG are allowed."));
    }
};

export const uploadProfileImage = multer({
    storage: storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 
    }
});