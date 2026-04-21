# PUF + HMAC IoT Authentication Gateway

This project demonstrates a lightweight IoT authentication flow:

- Device side (Python): generates a deterministic PUF-based secret from device ID and signs payloads with HMAC-SHA256.
- Gateway side (Node.js/Express): verifies registration, checks replay window, and validates HMAC.

## Project Structure

- `device/`: IoT client, PUF simulation, and HMAC token generation.
- `gateway/`: authentication API and device registry.
- `fabric-samples/`: Hyperledger Fabric samples (independent from the auth demo).

## Prerequisites

- Node.js 18+
- Python 3.10+

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

## Run the Demo

### 1. Start the gateway

```bash
npm start
```

Gateway endpoint:

- `POST /auth` on `http://localhost:3000/auth`

### 2. Run the IoT device client (new terminal)

```bash
python device/device_client.py
```

To demonstrate both valid and invalid/attack scenarios (recommended for capstone evidence):

```bash
python device/device_client.py --demo-cases
```

On Windows PowerShell, do not run the script name directly (for example, `device_client.py`).
Use Python explicitly:

```powershell
d:/urop/capstone-project/.venv/Scripts/python.exe device/device_client.py
```

If your terminal is already inside the `device` folder, run:

```powershell
d:/urop/capstone-project/.venv/Scripts/python.exe .\device_client.py
```

Expected behavior:

- If the device is registered and token is valid, gateway responds with `SUCCESS`.
- If the device is unknown, replayed, or tampered, gateway responds with `FAILED`.

When running `--demo-cases`, you should see mixed outcomes, for example:

- `VALID_CASE` -> `SUCCESS`
- `REPLAY_ATTACK` -> `FAILED` (`Replay attack detected`)
- `INVALID_HMAC` -> `FAILED` (`Authentication failed`)
- `UNREGISTERED_DEVICE` -> `FAILED` (`Device not registered`)
- `INVALID_PAYLOAD` -> `FAILED` (`Invalid request body`)

## Run Tests

```bash
npm test
```

Covers:

- successful authentication
- unregistered device rejection
- replay attack rejection
- invalid HMAC rejection
- invalid payload handling

## Benchmark Authentication Performance

Run load benchmark against the running gateway:

```bash
npm run benchmark:auth -- --requests 1000 --concurrency 50
```

Optional parameters:

- `--url` (default: `http://localhost:3000/auth`)
- `--device` (default: `iot_device_01`)
- `--message` (default: `device_authentication`)
- `--requests` (default: `500`)
- `--concurrency` (default: `25`)

The command prints JSON with throughput and latency percentiles (`p50`, `p95`, `p99`, `max`).

## Config

Device client settings are in `device/config.py`:

- `GATEWAY_URL`
- `DEVICE_ID`
- `MESSAGE`

Gateway Fabric settings (optional environment variables):

- `FABRIC_LOG_AUTH` (`true` or `false`)
- `FABRIC_TEST_NETWORK_DIR` (path to Fabric test network)
- `FABRIC_CHANNEL_NAME` (default: `mychannel`)
- `FABRIC_CHAINCODE_NAME` (default: `basic`)

## Notes

- The file `reqirements.txt` is a legacy typo copy; use `requirements.txt`.
- For production systems, secrets must not be derivable from public IDs; use secure hardware-backed key material.
