const express = require("express")
const router = express.Router()

router.post("/create",function(req,resp){
    resp.send({message:"Api working correct",status:true});    
})

module.exports = router