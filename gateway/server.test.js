const test = require("node:test")
const assert = require("node:assert/strict")
const crypto = require("crypto")
const request = require("supertest")

const app = require("./server")

function deriveSecret(deviceId){
    return crypto
        .createHash("sha256")
        .update(deviceId)
        .digest("hex")
}

function buildSignature({ deviceId, message, timestamp, nonce }){
    return crypto
        .createHmac("sha256", deriveSecret(deviceId))
        .update(message + timestamp + nonce)
        .digest("hex")
}

function generateNonce(){
    return crypto.randomBytes(16).toString("hex")
}

test("auth success for registered device", async () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()
    const payload = {
        device_id: "iot_device_01",
        message: "device_authentication",
        timestamp,
        nonce,
        hmac: buildSignature({
            deviceId: "iot_device_01",
            message: "device_authentication",
            timestamp,
            nonce
        })
    }

    const response = await request(app).post("/auth").send(payload)

    assert.equal(response.status, 200)
    assert.equal(response.body.status, "SUCCESS")
})

test("auth fails for unregistered device", async () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()
    const payload = {
        device_id: "unknown_device",
        message: "device_authentication",
        timestamp,
        nonce,
        hmac: buildSignature({
            deviceId: "unknown_device",
            message: "device_authentication",
            timestamp,
            nonce
        })
    }

    const response = await request(app).post("/auth").send(payload)

    assert.equal(response.status, 401)
    assert.equal(response.body.message, "Device not registered")
})

test("auth fails on replay attack window", async () => {
    const timestamp = Math.floor(Date.now() / 1000) - 120
    const nonce = generateNonce()
    const payload = {
        device_id: "iot_device_01",
        message: "device_authentication",
        timestamp,
        nonce,
        hmac: buildSignature({
            deviceId: "iot_device_01",
            message: "device_authentication",
            timestamp,
            nonce
        })
    }

    const response = await request(app).post("/auth").send(payload)

    assert.equal(response.status, 401)
    assert.equal(response.body.message, "Replay attack detected")
})

test("auth fails for wrong hmac", async () => {
    const payload = {
        device_id: "iot_device_01",
        message: "device_authentication",
        timestamp: Math.floor(Date.now() / 1000),
        nonce: generateNonce(),
        hmac: "0".repeat(64)
    }

    const response = await request(app).post("/auth").send(payload)

    assert.equal(response.status, 401)
    assert.equal(response.body.message, "Authentication failed")
})

test("auth fails when nonce is replayed", async () => {
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = generateNonce()
    const payload = {
        device_id: "iot_device_01",
        message: "device_authentication",
        timestamp,
        nonce,
        hmac: buildSignature({
            deviceId: "iot_device_01",
            message: "device_authentication",
            timestamp,
            nonce
        })
    }

    const firstResponse = await request(app).post("/auth").send(payload)
    const secondResponse = await request(app).post("/auth").send(payload)

    assert.equal(firstResponse.status, 200)
    assert.equal(secondResponse.status, 401)
    assert.equal(secondResponse.body.message, "Replay attack detected")
})

test("returns 400 for invalid payload", async () => {
    const response = await request(app).post("/auth").send({ device_id: "iot_device_01" })

    assert.equal(response.status, 400)
    assert.equal(response.body.message, "Invalid request body")
})
