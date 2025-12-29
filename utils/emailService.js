const nodemailer = require('nodemailer');
const { deleteOtp } = require('./otpService');
require("dotenv").config()
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVICE_EMAIL,
    pass: process.env.EMAIL_SERVICE_PASS
  }
});

const sendEmail = async(resp,statusCode,email,otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_SERVICE_EMAIL,
            to: email,
            subject: 'Email Verification required for login',
            text: 'Your one time password (otp) for login verification is: ' + otp 
        };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:"+info);
      resp.status(statusCode).send({message:"Otp sent to your email!"})
    } catch (error) {
        if(otp) deleteOtp(email)
        resp.status(502).send({message:"Service Unavailable. Otp not sent!"})
    }
}
module.exports = sendEmail