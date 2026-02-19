import nodemailer from 'nodemailer';
import { Response } from 'express';
import { deleteOtp } from './otpService';
import { config } from '../config/config';
import { responseHandler } from '../handlers/responseHandler';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.EMAIL_SERVICE_EMAIL as string,
        pass: config.EMAIL_SERVICE_PASS as string
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
            from: config.EMAIL_SERVICE_EMAIL,
            to: email,
            subject: 'Email Verification required for login',
            text: `Your one time password (otp) for login verification is: ${otp}`
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log("Email sent: " + info.response); 
        responseHandler(resp,statusCode, "Otp sent to your email!","success")
    } catch (error) {
        console.error("Error sending email:", error);
        
        if (otp) {
            deleteOtp(email);
        }
        responseHandler(resp,502,"Service Unavailable. Otp not sent!","fail")
    }
};

export default sendEmail;