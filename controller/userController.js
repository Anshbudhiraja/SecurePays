const User = require("../model/user")
const disposableEmailDomains = require("disposable-email-domains")
const bcrypt = require("bcrypt")
const sendEmail = require("../utils/emailService")
const { generateOtp,verifyOtp } = require("../utils/otpService")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const loginUser = async(req,resp) => {
    try {
        const {email,password} = req.body
        if(!email || !password){
            resp.status(404).send({message:"Email and Password are required"})
            return
        }
        if(typeof email !== "string" || typeof password !== "string"){
            resp.status(400).send({message:"Invalid Email or Password"})
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            resp.status(400).send({message:"Invalid Email Format"})
            return
        }
        const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
        if(!passwordStrengthRegex.test(password)){
            resp.status(400).send({message:"Password should have one uppercase, lowercase, symbol and number"})
            return
        }
        const domain = email.split("@")[1]
        if(disposableEmailDomains.includes(domain)){ // [1,2,3,4].includes(2)
           resp.status(400).send({message:"Spam Email found. Invalid Email"}) 
           return
        }
        const updatedEmail = email.trim().toLowerCase()
        const existingUser = await User.findOne({email:updatedEmail})
        if(existingUser){
            if(!existingUser.password){
                resp.status(400).send({message:"You have logined with your google account"})
                return
            }
            const isMatched = await bcrypt.compare(password,existingUser.password)
            if(!isMatched){
                resp.status(400).send({message:"Invalid Credentials"})
                return
            }
            if(!existingUser.verified){
                const otp = generateOtp(updatedEmail)
                await sendEmail(resp,200,updatedEmail,otp)
                return
            }
            if(!existingUser.service){ 
                resp.status(400).send({message:"Your service has been disbled. Contact website support"})
                return
            }
            
            const payload = {
                id:existingUser._id,
                email:existingUser.email
            }
            const token = jwt.sign(payload,process.env.SECRET_KEY)
            resp.status(200).send({message:"Login successfully",data:{token}})   
            return
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)

        const result = await User.create({email:updatedEmail,password:hashedPassword})
        const otp = generateOtp(updatedEmail)
        await sendEmail(resp,201,updatedEmail,otp)
       
    } catch (error) {
        resp.status(500).send({message:"Internal Server Error",error})
    }    
}
const verifyUser = async(req,resp) => {
    try {
        const {email,otp} = req.body
        if(!email ||  typeof email !== "string"){
            resp.status(400).send({message:"Invalid or Missing Email"})
            return
        }
        if(!otp || typeof otp !== "string"){
            resp.status(400).send({message:"Invalid or Missing Otp"})
            return
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            resp.status(400).send({message:"Invalid Email Format"})
            return
        }
        const otpRegex = /^\d{6}$/;
        if(!otpRegex.test(otp)){
            resp.status(400).send({message:"Invalid Otp Format"})
            return
        }
        const updatedEmail = email?.trim()?.toLowerCase()
        const domain = updatedEmail?.split("@")[1]
        if(disposableEmailDomains.includes(domain)){ // [1,2,3,4].includes(2)
           resp.status(400).send({message:"Spam Email found. Invalid Email"}) 
           return
        }

        const existingUser = await User.findOne({email:updatedEmail}).select("-password")
        if(!existingUser){
            resp.status(400).send({message:"User not found in the database"})
            return
        }
        if(existingUser.verified){
            resp.status(400).send({message:"Your account is already verified"})
            return
        }
        if(!existingUser.service){
            resp.status(400).send({message:"Your service has been disabled. Contact website support"})
            return
        }
       const result = verifyOtp(updatedEmail,otp)
       if(!result.status){
            resp.status(400).send({message:result.message})
            return
       }
       await User.updateOne({_id:existingUser._id},{$set:{verified:true}})
       const payload = {
        email:existingUser.email,
        id:existingUser._id
       }
       const token = jwt.sign(payload,process.env.SECRET_KEY)
       resp.status(200).send({message:result.message,data:{token}})
       return
    } catch (error) {
        resp.status(500).send({message:"Internal Server Error",error})
    }
}
module.exports = {loginUser,verifyUser}