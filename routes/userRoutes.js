const express = require("express")
const router = express.Router()
const {loginUser,verifyUser} = require("../controller/userController")

router.post("/login",loginUser)
router.post("/verify",verifyUser)

module.exports = router