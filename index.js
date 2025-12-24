const express = require("express")
const cors = require("cors")
const routes = require("./routes/routes")
const connectDB = require("./config/db")

const app = express()
app.use(express.json())
app.use(cors())
app.use("/api",routes)
connectDB()


const PORT = 5000
app.listen(PORT,()=>{
    console.log("Server Started At PORT:"+PORT)
})