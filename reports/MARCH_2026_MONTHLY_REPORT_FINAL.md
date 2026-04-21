# Capstone Project Monthly Progress Report (Finalized)
## Month: March 2026

- Project Title: Blockchain Based IoT Device Authentication Framework using HMAC-SHA256 and PUF
- Project ID: CAPSTONE 2022 24183 4
- Student Name: Dundi Mahendar Reddy
- Roll Number: AP22110011262
- Team Size: 04
- Team Members:
  - GangaRamPrasad Kotakonda (AP22110011255)
  - Rahul Sambaturu (AP22110011279)
  - Asif Shaik (AP22110011258)
- Supervisor: Dr. Mallavalli Sitharam
- Department: Computer Science and Engineering, SRM University AP

## Project Overview
The project delivers a secure IoT authentication framework combining PUF-based identity derivation, HMAC-SHA256 verification, and Hyperledger Fabric logging for immutable auditability. The system validates device authenticity and rejects replay/tampered requests using timestamp and nonce controls.

## Work Completed During March 2026
- Implemented and validated end-to-end authentication pipeline (device -> gateway -> blockchain).
- Integrated non-blocking blockchain logging so API response remains fast.
- Verified security checks: HMAC validation, timestamp freshness, and replay prevention.
- Successfully executed integrated demo scenarios with expected outcomes.

## Work Planned for April 2026
- Production hardening of deployment scripts and configuration.
- Performance benchmarking under concurrent requests.
- Final demo preparation and report/documentation consolidation.

## Progress Status
- Overall completion increased from approximately 30% to approximately 80% during the month.
- March milestones completed.

## Challenges and Resolution
- Challenge: Blockchain logging without degrading gateway latency.
- Resolution: Asynchronous best-effort logging after successful authentication response.

## Learning Outcomes
- Practical understanding of HMAC-SHA256 based IoT authentication.
- Experience integrating gateway validation with immutable blockchain audit trails.

## Student Individual Contribution
Contributed to core authentication flow implementation and integration validation across device, gateway, and blockchain layers, including security verification and progress consolidation.

## Supervisor Observation
- Student completed major planned tasks for the month.
- Number of meetings with supervisor: 04
- Satisfaction status: Satisfied
