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

## Config

Device client settings are in `device/config.py`:

- `GATEWAY_URL`
- `DEVICE_ID`
- `MESSAGE`

## Notes

- The file `reqirements.txt` is a legacy typo copy; use `requirements.txt`.
- For production systems, secrets must not be derivable from public IDs; use secure hardware-backed key material.
