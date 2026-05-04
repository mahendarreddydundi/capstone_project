# Blockchain-Based IoT Device Authentication Framework Using Physical Unclonable Functions and HMAC-SHA256

This repository contains the implementation used for the capstone security framework and paper evidence.

## Core Security Model

- Device side (Python): simulates a PUF-derived key using a keyed derivation and signs payloads with HMAC-SHA256.
- Gateway side (Node.js/Express): enforces strict validation and five checks in order:
  - schema validation
  - device registry check
  - timestamp freshness window (+/-60 seconds)
  - per-device nonce replay check
  - constant-time HMAC verification
- Blockchain side (Hyperledger Fabric): successful authentications are logged asynchronously for immutable auditability.

## Repository Layout

- `device/`: IoT client, PUF simulation, and HMAC token generation
- `gateway/`: authentication server, tests, benchmark, and blockchain logging adapter
- `fabric-samples-net/`: Fabric test-network and chaincode deployment assets
- `scripts/`: automation runner for reproducible test + benchmark artifacts
- `reports/generated/`: generated run artifacts and output files
- `CODE_WALKTHROUGH.md`: implementation walkthrough and security rationale

## Prerequisites

- Node.js 20+
- Python 3.10+
- Docker (for Fabric network)

## Supervisor Demo Flow

Use this fixed flow in front of your supervisor and do not switch methods mid-run.

### Step 1 (Terminal A)

```bash
cd /workspaces/capstone_project
npm install
npm run fabric:ops -- up
npm run fabric:ops -- deploy
```

### Step 2 (Terminal B)

```bash
cd /workspaces/capstone_project
npm start
```

### Step 3 (Terminal C)

```bash
cd /workspaces/capstone_project
source .venv/bin/activate
python device/device_client.py --demo-cases
```

### Step 4: Optional proof commands, back in Terminal A

```bash
cd /workspaces/capstone_project
npm run fabric:ops -- status
npm run fabric:ops -- channel
npm run fabric:ops -- logs
```

### Step 5: Cleanup after demo, Terminal A

```bash
cd /workspaces/capstone_project
npm run fabric:ops -- down
```

Important:

- For this demo flow, do not run bash run_iot_blockchain_flow.sh.
- Use only the steps above, exactly in order.

## Test and Benchmark

- Unit tests:

```bash
npm test
```

- Benchmark:

```bash
npm run benchmark:auth -- --requests 200 --concurrency 20
```

## Full Reproducible Flow

- Full automation with generated outputs:

```bash
npm run automate:all
```

## Environment Variables

- `PUF_MASTER_SECRET`: shared secret used for keyed PUF simulation
- `GATEWAY_URL`: device client target endpoint (default: `http://localhost:3000/auth`)
- `DEVICE_ID`: device identity used by the Python client
- `MESSAGE`: signed payload message
- `FABRIC_LOG_AUTH`: enable/disable blockchain audit logging (`true` or `false`)
- `FABRIC_TEST_NETWORK_DIR`: Fabric test-network path
- `FABRIC_CHANNEL_NAME`: Fabric channel (default: `mychannel`)
- `FABRIC_CHAINCODE_NAME`: chaincode name (default: `basic`)
- `REQUIRE_HTTPS`: when `true`, gateway rejects non-HTTPS auth requests

## Security Notes

- Do not use default development secrets in production.
- Use TLS/mTLS for device-gateway and gateway-Fabric communication.
- Use hardware PUF and secure key enrollment for production deployments.
