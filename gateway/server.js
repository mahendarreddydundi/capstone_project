const express = require("express")
const bodyParser = require("body-parser")

const { verifyAuthentication } = require("./authService")
const { isRegistered } = require("./deviceRegistry")

const app = express()

app.use(bodyParser.json())

function isValidRequestBody(body){

    if(!body || typeof body !== "object"){
        return false
    }

    const { device_id, message, timestamp, hmac } = body

    if(typeof device_id !== "string" || device_id.length === 0){
        return false
    }

    if(typeof message !== "string" || message.length === 0){
        return false
    }

    const parsedTimestamp = Number(timestamp)

    if(!Number.isInteger(parsedTimestamp)){
        return false
    }

    if(typeof hmac !== "string" || !/^[a-f0-9]{64}$/i.test(hmac)){
        return false
    }

    return true

}

app.post("/auth", (req, res) => {

    if(!isValidRequestBody(req.body)){
        return res.status(400).json({
            status:"FAILED",
            message:"Invalid request body"
        })
    }

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

if(require.main === module){
    app.listen(3000, () => {
        console.log("Gateway running on port 3000")
    })
}

module.exports = app