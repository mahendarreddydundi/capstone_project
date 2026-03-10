const express = require("express")
const bodyParser = require("body-parser")

const { verifyAuthentication } = require("./authService")
const { isRegistered } = require("./deviceRegistry")

const app = express()

app.use(bodyParser.json())

app.post("/auth", (req, res) => {

    const { device_id, message, timestamp, hmac } = req.body

    // Step 1: check device registration
    if(!isRegistered(device_id)){
        return res.status(401).json({
            status:"FAILED",
            message:"Device not registered"
        })
    }

    // Step 2: replay attack protection
    const currentTime = Math.floor(Date.now() / 1000)

    const MAX_TIME_DIFF = 60

    if(Math.abs(currentTime - timestamp) > MAX_TIME_DIFF){

        return res.status(401).json({
            status:"FAILED",
            message:"Replay attack detected"
        })

    }

    // Step 3: verify authentication
    const result = verifyAuthentication(req.body)

    if(result.success){

        return res.json({
            status:"SUCCESS",
            message:"Device authenticated"
        })

    } else {

        return res.status(401).json({
            status:"FAILED",
            message:"Authentication failed"
        })

    }

})

app.listen(3000, () => {

    console.log("Gateway running on port 3000")

})