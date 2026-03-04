import mongoose, { Schema, Document } from "mongoose";

export interface IBankAccount extends Document {
    userId: mongoose.Types.ObjectId;
    bankId: mongoose.Types.ObjectId;
    holderName:string,
    accountNo: string;
    ifscCode: string;
}

const bankAccountSchema: Schema<IBankAccount> = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref:"users"
        },
        bankId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref:"allbankaccounts"
        },
        holderName: {
            type: String,
            required: true,
            trim: true
        },
        ifscCode: {
            type: String,
            required: true,
            trim: true
        },
        accountNo: {
            type: String,
            required: true,
            trim: true
        }
    },
    { timestamps: true }
);

const BankAccount = mongoose.model<IBankAccount>("bank-accounts", bankAccountSchema);
export default BankAccount;