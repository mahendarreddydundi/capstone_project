#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAMPLES_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
NETWORK_SCRIPT="${SCRIPT_DIR}/network.sh"
CC_NAME="basic"
CC_PATH="../asset-transfer-basic/chaincode-go"
CHANNEL="mychannel"

usage() {
  cat <<EOF
Usage: ./fabric_iot_ops.sh <command>

Commands:
  prereqs     Install Fabric binaries/images if missing
  up          Start network + create channel
  deploy      Deploy basic Go chaincode
  restart     Restart network and redeploy chaincode
  status      Show running Fabric containers
  channel     Verify mychannel and peer join info
  logs        Show logs for peer0.org1 and orderer
  down        Stop and clean network artifacts
  testtx      Invoke InitLedger and query GetAllAssets
EOF
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

ensure_prereqs() {
  need_cmd docker
  need_cmd curl

  if [[ ! -x "${SAMPLES_DIR}/bin/peer" ]]; then
    echo "Fabric binaries not found. Installing..."
    if [[ ! -f "${SAMPLES_DIR}/install-fabric.sh" ]]; then
      curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh -o "${SAMPLES_DIR}/install-fabric.sh"
      chmod +x "${SAMPLES_DIR}/install-fabric.sh"
    fi
    (cd "${SAMPLES_DIR}" && ./install-fabric.sh docker binary)
  else
    echo "Fabric binaries already installed."
  fi
}

up_network() {
  (
    cd "${SCRIPT_DIR}"

    # Idempotent startup: network may already be running from prior runs.
    ./network.sh up -ca

    set +e
    channel_output=$(./network.sh createChannel -c "${CHANNEL}" 2>&1)
    channel_status=$?
    set -e

    if [[ ${channel_status} -ne 0 ]]; then
      if echo "${channel_output}" | grep -q "channel already exists\|ledger \[${CHANNEL}\] already exists"; then
        echo "Channel '${CHANNEL}' already exists. Continuing."
      else
        echo "${channel_output}"
        return ${channel_status}
      fi
    else
      echo "${channel_output}"
    fi
  )
}

deploy_cc() {
  (cd "${SCRIPT_DIR}" && ./network.sh deployCC -ccn "${CC_NAME}" -ccp "${CC_PATH}" -ccl go)
}

restart_all() {
  (cd "${SCRIPT_DIR}" && ./network.sh down)
  up_network
  deploy_cc
}

show_status() {
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

show_logs() {
  docker logs peer0.org1.example.com --tail 80 || true
  docker logs orderer.example.com --tail 80 || true
}

check_channel() {
  export PATH="${PATH}:${SAMPLES_DIR}/bin"
  export FABRIC_CFG_PATH="${SAMPLES_DIR}/config"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_TLS_ROOTCERT_FILE="${SCRIPT_DIR}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"
  export CORE_PEER_MSPCONFIGPATH="${SCRIPT_DIR}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
  export CORE_PEER_ADDRESS=localhost:7051

  echo "Listing joined channels for Org1 peer"
  peer channel list
  echo "Reading channel info for ${CHANNEL}"
  peer channel getinfo -c "${CHANNEL}"
}

down_network() {
  (cd "${SCRIPT_DIR}" && ./network.sh down)
}

test_tx() {
  export PATH="${PATH}:${SAMPLES_DIR}/bin"
  export FABRIC_CFG_PATH="${SAMPLES_DIR}/config"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_TLS_ROOTCERT_FILE="${SCRIPT_DIR}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"
  export CORE_PEER_MSPCONFIGPATH="${SCRIPT_DIR}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
  export CORE_PEER_ADDRESS=localhost:7051

  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls \
    --cafile "${SCRIPT_DIR}/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem" \
    -C "${CHANNEL}" -n "${CC_NAME}" \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "${SCRIPT_DIR}/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "${SCRIPT_DIR}/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem" \
    -c '{"function":"InitLedger","Args":[]}'

  peer chaincode query -C "${CHANNEL}" -n "${CC_NAME}" -c '{"function":"GetAllAssets","Args":[]}'
}

main() {
  cmd="${1:-}"
  case "${cmd}" in
    prereqs) ensure_prereqs ;;
    up) ensure_prereqs; up_network ;;
    deploy) deploy_cc ;;
    restart) ensure_prereqs; restart_all ;;
    status) show_status ;;
    channel) check_channel ;;
    logs) show_logs ;;
    down) down_network ;;
    testtx) test_tx ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
