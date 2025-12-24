const User = require("../model/user")

const loginUser = async(req,resp) => {
    try {
        const {email,password} = req.body
        if(!email || !password){
            resp.send({message:"Email and Password are required"})
            return
        }
        if(typeof email !== "string" || typeof password !== "string"){
            resp.send({message:"Invalid Email or Password"})
            return
        }
        const existingUser = await User.findOne({email})
        if(existingUser){
            resp.send({message:"User with this email already exists"})   
            return
        }
        const result = await User.create({email,password})
        resp.send({message:"User created successfully",data:result});
    } catch (error) {
        resp.send({message:"Internal Server Error",error})
    }    
}
const verifyUser = (req,resp) => {

}
module.exports = {loginUser,verifyUser}