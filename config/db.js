const mongoose = require("mongoose")

const connectDB = async() => {
   await mongoose.connect("mongodb://localhost:27017/SecurePay")
   console.log("Connected to MongoDB")
}
module.exports = connectDB