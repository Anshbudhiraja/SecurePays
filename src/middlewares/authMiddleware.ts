import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import disposableEmailDomains from "disposable-email-domains";
import User, { IUser } from "../models/User"; 

dotenv.config();

export interface AuthRequest extends Request {
    user?: IUser | null;
}

interface DecodedToken extends jwt.JwtPayload {
    id: string;
    email: string;
}

const authMiddleware = async (
    req: AuthRequest, 
    resp: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization;
        
        if (!token || !token.startsWith("Bearer ")) {
            resp.status(400).send({ message: "Invalid or Missing Token" });
            return;
        }

        const authToken = token.split(" ")[1];
        if (!authToken) {
            resp.status(400).send({ message: "Invalid or Missing Token" });
            return;
        }

        const secretKey = process.env.SECRET_KEY as string;
        if (!secretKey) {
            throw new Error("SECRET_KEY is missing in environment variables.");
        }

        const decoded = jwt.verify(authToken, secretKey) as DecodedToken;

        if (!decoded?.email || !decoded?.id || !mongoose.isValidObjectId(decoded?.id)) {
            resp.status(400).send({ message: "Unauthorised User" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof decoded?.email !== "string" || !emailRegex.test(decoded?.email)) {
            resp.status(400).send({ message: "Invalid Email Format" });
            return;
        }

        const updatedEmail = decoded.email.trim().toLowerCase();
        const domain = updatedEmail.split("@")[1];
        
        if (disposableEmailDomains.includes(domain)) {
            resp.status(400).send({ message: "Spam Email found. Invalid Email" });
            return;
        }

        const existingUser = await User.findOne({ 
            email: updatedEmail, 
            _id: decoded.id 
        }).select("-password");
        
        if (!existingUser) {
            resp.status(400).send({ message: "Unauthorised User" });
            return;
        }

        req.user = existingUser;
        next();
        
    } catch (error) {
        resp.status(400).send({ message: "Invalid Token: Token Mismatch" });
    }
};

export default authMiddleware;