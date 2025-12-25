const User = require("../model/user")
const disposableEmailDomains = require("disposable-email-domains")
const bcrypt = require("bcrypt")

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
            }
            if(!existingUser.verified){
                // otp to email
            }
            if(!existingUser.service){
                resp.status(400).send({message:"Your service has been disbled. Contact website support"})
                return
            }
            resp.status(200).send({message:"Login successfully"})   
            return
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt)

        const result = await User.create({email:updatedEmail,password:hashedPassword})
        // otp to email
        resp.status(201).send({message:"Login successfully",data:result});
    } catch (error) {
        resp.status(500).send({message:"Internal Server Error",error})
    }    
}
const verifyUser = (req,resp) => {

}
module.exports = {loginUser,verifyUser}