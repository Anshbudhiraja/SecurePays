import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    password?: string;
    address?: string;
    city?: string;
    state?: string;
    image?: string;
    verified?: boolean;
    kyc_verified?: boolean;
    service?: boolean;
    role?: "superadmin" | "admin"; 
    createdAt: Date; 
    updatedAt: Date; 
    upiId?: string;
    upiQr?: string;
    status?: "active" | "inactive"
}

const userSchema: Schema<IUser> = new Schema(
    {
        firstName: { type: String, required: false },
        lastName: { type: String, required: false },
        email: { type: String, required: true },
        phone: { type: String, required: false },
        password: { type: String, required: false },
        address: { type: String, required: false },
        city: { type: String, required: false },
        state: { type: String, required: false },
        image: { type: String, required: false },
        verified: { type: Boolean, required: false, default: false },
        kyc_verified: { type: Boolean, required: false, default: false },
        service: { type: Boolean, required: false, default: true },
        role: { 
            type: String, 
            required: false, 
            enum: ["superadmin", "admin"], 
            default: "admin" 
        },
        upiId: { type: String, required: false, },
        upiQr: { type: String, required: false },
        status: { 
            type: String, 
            enum: ["online", "offline"], 
            default: "offline" 
        }
    },
    { timestamps: true }
);

const User = mongoose.model<IUser>("users", userSchema);
export default User;