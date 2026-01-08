const User = require("../model/user")
const disposableEmailDomains = require("disposable-email-domains")
const bcrypt = require("bcrypt")
const sendEmail = require("../utils/emailService")
const { generateOtp,verifyOtp } = require("../utils/otpService")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const mongoose = require("mongoose")
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
            resp.status(200).send({message:"Login successfully",data:{token,role:existingUser.role}})   
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
       resp.status(200).send({message:result.message,data:{token,role:existingUser.role}})
       return
    } catch (error) {
        resp.status(500).send({message:"Internal Server Error",error})
    }
}
const checkUserDetails = async(req,resp) =>{
    try {
       const token = req.headers.authorization
       if(!token || !token.startsWith("Bearer ")){
          resp.status(400).send({message:"Invalid or Missing Token"})
          return
       }
       const authToken = token.split(" ")[1]
       if(!authToken){
        resp.status(400).send({message:"Invalid or Missing Token"})
        return
       }
       const decoded = jwt.verify(authToken,process.env.SECRET_KEY)
       if(!decoded?.email || !decoded?.id || !mongoose.isValidObjectId(decoded?.id)){
        resp.status(400).send({message:"Unauthorised User"})
        return
       }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(typeof decoded?.email !== "string" || !emailRegex.test(decoded?.email)){
            resp.status(400).send({message:"Invalid Email Format"})
            return
        }

        const updatedEmail = decoded?.email?.trim()?.toLowerCase()
        const domain = updatedEmail?.split("@")[1]
        if(disposableEmailDomains.includes(domain)){
           resp.status(400).send({message:"Spam Email found. Invalid Email"}) 
           return
        }
    
        const existingUser = await User.findOne({email:updatedEmail,_id:decoded.id}).select("-password")
        if(!existingUser){
            resp.status(400).send({message:"Unauthorised User"})
            return
        }
        if(!existingUser.firstName && !existingUser.lastName){
            resp.status(200).send({message:"User details not found",data:{status:false}})
            return    
        }
        resp.status(200).send({message:"User details fetched",data:{status:true,user:existingUser}})
    } catch (error) {
        return resp.status(500).send({message:"Internal Server Error"})
    }
}
const updateUserDetails = async(req,resp) =>{
    try {
        const {firstName,lastName,phone,address,city,state} = req.body
        const generalRegex = /^[A-Za-z][A-Za-z\s'-]{1,49}$/
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/

        if(!firstName || !lastName || !phone || !address || !city || !state){
            resp.status(400).send({message:"Missing Details. Field are required"})
            return
        }
        if(!generalRegex.test(firstName)){
            resp.status(400).send({message:"Invalid FirstName"})
            return
        }
        if(!generalRegex.test(lastName)){
            resp.status(400).send({message:"Invalid lastName"})
            return
        }
        if(!phoneRegex.test(phone)){
            resp.status(400).send({message:"Invalid Phone Number"})
            return
        }
        if(!generalRegex.test(address)){
            resp.status(400).send({message:"Invalid Address"})
            return
        }
        if(!generalRegex.test(city)){
            resp.status(400).send({message:"Invalid City"})
            return
        }
        if(!generalRegex.test(state)){
            resp.status(400).send({message:"Invalid State"})
            return
        }

       const token = req.headers.authorization
       if(!token || !token.startsWith("Bearer ")){
          resp.status(400).send({message:"Invalid or Missing Token"})
          return
       }
       const authToken = token.split(" ")[1]
       if(!authToken){
        resp.status(400).send({message:"Invalid or Missing Token"})
        return
       }
       const decoded = jwt.verify(authToken,process.env.SECRET_KEY)
       if(!decoded?.email || !decoded?.id || !mongoose.isValidObjectId(decoded?.id)){
        resp.status(400).send({message:"Unauthorised User"})
        return
       }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(typeof decoded?.email !== "string" || !emailRegex.test(decoded?.email)){
            resp.status(400).send({message:"Invalid Email Format"})
            return
        }

        const updatedEmail = decoded?.email?.trim()?.toLowerCase()
        const domain = updatedEmail?.split("@")[1]
        if(disposableEmailDomains.includes(domain)){
           resp.status(400).send({message:"Spam Email found. Invalid Email"}) 
           return
        }
    
        const existingUser = await User.findOne({email:updatedEmail,_id:decoded.id}).select("-password")
        if(!existingUser){
            resp.status(400).send({message:"Unauthorised User"})
            return
        }

        existingUser.firstName = firstName
        existingUser.lastName = lastName
        existingUser.phone = phone
        existingUser.address = address
        existingUser.city = city
        existingUser.state = state
        await existingUser.save()
        
        resp.status(200).send({message:"User details updated"})
    } catch (error) {
        return resp.status(500).send({message:"Internal Server Error"})
    }
}
module.exports = {loginUser,verifyUser,checkUserDetails,updateUserDetails}