const allowedDeviceIds = new Set([
    "iot_device_01",
    "iot_device_02"
])

function isRegistered(deviceId){
    if(typeof deviceId !== "string" || deviceId.length === 0){
        return false
    }

    return allowedDeviceIds.has(deviceId)
}

module.exports = { isRegistered }