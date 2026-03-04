import { Request,Response } from "express";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../middlewares/authMiddleware";
import User, { IUser } from "../models/User";
import bcrypt from "bcrypt";
import { responseHandler } from "../handlers/responseHandler";
import { config } from "../config/config";
import { generateAndSaveUpiQr } from "../utils/qrService";

const deleteFile = (filePath: string): void => {
    if (!filePath) return;
    const resolvedPath = path.resolve(filePath);
    if (fs.existsSync(resolvedPath)) {
        try {
            fs.unlinkSync(resolvedPath);
            console.log(`Deleted file: ${resolvedPath}`);
        } catch (error) {
            console.error(`Error deleting file: ${resolvedPath}`, error);
        }
    }
};

export const updateProfileImage = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }      

        const userId = req.user._id;

        if (!req.file) {
            responseHandler(resp, 400, "Profile image file is missing", "error");
            return;
        }
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            deleteFile(req.file.path);
            responseHandler(resp, 404, "User not found", "error");
            return;
        }

        const newImageLink = `${config.BACKEND_DOMAIN}/uploads/profile/${req.file.filename}`;

        if (existingUser.image && existingUser.image.startsWith(config.BACKEND_DOMAIN as string)) {
            const oldFilePath = existingUser.image.replace(`${config.BACKEND_DOMAIN}/`, '');
            deleteFile(oldFilePath);
        }

        existingUser.image = newImageLink;
        await existingUser.save();
        responseHandler(resp, 200, "Profile photo updated successfully", "success", { image: newImageLink });

    } catch (error) {
        console.error("Error updating profile image:", error);
        if (req.file?.path) {
            deleteFile(req.file.path);
        }
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
const generalRegex = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;
const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
const addressRegex = /^[A-Za-z0-9\s,.'#/-]{5,100}$/;
const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const updateProfileDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
                
        const userId = req.user._id;
        const { firstName, lastName, phone, password, address, city, state } = req.body;

        const updates: Partial<IUser> = {};
        const errors: { [key: string]: string } = {};

        if (firstName) {
            if (!generalRegex.test(firstName)) {
                errors.firstName = "Invalid first name format.";
            } else {
                updates.firstName = firstName;
            }
        }
        if (lastName) {
            if (!generalRegex.test(lastName)) {
                errors.lastName = "Invalid last name format.";
            } else {
                updates.lastName = lastName;
            }
        }

        if (phone) {
            if (!phoneRegex.test(phone)) {
                errors.phone = "Invalid phone number format.";
            } else {
                updates.phone = phone;
            }
        }

        if (address) {
            if (!addressRegex.test(address)) { // Changed regex here
                errors.address = "Invalid address format. Special characters allowed: , . ' # - /";
            } else {
                updates.address = address;
            }
        }
        if (city) {
            if (!generalRegex.test(city)) {
                errors.city = "Invalid city format.";
            } else {
                updates.city = city;
            }
        }
        if (state) {
            if (!generalRegex.test(state)) {
                errors.state = "Invalid state format.";
            } else {
                updates.state = state;
            }
        }

        if (password) {
            if (!passwordStrengthRegex.test(password)) {
                errors.password = "Password must have at least one uppercase letter, one lowercase letter, one symbol, and one number, and be at least 8 characters long.";
            } else {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(password, salt);
            }
        }

        if (Object.keys(errors).length > 0) {
            responseHandler(resp, 400, "Validation errors occurred.", "error", errors);
            return;
        }

        if (Object.keys(updates).length === 0) {
            responseHandler(resp, 200, "No profile updates provided.", "success");
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true, select: "-password" }
        );

        if (!updatedUser) {
            responseHandler(resp, 404, "User not found", "error");
            return;
        }

        responseHandler(resp, 200, "Profile details updated successfully", "success", updatedUser);

    } catch (error) {
        console.error("Error updating profile details:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};

const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
export const handleUpiDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const userId = req.user._id;
        const email = req.user.email;
        let { upiId } = req.body;

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            responseHandler(resp, 404, "User not found", "error");
            return;
        }

        if (!upiId) {
            const emailPrefix = email.split('@')[0];
            upiId = `${emailPrefix}@upi`;
        } 
        else if (!upiRegex.test(upiId)) {
            responseHandler(resp, 400, "Invalid UPI ID format. Expected format: username@bankname", "error");
            return;
        }

        if (existingUser.upiQr) {
            const oldFilePath = existingUser.upiQr.replace(`${config.BACKEND_DOMAIN}/`, '');
            deleteFile(oldFilePath);
        }

        const userName = existingUser.firstName ? `${existingUser.firstName} ${existingUser.lastName || ''}`.trim() : "User";
        const newQrLink = await generateAndSaveUpiQr(upiId, userName, userId.toString());

        // 5. Save the updated details to the database
        existingUser.upiId = upiId;
        existingUser.upiQr = newQrLink;
        await existingUser.save();

        responseHandler(resp, 200, "UPI details processed successfully", "success", {
            upiId: existingUser.upiId,
            upiQr: existingUser.upiQr
        });

    } catch (error) {
        console.error("Error processing UPI details:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};