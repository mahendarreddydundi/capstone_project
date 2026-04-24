# Code Walkthrough

## Project Title

Blockchain-Based IoT Device Authentication Framework Using Physical Unclonable Functions and HMAC-SHA256

## 1. End-to-End Flow

1. Device derives a per-device secret using keyed PUF simulation.
2. Device signs payload `message || timestamp || nonce` with HMAC-SHA256.
3. Device sends `POST /auth` payload to gateway.
4. Gateway validates schema and device registration.
5. Gateway enforces timestamp freshness and nonce replay controls.
6. Gateway verifies HMAC using constant-time comparison.
7. Gateway returns HTTP result immediately.
8. On success, gateway writes an asynchronous audit record to Hyperledger Fabric.

## 2. Device Layer

### `device/config.py`

- Central runtime configuration through environment variables.
- Includes `PUF_MASTER_SECRET`, `DEVICE_ID`, `GATEWAY_URL`, and `MESSAGE`.

### `device/puf.py`

- `SRAMPUF.generate_response()` performs keyed derivation:
  - HMAC-SHA256(master_secret, device_id)
- This avoids deriving secrets directly from public identifiers.

### `device/hmac_auth.py`

- Generates secure nonce via `secrets.token_hex(16)`.
- Creates timestamp at second-level granularity.
- Returns tuple `(signature, timestamp, nonce)`.

### `device/device_client.py`

- Builds valid and adversarial test payloads.
- `--demo-cases` executes:
  - valid auth
  - replay attempt
  - invalid HMAC
  - unregistered device
  - malformed payload

## 3. Gateway Layer

### `gateway/server.js`

- `bodyParser.json({ limit: "16kb" })` bounds JSON body size.
- Optional HTTPS enforcement with `REQUIRE_HTTPS=true`.
- Request validation rules:
  - `device_id`: non-empty string
  - `message`: non-empty string
  - `timestamp`: integer
  - `nonce`: exactly 32 hex chars
  - `hmac`: exactly 64 hex chars
- Replay protection logic:
  - reject stale timestamp outside `+/-60s`
  - reject previously seen nonce for same device
- Critical ordering:
  - verify HMAC first
  - then persist nonce as used

### `gateway/authService.js`

- Uses keyed derivation for per-device secrets.
- HMAC verification uses `crypto.timingSafeEqual`.
- Exports `deriveSecret` for consistency across test and benchmark tooling.

### `gateway/deviceRegistry.js`

- Allow-list for enrolled device IDs.
- Explicit type and empty-string checks.

### `gateway/blockchainLogger.js`

- Best-effort asynchronous Fabric invoke.
- Guarded by `FABRIC_LOG_AUTH=true`.
- Produces immutable audit records without blocking authentication response.

### `gateway/server.test.js`

- Covers six security-critical paths:
  - success
  - unregistered device
  - stale timestamp
  - invalid HMAC
  - replay nonce
  - malformed request

### `gateway/benchmarkAuth.js`

- Concurrent benchmark runner.
- Generates fresh nonce/timestamp per request.
- Reports throughput and latency percentiles.

## 4. Blockchain Layer

### `fabric-samples-net/asset-transfer-auth/chaincode-go/smartcontract.go`

- Provides asset compatibility functions used by current automation path.
- Includes extended IoT auth methods (`RegisterDevice`, `VerifyAuthentication`) for future direct on-chain auth validation.

## 5. Automation and Output Artifacts

### `run_iot_blockchain_flow.sh`

- Runs Fabric prerequisites, network setup, chaincode deployment, gateway startup, demo cases, and ledger verification.
- Fails fast on errors to preserve evidence integrity.

### `scripts/run_full_automation.sh`

- Runs tests, full flow, benchmark, ledger checks.
- Writes outputs under `reports/generated/<timestamp>/`:
  - `01_tests.log`
  - `02_fabric_flow.log`
  - `03_gateway.log`
  - `04_benchmark.log`
  - `05_ledger.log`
  - `benchmark.json`
  - `SUMMARY.md`

## 6. Security Posture Summary

- Key derivation is keyed, not public-ID hash only.
- Replay prevention includes freshness and nonce controls.
- HMAC verification is constant-time.
- Audit logging is immutable and decoupled from auth response path.
- Test and benchmark artifacts are reproducible via scripts.
