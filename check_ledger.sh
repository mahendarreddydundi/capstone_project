#!/bin/bash
# Quick Ledger Checker - Run anytime to inspect blockchain

set -e

cd /workspaces/capstone_project/fabric-samples-net/test-network

echo "╔════════════════════════════════════════════════════════╗"
echo "║     BLOCKCHAIN LEDGER INSPECTION TOOL                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 1. Channel Status
echo "📊 CHANNEL STATUS"
echo "─────────────────────────────────────────────────────────"
peer channel getinfo -c mychannel 2>&1 | grep "Blockchain info" | sed 's/^/  /'
echo ""

# 2. Total Assets
echo "📦 TOTAL RECORDS IN LEDGER"
echo "─────────────────────────────────────────────────────────"
TOTAL=$(peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | python3 -c "import json, sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
echo "  Total assets: $TOTAL"
echo ""

# 3. Auth Records Only
echo "🔐 IoT AUTHENTICATION RECORDS"
echo "─────────────────────────────────────────────────────────"
AUTH_COUNT=$(peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | python3 -c "import json, sys; data=json.load(sys.stdin); print(len([x for x in data if 'auth-' in x['ID']]))" 2>/dev/null || echo "0")
echo "  Auth events logged: $AUTH_COUNT"
echo ""

if [ "$AUTH_COUNT" -gt 0 ]; then
    echo "  Recent auth events:"
    peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | \
    python3 -c "
import json, sys, time
data = json.load(sys.stdin)
auth = [x for x in data if 'auth-' in x['ID']]
for record in auth[-3:]:  # Last 3
    ts = record['AppraisedValue']
    device = record['Owner']
    dt = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(ts))
    print(f'  ✓ Device: {device:15} | Time: {dt}')
" 2>/dev/null
fi
echo ""

# 4. Chaincode Status
echo "⚙️  DEPLOYED CHAINCODE"
echo "─────────────────────────────────────────────────────────"
peer lifecycle chaincode queryinstalled 2>&1 | grep -E "^Package ID:|Label:" | sed 's/^/  /'
echo ""

# 5. Latest Record Details
echo "📄 LATEST RECORD (Full Details)"
echo "─────────────────────────────────────────────────────────"
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | \
python3 -c "
import json, sys
data = json.load(sys.stdin)
if data:
    latest = data[-1]
    print('  {')
    for key, value in latest.items():
        print(f'    \"{key}\": {json.dumps(value)},')
    print('  }')
" 2>/dev/null || echo "  [No records]"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ Ledger check complete!"
echo ""
echo "📖 For detailed queries, see CHECK_LEDGERS_GUIDE.md"
