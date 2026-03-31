const path = require("path")
const { execFile } = require("child_process")

function makeAuthAssetPayload(deviceId, timestamp){
    const now = Math.floor(Date.now() / 1000)
    const assetId = `auth-${deviceId}-${now}`.replace(/[^a-zA-Z0-9_-]/g, "-")

    return {
        assetId,
        color: "blue",
        size: "1",
        owner: deviceId,
        appraisedValue: String(Number(timestamp) || now)
    }
}

function buildPeerEnv(testNetworkDir){
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

function invokeChaincode(args, options = {}){
    return new Promise((resolve) => {
        execFile("peer", args, options, (error, stdout, stderr) => {
            if(error){
                return resolve({ ok:false, error, stdout, stderr })
            }

            return resolve({ ok:true, stdout, stderr })
        })
    })
}

async function logAuthSuccessToBlockchain({ deviceId, timestamp }){
    const enabled = String(process.env.FABRIC_LOG_AUTH || "false").toLowerCase() === "true"

    if(!enabled){
        return { ok:false, skipped:true, reason:"disabled" }
    }

    const testNetworkDir = process.env.FABRIC_TEST_NETWORK_DIR
        ? path.resolve(process.env.FABRIC_TEST_NETWORK_DIR)
        : path.resolve(__dirname, "../fabric-samples-net/test-network")

    const { assetId, color, size, owner, appraisedValue } = makeAuthAssetPayload(deviceId, timestamp)

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
        "-c", JSON.stringify({ function:"CreateAsset", Args:[assetId, color, size, owner, appraisedValue] })
    ]

    const result = await invokeChaincode(args, {
        cwd: testNetworkDir,
        env: buildPeerEnv(testNetworkDir),
        timeout: 15000,
        maxBuffer: 1024 * 1024
    })

    if(result.ok){
        return { ok:true, assetId }
    }

    return {
        ok:false,
        skipped:false,
        assetId,
        error: result.error ? result.error.message : "unknown invoke error",
        stderr: result.stderr
    }
}

module.exports = { logAuthSuccessToBlockchain }
