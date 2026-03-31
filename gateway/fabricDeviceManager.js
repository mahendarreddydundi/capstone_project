const path = require("path")
const { execFile } = require("child_process")

function buildFabricEnv(testNetworkDir){
    return {
        ...process.env,
        PATH: `${process.env.PATH}:${path.resolve(testNetworkDir, "../bin")}`,
        FABRIC_CFG_PATH: path.resolve(testNetworkDir, "../config"),
        CORE_PEER_TLS_ENABLED: "true",
        CORE_PEER_LOCALMSPID: "Org1MSP",
        CORE_PEER_TLS_ROOTCERT_FILE: path.resolve(
            testNetworkDir,
            "organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"
        ),
        CORE_PEER_MSPCONFIGPATH: path.resolve(
            testNetworkDir,
            "organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
        ),
        CORE_PEER_ADDRESS: "localhost:7051"
    }
}

function invokeChaincodeFunction(args, options = {}){
    return new Promise((resolve) => {
        execFile("peer", args, options, (error, stdout, stderr) => {
            if(error){
                return resolve({ ok:false, error, stdout, stderr })
            }
            return resolve({ ok:true, stdout, stderr })
        })
    })
}

async function registerDeviceOnChain({ deviceId }){
    const testNetworkDir = process.env.FABRIC_TEST_NETWORK_DIR
        ? path.resolve(process.env.FABRIC_TEST_NETWORK_DIR)
        : path.resolve(__dirname, "../../fabric-samples-net/test-network")

    const args = [
        "chaincode",
        "invoke",
        "-o", "localhost:7050",
        "--ordererTLSHostnameOverride", "orderer.example.com",
        "--tls",
        "--cafile", path.resolve(testNetworkDir, "organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"),
        "-C", "mychannel",
        "-n", "basic",
        "--peerAddresses", "localhost:7051",
        "--tlsRootCertFiles", path.resolve(testNetworkDir, "organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"),
        "--peerAddresses", "localhost:9051",
        "--tlsRootCertFiles", path.resolve(testNetworkDir, "organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem"),
        "-c", JSON.stringify({ 
            function:"RegisterDevice", 
            Args:[deviceId, deviceId] 
        })
    ]

    const result = await invokeChaincodeFunction(args, {
        cwd: testNetworkDir,
        env: buildFabricEnv(testNetworkDir),
        timeout: 15000,
        maxBuffer: 1024 * 1024
    })

    if(result.ok){
        return { ok:true, message:"Device registered on-chain" }
    }

    return {
        ok:false,
        message: result.error ? result.error.message : "unknown invoke error",
        stderr: result.stderr
    }
}

async function verifyAuthOnChain({ deviceId, message, timestamp, nonce, hmac }){
    const testNetworkDir = process.env.FABRIC_TEST_NETWORK_DIR
        ? path.resolve(process.env.FABRIC_TEST_NETWORK_DIR)
        : path.resolve(__dirname, "../../fabric-samples-net/test-network")

    const args = [
        "chaincode",
        "invoke",
        "-o", "localhost:7050",
        "--ordererTLSHostnameOverride", "orderer.example.com",
        "--tls",
        "--cafile", path.resolve(testNetworkDir, "organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"),
        "-C", "mychannel",
        "-n", "basic",
        "--peerAddresses", "localhost:7051",
        "--tlsRootCertFiles", path.resolve(testNetworkDir, "organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"),
        "--peerAddresses", "localhost:9051",
        "--tlsRootCertFiles", path.resolve(testNetworkDir, "organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem"),
        "-c", JSON.stringify({ 
            function:"VerifyAuthentication", 
            Args:[deviceId, message, String(timestamp), nonce, hmac] 
        })
    ]

    const result = await invokeChaincodeFunction(args, {
        cwd: testNetworkDir,
        env: buildFabricEnv(testNetworkDir),
        timeout: 15000,
        maxBuffer: 1024 * 1024
    })

    if(result.ok){
        return { ok:true, message:"Authentication verified on-chain" }
    }

    return {
        ok:false,
        message: result.error ? result.error.message : "unknown invoke error"
    }
}

module.exports = { registerDeviceOnChain, verifyAuthOnChain }
