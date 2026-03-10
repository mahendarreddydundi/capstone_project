const registeredDevices = {

    "iot_device_01": true,
    "iot_device_02": true

}

function isRegistered(deviceId){

    return registeredDevices[deviceId] === true

}

module.exports = { isRegistered }