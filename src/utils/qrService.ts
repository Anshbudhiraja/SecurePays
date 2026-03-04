import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { config } from "../config/config"; 

export const generateAndSaveUpiQr = async (upiId: string, name: string, userId: string): Promise<string> => {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}`;
    const qrDir = path.resolve("uploads/qr");
    if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
    }

    // Create a unique filename for the QR code
    const fileName = `qr-${userId}-${Date.now()}.png`;
    const filePath = path.join(qrDir, fileName);

    // Generate the QR code and save it to the server
    await QRCode.toFile(filePath, upiString, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000', // Black QR code
            light: '#FFFFFF' // White background
        }
    });

    // Return the full URL to the saved image
    return `${config.BACKEND_DOMAIN}/uploads/qr/${fileName}`;
};