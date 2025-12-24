const express =require("express")
const userRoutes = require("./userRoutes")
const router = express.Router()

router.use("/auth",userRoutes)
module.exports = router