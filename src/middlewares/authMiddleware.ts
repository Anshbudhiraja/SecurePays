import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import disposableEmailDomains from "disposable-email-domains";
import User, { IUser } from "../models/User"; 
import { responseHandler } from "../handlers/responseHandler";
import { config } from "../config/config";

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
            responseHandler(resp,400,"Invalid or Missing Token","error")
            return;
        }

        const authToken = token.split(" ")[1];
        if (!authToken) {
            responseHandler(resp,400,"Invalid or Missing Token","error")
            return;
        }

        const secretKey = config.SECRET_KEY as string;
        if (!secretKey) {
            responseHandler(resp,400,"SECRET_KEY is missing in environment variables.","error");
        }

        const decoded = jwt.verify(authToken, secretKey) as DecodedToken;

        if (!decoded?.email || !decoded?.id || !mongoose.isValidObjectId(decoded?.id)) {
            responseHandler(resp,400,"Unauthorised User","error")
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof decoded?.email !== "string" || !emailRegex.test(decoded?.email)) {
            responseHandler(resp,400,"Invalid Email Format","error")
            return;
        }

        const updatedEmail = decoded.email.trim().toLowerCase();
        const domain = updatedEmail.split("@")[1];
        
        if (disposableEmailDomains.includes(domain)) {
            responseHandler(resp,400,"Spam Email found. Invalid Email","error")
            return;
        }

        const existingUser = await User.findOne({ 
            email: updatedEmail, 
            _id: decoded.id 
        }).select("-password");
        
        if (!existingUser) {
            responseHandler(resp,401,"Unauthorised User" ,"error")
            return;
        }

        req.user = existingUser;
        next();
        
    } catch (error) {
        responseHandler(resp,500, "Invalid Token: Token Mismatch","fail")
    }
};

export default authMiddleware;