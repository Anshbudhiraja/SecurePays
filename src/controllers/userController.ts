import { Request, Response } from "express";
import User from "../models/User";
import disposableEmailDomains from "disposable-email-domains";
import bcrypt from "bcrypt";
import sendEmail from "../utils/emailService";
import { generateOtp, verifyOtp } from "../utils/otpService"; 
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";
import { config } from "../config/config";
import * as admin from "firebase-admin"

export const loginUser = async (req: Request, resp: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            responseHandler(resp,404,"Email and Password are required","error")
            return;
        }

        if (typeof email !== "string" || typeof password !== "string") {
            responseHandler(resp,400,"Invalid Email or Password","error")
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            responseHandler(resp,400,"Invalid Email Format" ,"error")
            return;
        }

        const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordStrengthRegex.test(password)) {
            responseHandler(resp,400,"Password should have one uppercase, lowercase, symbol and number", "error")
            return;
        }

        const domain = email.split("@")[1];
        if (disposableEmailDomains.includes(domain)) {
            responseHandler(resp,400,"Spam Email found. Invalid Email","error")
            return;
        }

        const updatedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: updatedEmail });

        if (existingUser) {
            if (!existingUser.password) {
                responseHandler(resp,400,"You have logined with your google account","error")
                return;
            }

            const isMatched = await bcrypt.compare(password, existingUser.password);
            if (!isMatched) {
                responseHandler(resp,400,"Invalid Credentials","error")
                return;
            }

            if (!existingUser.verified) {
                const otp = generateOtp(updatedEmail);
                await sendEmail(resp, 200, updatedEmail, otp);
                return;
            }

            if (!existingUser.service) {
                responseHandler(resp,400,"Your service has been disabled. Contact website support","error")
                return;
            }

            const payload = {
                id: existingUser._id,
                email: existingUser.email
            };

            const secretKey = config.SECRET_KEY as string;
            const token = jwt.sign(payload, secretKey);
            responseHandler(resp,200,"Login successfully","success",{ token, role: existingUser.role })
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({ email: updatedEmail, password: hashedPassword });
        const otp = generateOtp(updatedEmail);
        await sendEmail(resp, 201, updatedEmail, otp);

    } catch (error) {
        responseHandler(resp,500,"Internal Server Error","fail")
    }
};

export const verifyUser = async (req: Request, resp: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;

        if (!email || typeof email !== "string") {
            responseHandler(resp,400,"Invalid or Missing Email","error")
            return;
        }

        if (!otp || typeof otp !== "string") {
            responseHandler(resp,400,"Invalid or Missing Otp" ,"error")
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            responseHandler(resp,400,"Invalid Email Format" ,"error")
            return;
        }

        const otpRegex = /^\d{6}$/;
        if (!otpRegex.test(otp)) {
            responseHandler(resp,400,"Invalid Otp Format" ,"error")
            return;
        }

        const updatedEmail = email.trim().toLowerCase();
        const domain = updatedEmail.split("@")[1];

        if (disposableEmailDomains.includes(domain)) {
            responseHandler(resp,400,"Spam Email found. Invalid Email" ,"error")
            return;
        }

        const existingUser = await User.findOne({ email: updatedEmail }).select("-password");
        if (!existingUser) {
            responseHandler(resp,400,"User not found in the database" ,"error")
            return;
        }

        if (existingUser.verified) {
            responseHandler(resp,400,"Your account is already verified" ,"error")
            return;
        }

        if (!existingUser.service) {
            responseHandler(resp,400,"Your service has been disabled. Contact website support" ,"error")
            return;
        }

        const result = verifyOtp(updatedEmail, otp);
        if (!result.status) {
            responseHandler(resp,400,result.message ,"error")
            return;
        }

        await User.updateOne({ _id: existingUser._id }, { $set: { verified: true } });

        const payload = {
            email: existingUser.email,
            id: existingUser._id
        };

        const secretKey = config.SECRET_KEY as string;
        const token = jwt.sign(payload, secretKey);
        responseHandler(resp,200,result.message ,"success",{ token, role: existingUser.role })
    } catch (error) {
        responseHandler(resp,500,"Internal Server Error" ,"fail")
    }
};

export const checkUserDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp,401, "Unauthorized User","error");
            return;
        }
        if (!req.user?.service || !req.user?.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }

        if (!req.user.firstName && !req.user.lastName) {
            responseHandler(resp,400, "User details not found","error");
            return;
        }
        responseHandler(resp,200, "User details fetched","success",req.user);
    } catch (error) {
        responseHandler(resp,500,"Internal Server Error","fail");
    }
};

export const updateUserDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            responseHandler(resp,401,"Unauthorized User","error")
            return;
        }
        if (!req.user?.service || !req.user?.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        const { firstName, lastName, phone, address, city, state } = req.body;
        const generalRegex = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;

        if (!firstName || !lastName || !phone || !address || !city || !state) {
            responseHandler(resp,400,"Missing Details. Fields are required","error")
            return;
        }

        if (!generalRegex.test(firstName)) {
            responseHandler(resp,400,"Invalid FirstName","error")
            return;
        }
        if (!generalRegex.test(lastName)) {
            responseHandler(resp,400,"Invalid lastName","error")
            return;
        }
        if (!phoneRegex.test(phone)) {
            responseHandler(resp,400,"Invalid Phone Number","error")
            return;
        }
        if (typeof address !== "string") {
            responseHandler(resp,400,"Invalid Address","error")
            return;
        }
        if (!generalRegex.test(city)) {
            responseHandler(resp,400,"Invalid City","error")
            return;
        }
        if (!generalRegex.test(state)) {
            responseHandler(resp,400,"Invalid State","error")
            return;
        }

        const id = req.user._id;
        const email = req.user.email;

        const existingUser = await User.findOne({ email: email, _id: id }).select("-password");
        if (!existingUser) {
            responseHandler(resp,401,"Unauthorised User","error")
            return;
        }

        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.phone = phone;
        existingUser.address = address;
        existingUser.city = city;
        existingUser.state = state;

        await existingUser.save();

        responseHandler(resp,200,"User details updated","success");
    } catch (error) {
        responseHandler(resp,500,"Internal Server Error","fail");
    }
};

export const googleLogin = async (req: Request, resp: Response): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            responseHandler(resp, 400, "Google ID Token is required", "error");
            return;
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, email_verified } = decodedToken;

        if (!email) {
            responseHandler(resp, 400, "Email not found in Google Token", "error");
            return;
        }

        const updatedEmail = email.trim().toLowerCase();

        let existingUser = await User.findOne({ email: updatedEmail });

        if (existingUser) {
            if (!existingUser.service) {
                responseHandler(resp, 400, "Your service has been disabled. Contact support", "error");
                return;
            }

            if (!existingUser.image) existingUser.image = picture;
            await existingUser.save();
        } else {
            const nameParts = name ? name.split(" ") : [""];
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

            existingUser = await User.create({
                email: updatedEmail,
                firstName: firstName,
                lastName: lastName,
                image: picture,
                verified: email_verified || true, 
                role: "admin", 
                service: true
            });
        }

        const payload = {
            id: existingUser._id,
            email: existingUser.email
        };

        const secretKey = config.SECRET_KEY as string;
        const token = jwt.sign(payload, secretKey);

        responseHandler(resp, 200, "Google login successful", "success", {
            token,
            role: existingUser.role,
            user: {
                firstName: existingUser.firstName,
                image: existingUser.image
            }
        });

    } catch (error) {
        console.error("Google Auth Error:", error);
        responseHandler(resp, 401, "Invalid Google Token", "fail");
    }
};