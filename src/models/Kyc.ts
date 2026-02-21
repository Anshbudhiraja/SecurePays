import mongoose, { Schema, Document, Types } from "mongoose";

export interface IKyc extends Document {
    userId: Types.ObjectId;
    video: string;
    pdf: string;
    status?: boolean;
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
    },
    status:{
        type:Boolean,
        default:false
    }
});

const KYC = mongoose.model<IKyc>("kyc", kycSchema);

export default KYC;