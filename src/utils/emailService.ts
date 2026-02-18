import nodemailer from 'nodemailer';
import { Response } from 'express';
import { deleteOtp } from './otpService';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_SERVICE_EMAIL as string,
        pass: process.env.EMAIL_SERVICE_PASS as string
    }
});

const sendEmail = async (
    resp: Response, 
    statusCode: number, 
    email: string, 
    otp: string | number
): Promise<void> => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_SERVICE_EMAIL,
            to: email,
            subject: 'Email Verification required for login',
            text: `Your one time password (otp) for login verification is: ${otp}`
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log("Email sent: " + info.response); 
        
        resp.status(statusCode).send({ message: "Otp sent to your email!" });
    } catch (error) {
        console.error("Error sending email:", error);
        
        if (otp) {
            deleteOtp(email);
        }
        
        resp.status(502).send({ message: "Service Unavailable. Otp not sent!" });
    }
};

export default sendEmail;