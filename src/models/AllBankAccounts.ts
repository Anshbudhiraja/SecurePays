import mongoose, { Schema, Document } from "mongoose";

export interface IBank extends Document {
    bankname: string;
    ifsccode: string;
    branchcode: string;
}

const bankAccountSchema: Schema<IBank> = new Schema(
    {
        bankname: {
            type: String,
            required: true,
            trim: true
        },
        ifsccode: {
            type: String,
            required: true,
            trim: true
        },
        branchcode: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

const AllBankAccounts = mongoose.model<IBank>("allbankaccounts", bankAccountSchema);
export default AllBankAccounts;