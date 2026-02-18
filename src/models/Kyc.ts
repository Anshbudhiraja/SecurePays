import mongoose, { Schema, Document, Types } from "mongoose";

export interface IKyc extends Document {
    userId: Types.ObjectId;
    video: string;
    pdf: string;
}

const kycSchema: Schema<IKyc> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    video: {
        type: String,
        required: true
    },
    pdf: {
        type: String,
        required: true
    }
});

const KYC = mongoose.model<IKyc>("kyc", kycSchema);

export default KYC;