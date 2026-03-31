#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_DIR="${ROOT_DIR}/fabric-samples-net/test-network"
PYTHON_BIN="${PYTHON_BIN:-${ROOT_DIR}/.venv/bin/python}"
CLEAN_START="${CLEAN_START:-true}"

if [[ ! -x "${FABRIC_DIR}/fabric_iot_ops.sh" ]]; then
  echo "Missing ${FABRIC_DIR}/fabric_iot_ops.sh"
  exit 1
fi

cd "${ROOT_DIR}"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Python interpreter not found at ${PYTHON_BIN}"
  echo "Set PYTHON_BIN to your interpreter path and retry."
  exit 1
fi

echo "[1/6] Fabric prerequisites"
"${FABRIC_DIR}/fabric_iot_ops.sh" prereqs

if [[ "${CLEAN_START}" == "true" ]]; then
  echo "[2/7] Clean existing network"
  "${FABRIC_DIR}/fabric_iot_ops.sh" down || true
else
  echo "[2/7] Skipping clean start (CLEAN_START=${CLEAN_START})"
fi

echo "[3/7] Start network + channel"
"${FABRIC_DIR}/fabric_iot_ops.sh" up

echo "[4/7] Deploy chaincode"
"${FABRIC_DIR}/fabric_iot_ops.sh" deploy

echo "[5/7] Start gateway with Fabric logging"
export FABRIC_LOG_AUTH=true
export FABRIC_TEST_NETWORK_DIR="${FABRIC_DIR}"
node gateway/server.js > /tmp/capstone_gateway.log 2>&1 &
GATEWAY_PID=$!
trap 'kill ${GATEWAY_PID} >/dev/null 2>&1 || true' EXIT

sleep 2

gateway_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/auth -H "Content-Type: application/json" -d '{}')
if [[ "${gateway_status}" != "400" ]]; then
  echo "Gateway health check failed (expected HTTP 400 for empty payload, got ${gateway_status})"
  exit 1
fi

echo "[6/7] Run IoT demo auth cases"
"${PYTHON_BIN}" device/device_client.py --demo-cases || true

echo "[7/7] Verify chaincode query"
"${FABRIC_DIR}/fabric_iot_ops.sh" testtx

echo "Gateway logs: /tmp/capstone_gateway.log"
echo "Completed: network up, channel created, chaincode deployed, IoT auth executed, blockchain tx verified."
