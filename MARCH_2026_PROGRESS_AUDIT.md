# Capstone Project Pending-Work Audit (March 2026)

## Summary

This audit checks your monthly report claims against the repository implementation.

Status after this update:
- Core pipeline: Complete
- Security checks (HMAC, timestamp, nonce replay): Complete
- Async blockchain logging: Complete
- Production-hardening config knobs: Complete
- Benchmark tooling for latency/throughput: Complete
- Full live Fabric deployment verification in this session: Pending runtime execution

## Verified as Implemented

1. End-to-end device -> gateway -> blockchain flow
- `device/device_client.py`
- `gateway/server.js`
- `gateway/blockchainLogger.js`
- `run_iot_blockchain_flow.sh`

2. Security validations
- HMAC verification in `gateway/authService.js`
- Timestamp freshness and nonce replay checks in `gateway/server.js`
- Input validation in `gateway/server.js`

3. Automated network and chaincode operations
- `fabric-samples-net/test-network/fabric_iot_ops.sh`
- `check_ledger.sh`

4. Test coverage for gateway auth behavior
- `gateway/server.test.js`

## Completed in This Update

1. Fabric config hardening
- Added environment-driven channel and chaincode selection:
  - `FABRIC_CHANNEL_NAME`
  - `FABRIC_CHAINCODE_NAME`
- Updated:
  - `gateway/blockchainLogger.js`
  - `gateway/fabricDeviceManager.js`

2. Fixed Fabric path bug in on-chain device manager
- Corrected fallback test-network path in `gateway/fabricDeviceManager.js`

3. Added reproducible auth performance benchmark
- New file: `gateway/benchmarkAuth.js`
- New npm script: `npm run benchmark:auth`
- README usage and parameters documented

4. Captured sample benchmark evidence (local run)
- Command used:
  - `npm run benchmark:auth -- --requests 200 --concurrency 20`
- Result summary:
  - Throughput: 461.42 auth/sec
  - Success rate: 100%
  - p50 latency: 18.31 ms
  - p95 latency: 140.42 ms
  - p99 latency: 166.62 ms
  - max latency: 174.13 ms

## Still Requires Live Run (Environment Validation)

These are operational checks and require running Docker/Fabric services:

1. Bring network up and deploy chaincode
- `npm run fabric:iot:flow`

Observed in this session:
- Network/channel bootstrapping completed.
- Flow stalled during `peer lifecycle chaincode install basic.tar.gz`.
- Peer logs show external builder message:
  - `Error: chaincode type not supported: golang` (from `ccaas_builder` detect step)
- Next fix path:
  - Align builder settings in `core.yaml` / test-network external builders, or disable CCAAS builder for this Go chaincode path.

2. Run benchmark and capture report numbers
- `npm run benchmark:auth -- --requests 1000 --concurrency 50`

3. Record p50/p95/p99 and throughput in report tables
- Use benchmark JSON output for Parameter Sets 12 and 13

## Recommendation

Your project implementation is functionally close to completion for March claims. The main remaining step is to execute live benchmark/deployment commands and paste measured numbers into the report template.
