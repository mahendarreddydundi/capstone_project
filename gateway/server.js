const express = require("express")
const bodyParser = require("body-parser")

const { verifyAuthentication } = require("./authService")
const { isRegistered } = require("./deviceRegistry")

const app = express()

app.use(bodyParser.json())

const seenNoncesByDevice = new Map()

const MAX_TIME_DIFF = 60

function logAuthAttempt(deviceId, timestamp, result){
    console.log(
        `[AUTH_ATTEMPT] device_id=${deviceId} timestamp=${timestamp} result=${result}`
    )
}

function cleanupExpiredNonces(nowInSeconds){
    for(const [deviceId, nonceMap] of seenNoncesByDevice.entries()){
        for(const [nonce, timestamp] of nonceMap.entries()){
            if(nowInSeconds - timestamp > MAX_TIME_DIFF){
                nonceMap.delete(nonce)
            }
        }

        if(nonceMap.size === 0){
            seenNoncesByDevice.delete(deviceId)
        }
    }
}

function isNonceReplay(deviceId, nonce, timestamp){
    const nonceMap = seenNoncesByDevice.get(deviceId)

    if(nonceMap && nonceMap.has(nonce)){
        return true
    }

    const nextNonceMap = nonceMap || new Map()
    nextNonceMap.set(nonce, timestamp)
    seenNoncesByDevice.set(deviceId, nextNonceMap)

    return false
}

function isValidRequestBody(body){

    if(!body || typeof body !== "object"){
        return false
    }

    const { device_id, message, timestamp, nonce, hmac } = body

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

    if(typeof nonce !== "string" || nonce.length < 8){
        return false
    }

    if(typeof hmac !== "string" || !/^[a-f0-9]{64}$/i.test(hmac)){
        return false
    }

    return true

}

app.post("/auth", (req, res) => {

    const rawDeviceId = req.body && req.body.device_id
    const rawTimestamp = req.body && req.body.timestamp
    const logDeviceId = typeof rawDeviceId === "string" ? rawDeviceId : "unknown"
    const parsedTimestamp = Number(rawTimestamp)
    const logTimestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : "unknown"

    if(!isValidRequestBody(req.body)){
        logAuthAttempt(logDeviceId, logTimestamp, "INVALID_REQUEST")
        return res.status(400).json({
            status:"FAILED",
            message:"Invalid request body"
        })
    }

    const { device_id, timestamp, nonce } = req.body

    // Step 1: check device registration
    if(!isRegistered(device_id)){
        logAuthAttempt(device_id, timestamp, "DEVICE_NOT_REGISTERED")
        return res.status(401).json({
            status:"FAILED",
            message:"Device not registered"
        })
    }

    // Step 2: replay attack protection with timestamp freshness
    const currentTime = Math.floor(Date.now() / 1000)

    cleanupExpiredNonces(currentTime)

    if(Math.abs(currentTime - timestamp) > MAX_TIME_DIFF){

        logAuthAttempt(device_id, timestamp, "REPLAY_ATTACK_DETECTED")

        return res.status(401).json({
            status:"FAILED",
            message:"Replay attack detected"
        })

    }

    // Step 3: reject reused nonce per device within valid window
    if(isNonceReplay(device_id, nonce, timestamp)){
        logAuthAttempt(device_id, timestamp, "REPLAY_ATTACK_DETECTED")
        return res.status(401).json({
            status:"FAILED",
            message:"Replay attack detected"
        })
    }

    // Step 4: verify authentication
    const result = verifyAuthentication(req.body)

    if(result.success){

        logAuthAttempt(device_id, timestamp, "SUCCESS")

        return res.json({
            status:"SUCCESS",
            message:"Device authenticated"
        })

    } else {

        logAuthAttempt(device_id, timestamp, "AUTHENTICATION_FAILED")

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