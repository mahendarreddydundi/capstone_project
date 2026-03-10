const crypto = require("crypto")

function deriveSecret(deviceId){

    return crypto
        .createHash("sha256")
        .update(deviceId)
        .digest("hex")

}

function verifyAuthentication(data){

    const { device_id, message, timestamp, hmac } = data

    const secret = deriveSecret(device_id)

    const payload = message + timestamp

    const calculated = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")

    if(calculated === hmac){

        return { success:true }

    }

    return { success:false }

}

module.exports = { verifyAuthentication }