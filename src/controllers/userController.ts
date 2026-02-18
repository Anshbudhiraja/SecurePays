import { Request, Response } from "express";
import User from "../models/User";
import disposableEmailDomains from "disposable-email-domains";
import bcrypt from "bcrypt";
import sendEmail from "../utils/emailService";
import { generateOtp, verifyOtp } from "../utils/otpService"; 
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";

dotenv.config();

export const loginUser = async (req: Request, resp: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            resp.status(404).send({ message: "Email and Password are required" });
            return;
        }

        if (typeof email !== "string" || typeof password !== "string") {
            resp.status(400).send({ message: "Invalid Email or Password" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            resp.status(400).send({ message: "Invalid Email Format" });
            return;
        }

        const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordStrengthRegex.test(password)) {
            resp.status(400).send({ message: "Password should have one uppercase, lowercase, symbol and number" });
            return;
        }

        const domain = email.split("@")[1];
        if (disposableEmailDomains.includes(domain)) {
            resp.status(400).send({ message: "Spam Email found. Invalid Email" });
            return;
        }

        const updatedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: updatedEmail });

        if (existingUser) {
            if (!existingUser.password) {
                resp.status(400).send({ message: "You have logined with your google account" });
                return;
            }

            const isMatched = await bcrypt.compare(password, existingUser.password);
            if (!isMatched) {
                resp.status(400).send({ message: "Invalid Credentials" });
                return;
            }

            if (!existingUser.verified) {
                const otp = generateOtp(updatedEmail);
                await sendEmail(resp, 200, updatedEmail, otp);
                return;
            }

            if (!existingUser.service) {
                resp.status(400).send({ message: "Your service has been disabled. Contact website support" });
                return;
            }

            const payload = {
                id: existingUser._id,
                email: existingUser.email
            };

            const secretKey = process.env.SECRET_KEY as string;
            const token = jwt.sign(payload, secretKey);
            
            resp.status(200).send({ message: "Login successfully", data: { token, role: existingUser.role } });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.create({ email: updatedEmail, password: hashedPassword });
        const otp = generateOtp(updatedEmail);
        await sendEmail(resp, 201, updatedEmail, otp);

    } catch (error) {
        resp.status(500).send({ message: "Internal Server Error", error });
    }
};

export const verifyUser = async (req: Request, resp: Response): Promise<void> => {
    try {
        const { email, otp } = req.body;

        if (!email || typeof email !== "string") {
            resp.status(400).send({ message: "Invalid or Missing Email" });
            return;
        }

        if (!otp || typeof otp !== "string") {
            resp.status(400).send({ message: "Invalid or Missing Otp" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            resp.status(400).send({ message: "Invalid Email Format" });
            return;
        }

        const otpRegex = /^\d{6}$/;
        if (!otpRegex.test(otp)) {
            resp.status(400).send({ message: "Invalid Otp Format" });
            return;
        }

        const updatedEmail = email.trim().toLowerCase();
        const domain = updatedEmail.split("@")[1];

        if (disposableEmailDomains.includes(domain)) {
            resp.status(400).send({ message: "Spam Email found. Invalid Email" });
            return;
        }

        const existingUser = await User.findOne({ email: updatedEmail }).select("-password");
        if (!existingUser) {
            resp.status(400).send({ message: "User not found in the database" });
            return;
        }

        if (existingUser.verified) {
            resp.status(400).send({ message: "Your account is already verified" });
            return;
        }

        if (!existingUser.service) {
            resp.status(400).send({ message: "Your service has been disabled. Contact website support" });
            return;
        }

        const result = verifyOtp(updatedEmail, otp);
        if (!result.status) {
            resp.status(400).send({ message: result.message });
            return;
        }

        await User.updateOne({ _id: existingUser._id }, { $set: { verified: true } });

        const payload = {
            email: existingUser.email,
            id: existingUser._id
        };

        const secretKey = process.env.SECRET_KEY as string;
        const token = jwt.sign(payload, secretKey);

        resp.status(200).send({ message: result.message, data: { token, role: existingUser.role } });
    } catch (error) {
        resp.status(500).send({ message: "Internal Server Error", error });
    }
};

export const checkUserDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            resp.status(401).send({ message: "Unauthorized User" });
            return;
        }

        if (!req.user.firstName && !req.user.lastName) {
            resp.status(404).send({ message: "User details not found",data:null});
            return;
        }

        resp.status(200).send({ message: "User details fetched", data: req.user});
    } catch (error) {
        resp.status(500).send({ message: "Internal Server Error" });
    }
};

export const updateUserDetails = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            resp.status(401).send({ message: "Unauthorized User" });
            return;
        }

        const { firstName, lastName, phone, address, city, state } = req.body;
        const generalRegex = /^[A-Za-z][A-Za-z\s'-]{1,49}$/;
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;

        if (!firstName || !lastName || !phone || !address || !city || !state) {
            resp.status(400).send({ message: "Missing Details. Fields are required" });
            return;
        }

        if (!generalRegex.test(firstName)) {
            resp.status(400).send({ message: "Invalid FirstName" });
            return;
        }
        if (!generalRegex.test(lastName)) {
            resp.status(400).send({ message: "Invalid lastName" });
            return;
        }
        if (!phoneRegex.test(phone)) {
            resp.status(400).send({ message: "Invalid Phone Number" });
            return;
        }
        if (!generalRegex.test(address)) {
            resp.status(400).send({ message: "Invalid Address" });
            return;
        }
        if (!generalRegex.test(city)) {
            resp.status(400).send({ message: "Invalid City" });
            return;
        }
        if (!generalRegex.test(state)) {
            resp.status(400).send({ message: "Invalid State" });
            return;
        }

        const id = req.user._id;
        const email = req.user.email;

        const existingUser = await User.findOne({ email: email, _id: id }).select("-password");
        if (!existingUser) {
            resp.status(400).send({ message: "Unauthorised User" });
            return;
        }

        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.phone = phone;
        existingUser.address = address;
        existingUser.city = city;
        existingUser.state = state;

        await existingUser.save();

        resp.status(200).send({ message: "User details updated" });
    } catch (error) {
        resp.status(500).send({ message: "Internal Server Error" });
    }
};