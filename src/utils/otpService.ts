import crypto from "crypto";
interface OtpEntry {
    otp: string;
    expiry: number;
}

interface VerifyResult {
    status: boolean;
    message: string;
}

const otpMap = new Map<string, OtpEntry>();
const OTP_EXPIRY_TIME: number = 5 * 60 * 1000;

export const generateOtp = (email: string): string => {
    const number = crypto.randomInt(0, 1000000);
    const otp = String(number).padStart(6, "0"); 
    const expiry = Date.now() + OTP_EXPIRY_TIME;
    
    otpMap.set(email, { otp, expiry });

    setTimeout(() => {
        otpMap.delete(email);
    }, OTP_EXPIRY_TIME);
    
    return otp;
};

export const verifyOtp = (email: string, otp: string): VerifyResult => {
    const otpEntry = otpMap.get(email);

    if (!otpEntry) {
        return { status: false, message: "OTP not found or expired" };
    }

    if (Date.now() > otpEntry.expiry) {
        otpMap.delete(email);
        return { status: false, message: "OTP expired" };
    }

    if (otpEntry.otp === otp) {
        otpMap.delete(email);
        return { status: true, message: "OTP verified successfully" };
    }

    return { status: false, message: "Invalid OTP" };
};

export const deleteOtp = (email: string): void => {
    otpMap.delete(email);
};