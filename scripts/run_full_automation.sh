#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${ROOT_DIR}/reports/generated/${TIMESTAMP}"
BENCH_REQUESTS="${BENCH_REQUESTS:-1000}"
BENCH_CONCURRENCY="${BENCH_CONCURRENCY:-50}"

stop_existing_gateway() {
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti :3000 || true)"
    if [[ -n "${pids}" ]]; then
      echo "Stopping existing process(es) on port 3000: ${pids}"
      kill ${pids} >/dev/null 2>&1 || true
      sleep 1
    fi
  fi
}

mkdir -p "${OUT_DIR}"

cd "${ROOT_DIR}"

echo "[0/7] Cleaning stale gateway processes"
stop_existing_gateway

echo "[1/7] Running tests"
NO_COLOR=1 npm test | tee "${OUT_DIR}/01_tests.log"

echo "[2/7] Running full Fabric IoT flow"
NO_COLOR=1 npm run fabric:iot:flow | tee "${OUT_DIR}/02_fabric_flow.log"

if [[ -f "/tmp/capstone_gateway.log" ]]; then
  cp "/tmp/capstone_gateway.log" "${OUT_DIR}/02_gateway_flow.log"
fi

echo "[3/7] Starting gateway for benchmark"
stop_existing_gateway
node gateway/server.js > "${OUT_DIR}/03_gateway.log" 2>&1 &
GATEWAY_PID=$!
cleanup() {
  kill "${GATEWAY_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
sleep 2

echo "[4/7] Running benchmark"
NO_COLOR=1 npm run benchmark:auth -- --requests "${BENCH_REQUESTS}" --concurrency "${BENCH_CONCURRENCY}" | tee "${OUT_DIR}/04_benchmark.log"

echo "[5/7] Checking ledger"
bash check_ledger.sh | tee "${OUT_DIR}/05_ledger.log"

echo "[6/7] Extracting benchmark JSON"
sed -n '/^{/,$p' "${OUT_DIR}/04_benchmark.log" > "${OUT_DIR}/benchmark.json"

echo "[7/7] Writing automation summary"
PASS_COUNT=$(grep -oE "pass [0-9]+" "${OUT_DIR}/01_tests.log" | tail -1 | awk '{print $2}')
FLOW_STATUS=$(grep -c "Completed: network up, channel created, chaincode deployed, IoT auth executed, blockchain tx verified." "${OUT_DIR}/02_fabric_flow.log" || true)
BENCH_P50=$(grep -E '"p50"' "${OUT_DIR}/benchmark.json" | head -1 | awk -F': ' '{print $2}' | tr -d ',')
BENCH_P95=$(grep -E '"p95"' "${OUT_DIR}/benchmark.json" | head -1 | awk -F': ' '{print $2}' | tr -d ',')
BENCH_P99=$(grep -E '"p99"' "${OUT_DIR}/benchmark.json" | head -1 | awk -F': ' '{print $2}' | tr -d ',')
BENCH_TP=$(grep -E '"throughput"' "${OUT_DIR}/benchmark.json" | head -1 | awk -F': ' '{print $2}' | tr -d ',')
BENCH_SR=$(grep -E '"successRate"' "${OUT_DIR}/benchmark.json" | head -1 | awk -F': ' '{print $2}' | tr -d ',')
AUTH_EVENTS=$(grep -E "Auth events logged:" "${OUT_DIR}/05_ledger.log" | tail -1 | awk -F': ' '{print $2}')
CHAIN_LOG_OK="0"
if [[ -f "${OUT_DIR}/02_gateway_flow.log" ]]; then
  CHAIN_LOG_OK=$(grep -c "\[BLOCKCHAIN_LOG\] status=SUCCESS" "${OUT_DIR}/02_gateway_flow.log" || true)
fi

cat > "${OUT_DIR}/SUMMARY.md" <<EOF
# Automation Summary

- Timestamp: ${TIMESTAMP}
- Test pass count: ${PASS_COUNT:-unknown}
- Fabric flow completed: $([[ "${FLOW_STATUS}" -gt 0 ]] && echo "YES" || echo "NO")
- Benchmark requests/concurrency: ${BENCH_REQUESTS}/${BENCH_CONCURRENCY}
- Benchmark success rate: ${BENCH_SR:-unknown}%
- Benchmark throughput: ${BENCH_TP:-unknown} auth/sec
- Benchmark p50: ${BENCH_P50:-unknown} ms
- Benchmark p95: ${BENCH_P95:-unknown} ms
- Benchmark p99: ${BENCH_P99:-unknown} ms
- Ledger auth events: ${AUTH_EVENTS:-unknown}
- Blockchain log success entries: ${CHAIN_LOG_OK}

Artifacts:
- 01_tests.log
- 02_fabric_flow.log
- 03_gateway.log
- 04_benchmark.log
- 05_ledger.log
- benchmark.json
- 02_gateway_flow.log (if available)
EOF

echo "Automation complete. Output directory: ${OUT_DIR}"
