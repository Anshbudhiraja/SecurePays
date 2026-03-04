import { Response } from "express";
import BankAccount from "../models/BankAccounts"; 
import { AuthRequest } from "../middlewares/authMiddleware";
import { responseHandler } from "../handlers/responseHandler"; 
import mongoose from "mongoose";
import AllBankAccounts from "../models/AllBankAccounts";

export const addBankAccount = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            responseHandler(resp, 403, "Forbidden: Admin access required", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { bankId, holderName, accountNo, ifscCode } = req.body;

        if (!bankId || !holderName || !accountNo || !ifscCode) {
            responseHandler(resp, 400, "All fields (bankId, holderName, accountNo, ifscCode) are required", "error");
            return;
        }

        if (!mongoose.isValidObjectId(bankId)) {
            responseHandler(resp, 400, "Invalid Bank ID format", "error");
            return;
        }
        const existingBank = await AllBankAccounts.findById(bankId);
        if (!existingBank) {
            responseHandler(resp, 404, "Selected bank does not exist in the system registry", "error");
            return;
        }
        const userObjectId= new mongoose.Types.ObjectId(req.user._id.toString());
        const bankObjectId = new mongoose.Types.ObjectId(bankId.toString());
        const duplicateAccount = await BankAccount.findOne({userId: userObjectId, accountNo, ifscCode });
        if (duplicateAccount) {
            responseHandler(resp, 409, "This account number is already registered under this branch (IFSC)", "error");
            return;
        }
        const newBankAccount = new BankAccount({
            userId:userObjectId,
            bankId: bankObjectId,
            holderName,
            accountNo,
            ifscCode
        });
        await newBankAccount.save()

        responseHandler(resp, 201, "Bank account linked successfully", "success", newBankAccount);
    } catch (error) {
        console.error("Error linking bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const getBankAccounts = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            responseHandler(resp, 403, "Forbidden: Admin access required", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }
        const userId= new mongoose.Types.ObjectId(req.user._id.toString());
        const bankAccounts = await BankAccount.find({userId})
            .populate("bankId", "bankname branchcode") 
            .sort({ createdAt: -1 });

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
export const getAllBankAccountProviders = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            responseHandler(resp, 403, "Forbidden: Admin access required", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }
        const {searchTerm} = req.query
        if (searchTerm && typeof searchTerm !== "string") {
            responseHandler(resp, 400, "Invalid Search Term", "error");
            return;
        }
        let query: any = {};

        if (searchTerm) {
            const regex = new RegExp(searchTerm, "i");
                query.$or = [
                { bankname: regex },
                { ifsccode: regex },
                { branchcode: regex }
            ];
        }

        const bankAccounts = await AllBankAccounts.find(query)
            .sort({ createdAt: -1 });

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
        if (!req.user || req.user.role !== "admin") {
            responseHandler(resp, 403, "Forbidden: Admin access required", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { id } = req.params;
        const { bankId, holderName, accountNo, ifscCode } = req.body;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Valid Bank Account ID is required", "error");
            return;
        }

        if (bankId && !mongoose.isValidObjectId(bankId)) {
             responseHandler(resp, 400, "Invalid Bank ID format", "error");
             return;
        }
        const userId= new mongoose.Types.ObjectId(req.user._id.toString());

        const existingAccount = await BankAccount.findOne({_id:id,userId});
        if (!existingAccount) {
            responseHandler(resp, 404, "Bank account not found", "error");
            return;
        }

        if (bankId) {
            const existingBank = await AllBankAccounts.findById(bankId);
            if (!existingBank) {
                responseHandler(resp, 404, "Selected bank does not exist in the system registry", "error");
                return;
            }
        }

        const finalAccountNo = accountNo || existingAccount.accountNo;
        const finalIfscCode = ifscCode || existingAccount.ifscCode;

        const excludeId = new mongoose.Types.ObjectId(id as string);
        const duplicateAccount = await BankAccount.findOne({
            userId,
            accountNo: finalAccountNo,
            ifscCode: finalIfscCode,
            _id: { $ne: excludeId } 
        });

        if (duplicateAccount) {
            responseHandler(resp, 409, "This account number is already registered under this branch (IFSC) on a different record", "error");
            return;
        }

        const updatedAccount = await BankAccount.findByIdAndUpdate(
            id,
            { bankId, holderName, accountNo, ifscCode },
            { new: true, runValidators: true } 
        ).populate("bankId", "bankname branchcode");

        responseHandler(resp, 200, "Bank account updated successfully", "success", updatedAccount);
    } catch (error) {
        console.error("Error updating bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};
export const deleteBankAccount = async (req: AuthRequest, resp: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== "admin") {
            responseHandler(resp, 403, "Forbidden: Admin access required", "error");
            return;
        }
        if (!req.user.service || !req.user.verified) {
            responseHandler(resp, 401, "Unauthorized User", "error");
            return;
        }
        if(!req.user.kyc_verified){
            return responseHandler(resp,400,"Wait for superadmin to verify your kyc request","error")
        }

        const { id } = req.params;

        if (!id || !mongoose.isValidObjectId(id)) {
            responseHandler(resp, 400, "Valid Bank Account ID is required", "error");
            return;
        }
        const userId= new mongoose.Types.ObjectId(req.user._id.toString());
        
        const account = await BankAccount.findOne({userId,_id:id});

        if (!account) {
            responseHandler(resp, 404, "Bank account not found", "error");
            return;
        }
        await account.deleteOne()
        responseHandler(resp, 200, "Bank account deleted successfully", "success");
    } catch (error) {
        console.error("Error deleting bank account:", error);
        responseHandler(resp, 500, "Internal Server Error", "fail");
    }
};