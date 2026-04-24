const crypto = require("crypto")

const PUF_MASTER_SECRET = process.env.PUF_MASTER_SECRET || "CHANGE_THIS_DEV_SECRET_IN_PRODUCTION"

function deriveSecret(deviceId){

    // Use keyed derivation so secrets are not computable from public device IDs.
    return crypto
        .createHmac("sha256", PUF_MASTER_SECRET)
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

module.exports = { verifyAuthentication, deriveSecret }