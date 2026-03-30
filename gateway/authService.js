const crypto = require("crypto")

function deriveSecret(deviceId){

    return crypto
        .createHash("sha256")
        .update(deviceId)
        .digest("hex")

}

function verifyAuthentication(data){

    const { device_id, message, timestamp, nonce, hmac } = data

    const secret = deriveSecret(device_id)

    const payload = message + timestamp + nonce

    const calculated = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex")

    const calculatedBuffer = Buffer.from(calculated, "hex")
    const receivedBuffer = Buffer.from(hmac, "hex")

    if(
        calculatedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(calculatedBuffer, receivedBuffer)
    ){

        return { success:true }

    }

    return { success:false }

}

module.exports = { verifyAuthentication }