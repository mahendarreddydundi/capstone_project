const crypto = require("crypto")
const { deriveSecret } = require("./authService")

function parseArgs(argv){
    const defaults = {
        url: "http://localhost:3000/auth",
        deviceId: "iot_device_01",
        message: "device_authentication",
        requests: 500,
        concurrency: 25
    }

    const out = { ...defaults }

    for(let i = 2; i < argv.length; i += 1){
        const current = argv[i]
        const next = argv[i + 1]

        if(current === "--url" && next){
            out.url = next
            i += 1
        } else if(current === "--device" && next){
            out.deviceId = next
            i += 1
        } else if(current === "--message" && next){
            out.message = next
            i += 1
        } else if(current === "--requests" && next){
            out.requests = Number(next)
            i += 1
        } else if(current === "--concurrency" && next){
            out.concurrency = Number(next)
            i += 1
        }
    }

    if(!Number.isInteger(out.requests) || out.requests <= 0){
        throw new Error("--requests must be a positive integer")
    }

    if(!Number.isInteger(out.concurrency) || out.concurrency <= 0){
        throw new Error("--concurrency must be a positive integer")
    }

    return out
}

function buildHmac({ deviceId, message, timestamp, nonce }){
    return crypto
        .createHmac("sha256", deriveSecret(deviceId))
        .update(`${message}${timestamp}${nonce}`)
        .digest("hex")
}

function createPayload({ deviceId, message }){
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = crypto.randomBytes(16).toString("hex")

    return {
        device_id: deviceId,
        message,
        timestamp,
        nonce,
        hmac: buildHmac({ deviceId, message, timestamp, nonce })
    }
}

function percentile(sortedValues, p){
    if(sortedValues.length === 0){
        return 0
    }

    const index = Math.min(
        sortedValues.length - 1,
        Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1)
    )

    return sortedValues[index]
}

async function sendOne(url, payload){
    const start = process.hrtime.bigint()

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })

        const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000

        return {
            ok: response.status === 200,
            status: response.status,
            elapsedMs
        }
    } catch (error){
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000

        return {
            ok: false,
            status: 0,
            error: error.message,
            elapsedMs
        }
    }
}

async function runBenchmark(options){
    const { url, deviceId, message, requests, concurrency } = options
    const results = []

    let cursor = 0

    async function worker(){
        while(true){
            const index = cursor
            cursor += 1

            if(index >= requests){
                return
            }

            const payload = createPayload({ deviceId, message })
            const result = await sendOne(url, payload)
            results.push(result)
        }
    }

    const startedAt = process.hrtime.bigint()

    const workers = []
    for(let i = 0; i < concurrency; i += 1){
        workers.push(worker())
    }

    await Promise.all(workers)

    const totalMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000

    const latencies = results.map((r) => r.elapsedMs).sort((a, b) => a - b)
    const successCount = results.filter((r) => r.ok).length

    const byStatus = {}
    for(const result of results){
        const key = String(result.status)
        byStatus[key] = (byStatus[key] || 0) + 1
    }

    return {
        url,
        requests,
        concurrency,
        totalMs,
        throughput: (requests / totalMs) * 1000,
        successCount,
        failureCount: requests - successCount,
        successRate: (successCount / requests) * 100,
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
        max: latencies[latencies.length - 1] || 0,
        byStatus
    }
}

async function main(){
    try {
        const options = parseArgs(process.argv)
        const summary = await runBenchmark(options)

        console.log("Auth benchmark complete")
        console.log(JSON.stringify(summary, null, 2))
    } catch (error){
        console.error(`Benchmark failed: ${error.message}`)
        process.exit(1)
    }
}

if(require.main === module){
    main()
}

module.exports = { runBenchmark }
