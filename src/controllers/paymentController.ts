import { Response } from "express";
import mongoose from "mongoose";
import { Statement, TransferStatement } from "../models/Statements";
import User from "../models/User";
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler";
import crypto from "crypto";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { config } from "../config/config";
import { generateStatementExcel } from "../utils/excelService";
import { generateStatementPDF } from "../utils/pdfService";

const generateTransactionId = () => `TXN${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

export const payMoney = async (req: AuthRequest, resp: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user) {
            await session.abortTransaction();
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            await session.abortTransaction();
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            await session.abortTransaction();
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { receiverUpiId, amount } = req.body;
        if (!receiverUpiId || typeof receiverUpiId !== "string" || !amount || amount <= 0) {
            await session.abortTransaction();
            return responseHandler(resp, 400, "Valid UPI ID and Amount are required", "error");
        }

        const receiver = await User.findOne({ upiId: receiverUpiId }).session(session);
        if (!receiver) {
            await session.abortTransaction();
            return responseHandler(resp, 404, "Receiver UPI ID not found in our system", "error");
        }

        if (receiver._id.toString() === req.user._id.toString()) {
            await session.abortTransaction();
            return responseHandler(resp, 400, "You cannot pay yourself", "error");
        }

        const txnId = generateTransactionId();

        const senderStatement = await TransferStatement.create([{
            userId: req.user._id,
            amount: -Math.abs(amount), 
            status: "completed",
            transactionId: txnId,
            receiverUpiId: receiverUpiId
        }], { session });

        const receiverStatement = await TransferStatement.create([{
            userId: receiver._id,
            amount: Math.abs(amount),
            status: "completed",
            transactionId: `REC-${txnId}`, 
            receiverUpiId: req.user.upiId
        }], { session });

        await session.commitTransaction();
        
        responseHandler(resp, 200, "Payment successful", "success", {
            transactionId: txnId,
            amount,
            receiverName: `${receiver.firstName} ${receiver.lastName}`
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Payment Error:", error);
        responseHandler(resp, 500, "Transaction failed", "fail");
    } finally {
        session.endSession();
    }
};
export const requestAmountQr = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            return responseHandler(resp, 401, "Unauthorized", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return responseHandler(resp, 400, "Please enter a valid amount greater than 0", "error");
        }

        const user = await User.findById(req.user._id);
        if (!user || !user.upiId) {
            return responseHandler(resp, 404, "UPI ID not found. Please link your UPI ID first.", "error");
        }

        const fullName = `${user.firstName} ${user.lastName || ''}`.trim();

        const upiUri = `upi://pay?pa=${user.upiId}&pn=${encodeURIComponent(fullName)}&am=${amount}&cu=INR`;

        const qrBase64 = await QRCode.toDataURL(upiUri, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        responseHandler(resp, 200, "Request QR generated successfully", "success", {
            qrCode: qrBase64,
            amount,
            payeeName: fullName,
            upiId: user.upiId
        });

    } catch (error) {
        console.error("Error generating Request QR:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getAllStatements = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            return responseHandler(resp, 401, "Unauthorized User", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { 
            status, 
            startDate, 
            endDate, 
            page = 1, 
            limit = 10 
        } = req.query;

        const query: any = { userId: req.user._id };

        if (status) {
            if(typeof status !== "string" || !["pending", "completed", "failed"].includes(status)){
                return responseHandler(resp,400,"Invalid Status","error")
            }
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
               const start = new Date(startDate as string);
                if (!isNaN(start.getTime())) {
                    query.createdAt.$gte = start;
                } else {
                    return responseHandler(resp, 400, "Invalid start date format", "error");
                }
            }
            if (endDate) {
                const end = new Date(endDate as string);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = end;
                } else {
                    return responseHandler(resp, 400, "Invalid end date format", "error");
                }
            }
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Number(limit));
        const skip = (pageNum - 1) * limitNum;

        const statements = await Statement.find(query)
            .populate("bookingId")
            .populate("bankAccountId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalRecords = await Statement.countDocuments(query);

        responseHandler(resp, 200, "Statements fetched successfully", "success", {
            statements,
            pagination: {
                totalRecords,
                currentPage: pageNum,
                totalPages: Math.ceil(totalRecords / limitNum),
                pageSize: limitNum
            }
        });

    } catch (error) {
        console.error("Error fetching statements:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const exportStatementsCSV = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            return responseHandler(resp, 403, "Forbidden: Unauthorized access", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { status, startDate, endDate } = req.query;
        const query: any = { userId: req.user._id };

        if (status) {
            if(typeof status !== "string" || !["pending", "completed", "failed"].includes(status)){
                return responseHandler(resp,400,"Invalid Status","error")
            }
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
               const start = new Date(startDate as string);
                if (!isNaN(start.getTime())) {
                    query.createdAt.$gte = start;
                } else {
                    return responseHandler(resp, 400, "Invalid start date format", "error");
                }
            }
            if (endDate) {
                const end = new Date(endDate as string);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = end;
                } else {
                    return responseHandler(resp, 400, "Invalid end date format", "error");
                }
            }
        }

        const statements = await Statement.find(query)
            .populate("bookingId")
            .sort({ createdAt: -1 });

        if (statements.length === 0) {
            return responseHandler(resp, 404, "No records found to export", "error");
        }

        const filePath = await generateStatementExcel(statements,req.user);

        resp.download(filePath, "AccountStatement.xlsx", (err) => {
            if (err) {
                console.error("Download error:", err);
            }
            
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting CSV file:", unlinkErr);
                else console.log(`Deleted temporary file: ${filePath}`);
            });
        });

    } catch (error) {
        console.error("Export Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const exportStatementsPDF = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user) {
            return responseHandler(resp, 403, "Forbidden: Unauthorized access", "error");
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { status, startDate, endDate } = req.query;
        const query: any = { userId: req.user._id };

        if (status) {
            if(typeof status !== "string" || !["pending", "completed", "failed"].includes(status)){
                return responseHandler(resp,400,"Invalid Status","error")
            }
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
               const start = new Date(startDate as string);
                if (!isNaN(start.getTime())) {
                    query.createdAt.$gte = start;
                } else {
                    return responseHandler(resp, 400, "Invalid start date format", "error");
                }
            }
            if (endDate) {
                const end = new Date(endDate as string);
                if (!isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = end;
                } else {
                    return responseHandler(resp, 400, "Invalid end date format", "error");
                }
            }
        }

        const statements = await Statement.find(query).populate("bookingId").sort({ createdAt: -1 });

        if (statements.length === 0) {
            return responseHandler(resp, 404, "No records found", "error");
        }

        const filePath = await generateStatementPDF(statements, req.user);

        resp.download(filePath, "AccountStatements.pdf", (err) => {
            if (err) console.error("PDF Download Error:", err);
            
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("PDF Cleanup Error:", unlinkErr);
            });
        });

    } catch (error) {
        console.error("PDF Export Controller Error:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};