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

## Quick Start

1. Install Node dependencies:

```bash
npm install
```

2. Set shared PUF master secret (required for secure runs):

```bash
export PUF_MASTER_SECRET="replace-with-strong-secret"
```

3. Start gateway:

```bash
npm start
```

4. Run device demo scenarios in another terminal:

```bash
python device/device_client.py --demo-cases
```

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

- End-to-end Fabric + gateway + device flow:

```bash
npm run fabric:iot:flow
```

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
