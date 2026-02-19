import { Response } from "express";
import AllBankAccounts from "../models/AllBankAccounts"; 
import { AuthRequest } from "../middlewares/authMiddleware"; 
import { responseHandler } from "../handlers/responseHandler"; 
import mongoose from "mongoose";

export const addBankAccount = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { bankname, ifsccode, branchcode } = req.body;

        if (!bankname || !ifsccode || !branchcode) {
            responseHandler(resp, 400, "All fields (bankname, ifsccode, branchcode) are required", "error");
            return;
        }

        const newBankAccount = await AllBankAccounts.create({
            bankname,
            ifsccode,
            branchcode
        });

        responseHandler(resp, 201, "Bank account added successfully", "success", newBankAccount);
    } catch (error) {
        console.error("Error adding bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getBankAccounts = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const bankAccounts = await AllBankAccounts.find().sort({ createdAt: -1 });

        if (!bankAccounts || bankAccounts.length === 0) {
            responseHandler(resp, 404, "No bank accounts found", "error", []);
            return;
        }

        responseHandler(resp, 200, "Bank accounts fetched successfully", "success", bankAccounts);
    } catch (error) {
        console.error("Error fetching bank accounts:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const updateBankAccount = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { id } = req.params;
        const { bankname, ifsccode, branchcode } = req.body;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Bank Account ID is required", "error");
            return;
        }

        const updatedAccount = await AllBankAccounts.findByIdAndUpdate(
            id,
            { bankname, ifsccode, branchcode },
            { new: true, runValidators: true } 
        );

        if (!updatedAccount) {
            responseHandler(resp, 404, "Bank account not found", "error");
            return;
        }

        responseHandler(resp, 200, "Bank account updated successfully", "success", updatedAccount);
    } catch (error) {
        console.error("Error updating bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const deleteBankAccount = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "superadmin") {
            responseHandler(resp, 403, "Forbidden: Superadmin access required", "error");
            return;
        }

        const { id } = req.params;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Bank Account ID is required", "error");
            return;
        }

        const deletedAccount = await AllBankAccounts.findByIdAndDelete(id);

        if (!deletedAccount) {
            responseHandler(resp, 404, "Bank account not found", "error");
            return;
        }

        responseHandler(resp, 200, "Bank account deleted successfully", "success");
    } catch (error) {
        console.error("Error deleting bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};