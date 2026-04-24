# Final Project Report
## Blockchain Based IoT Device Authentication Framework using HMAC-SHA256 and PUF

- Project ID: CAPSTONE 2022 24183 4
- Department: Computer Science and Engineering, SRM University AP
- Team Size: 4
- Reporting Owner: Dundi Mahendar Reddy (AP22110011262)
- Team Members:
  - GangaRamPrasad Kotakonda (AP22110011255)
  - Rahul Sambaturu (AP22110011279)
  - Asif Shaik (AP22110011258)
- Supervisor: Dr. Mallavalli Sitharam

## 1. Executive Summary

This project implements a secure and lightweight authentication framework for IoT devices by combining PUF-derived identity, HMAC-SHA256 request signing, and Hyperledger Fabric blockchain logging. The system validates device authenticity at a Node.js gateway, enforces timestamp freshness and nonce replay protection, and stores successful authentication evidence on-chain for immutable auditing.

The final integrated flow has been successfully executed end-to-end:
- Fabric network up and channel creation
- Chaincode deploy, approval, and commit
- IoT authentication demo scenarios
- Blockchain transaction verification

## 2. Problem Statement

Traditional IoT authentication mechanisms often suffer from one or more of:
- Weak or static device credentials
- Insufficient replay attack resistance
- No tamper-proof audit trail
- High computational overhead for constrained devices

The project goal was to provide a practical, low-latency, auditable authentication pipeline suitable for constrained IoT settings.

## 3. Proposed Architecture

### 3.1 Device Layer
- Simulated PUF secret generation from device identity
- HMAC-SHA256 signature generation over payload: message + timestamp + nonce
- Python client for valid and adversarial test cases

### 3.2 Gateway Layer
- Express-based `/auth` endpoint
- Registered device check
- Request schema validation
- Timestamp window validation (±60 seconds)
- Nonce replay detection
- Constant-time HMAC comparison
- Asynchronous blockchain logging for successful authentication

### 3.3 Blockchain Layer
- Hyperledger Fabric test-network deployment
- Chaincode deployed and committed on `mychannel`
- On-chain recording of authentication events
- Ledger query verification of persisted auth records

## 4. Implementation Status

### 4.1 Completed Modules
- Device client and PUF/HMAC simulation
- Gateway authentication and security checks
- Fabric network operations and chaincode deployment scripts
- Ledger inspection tooling
- Automated end-to-end flow script
- Benchmark tooling for throughput and latency metrics

### 4.2 Validation Summary
- Unit tests: 6/6 passed
- Demo outcomes:
  - Valid auth: accepted
  - Replay attack: rejected
  - Invalid HMAC: rejected
  - Unregistered device: rejected
  - Invalid payload: rejected
- Chaincode lifecycle completed (install, approve, commit, query committed)

## 5. Performance Snapshot

Sample benchmark run (local environment):
- Requests: 200
- Concurrency: 20
- Success rate: 100%
- Throughput: 456.20 auth/sec
- p50 latency: 27.59 ms
- p95 latency: 92.49 ms
- p99 latency: 102.79 ms

Evidence from automated run:
- Artifacts directory: `reports/generated/20260421_173501/`

Note: Final publication metrics should be generated with repeated runs (e.g., 1,000+ requests, multiple trials).

## 6. Security Outcomes

The implemented system demonstrated practical resistance against key attack classes:
- Device spoofing (via secret-derived HMAC verification)
- Message tampering (integrity failure causes rejection)
- Replay attacks (timestamp + nonce checks)
- Timing side-channels in comparison logic (timing-safe compare)

## 7. Automation and Reproducibility

One-command automation for testing + deployment + benchmark + ledger evidence:

```bash
cd /workspaces/capstone_project
npm run automate:all
```

Output artifacts are generated under:
- `reports/generated/<timestamp>/`

Artifacts include:
- test logs
- Fabric flow logs
- benchmark logs and JSON
- ledger check output
- summary report

## 8. Deliverables

- Source code for device/gateway/blockchain integration
- Automation scripts for full reproducible flow
- Monthly progress audit and evidence
- Final project report (this document)
- IEEE-format research paper draft

## 9. Limitations

- PUF is simulated (not hardware PUF extraction)
- Energy measurements are estimated and not yet hardware-profiled
- Biometric module is staged as optional extension
- Large-scale distributed benchmarking remains future work

## 10. Future Work

- Hardware-backed PUF and secure enclave integration
- Expanded benchmark campaigns with multiple gateways
- Long-duration ledger growth experiments
- Optional biometric fusion (fingerprint/iris)
- Post-quantum cryptographic migration analysis
Create a clean IEEE-style system architecture diagram for a blockchain-based IoT authentication framework.

Title: Three-Layer IoT Authentication Framework

Show these three layers:
1. Device Layer (Python): SRAM-PUF simulation, HMAC-SHA256 signing, nonce and timestamp generation
2. Gateway Layer (Node.js/Express): schema validation, device registry check, timestamp freshness ±60s, nonce replay check, constant-time HMAC verification
3. Blockchain Layer (Hyperledger Fabric): asynchronous audit logging using CreateAsset transaction

Show the flow:
- Device sends POST /auth to Gateway
- Gateway performs security checks
- Successful authentication is logged asynchronously to Blockchain
- Use arrows, labels, and a professional white-background IEEE style

Return:
- Mermaid diagram
- SVG-ready version
- short figure caption
## 11. Conclusion

The project objectives were achieved at system level: secure authentication, replay protection, and immutable auditability using a practical IoT-to-gateway-to-blockchain pipeline. The implementation is demonstration-ready and reproducible, with clear paths for publication-grade measurement expansion and production hardening.
