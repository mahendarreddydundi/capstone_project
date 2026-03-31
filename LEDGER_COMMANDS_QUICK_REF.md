# 🔍 QUICK LEDGER COMMANDS - Copy & Paste Ready

## 🚀 ONE-LINER COMMANDS (Just Copy & Run)

### Check All Ledger Data (Pretty Printed)
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | python3 -m json.tool
```

### See Only Auth Records (IoT Logs)
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | \
python3 -c "import json, sys; data=json.load(sys.stdin); auth=[x for x in data if 'auth-' in x['ID']]; print(json.dumps(auth, indent=2))"
```

### Count How Many Auth Records
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | \
python3 -c "import json, sys; data=json.load(sys.stdin); print(f'Auth records: {len([x for x in data if \"auth-\" in x[\"ID\"]])}')"
```

### Check Channel Block Height
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer channel getinfo -c mychannel
```

### Get Specific Asset by ID
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer chaincode query -C mychannel -n basic -c '{"Args":["ReadAsset","asset1"]}'
```

### Get Specific Auth Record
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer chaincode query -C mychannel -n basic -c '{"Args":["ReadAsset","auth-iot_device_01-1774986489"]}'
```

### List All Installed Chaincodes
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network && \
peer lifecycle chaincode queryinstalled
```

---

## 🎯 AUTOMATION SCRIPTS

### Use the Pre-Built Ledger Checker (Easiest ✅)
```bash
cd /workspaces/capstone_project && bash check_ledger.sh
```

**Output**: Shows channel status, total records, auth events, chaincode details

---

## 📊 INTERPRETATION GUIDE

### What Do These Fields Mean?

When you see an auth record like:
```json
{
  "AppraisedValue": 1774986489,
  "Color": "blue",
  "ID": "auth-iot_device_01-1774986489",
  "Owner": "iot_device_01",
  "Size": 1
}
```

| Field | Meaning |
|-------|---------|
| `ID` | Unique identifier = `auth-DEVICE_ID-TIMESTAMP` |
| `Owner` | Device that authenticated = `iot_device_01` |
| `AppraisedValue` | Unix timestamp of auth = `1774986489` |
| `Color` | Status (always `blue` = success) |
| `Size` | Number of attempts = `1` |

**Convert timestamp to human-readable**:
```bash
python3 -c "import time; print(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(1774986489)))"
# Output: 2026-03-31 19:48:09
```

---

## 🔥 COMPLETE WORKFLOW (Step-by-Step)

### Step 1: Start Everything
```bash
cd /workspaces/capstone_project
npm run fabric:iot:flow
```

### Step 2: Check Ledger Initial State
```bash
bash check_ledger.sh
# Shows: 6 initial assets + 1 auth record
```

### Step 3: Run Device Auth Demo
```bash
python device/device_client.py --demo-cases
```

### Step 4: Check Ledger After Demo
```bash
bash check_ledger.sh
# Shows: More auth records added
```

### Step 5: View Detailed Auth Sequence
```bash
cd fabric-samples-net/test-network
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | python3 -m json.tool | tail -30
```

---

## 💡 COMMON SCENARIOS

### "Did my device authenticate?"
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | \
grep "iot_device_01"
# If found → Device authenticated ✅
```

### "How many authentications happened?"
```bash
cd /workspaces/capstone_project && bash check_ledger.sh
# Looks for "Auth events logged: X"
```

### "Show me the entire blockchain"
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' 2>&1 | python3 -m json.tool | less
# Press 'q' to exit
```

### "Is blockchain height increasing?"
```bash
# Check 1
cd /workspaces/capstone_project/fabric-samples-net/test-network
peer channel getinfo -c mychannel | grep height

# Wait 5 seconds and check again
sleep 5
peer channel getinfo -c mychannel | grep height

# If height increased → blockchain is working ✅
```

---

## 🔗 VIVA/DEMO TALKING POINTS

**When they ask**: "How do you verify the blockchain?"

**Your answer** (with commands):
1. Run: `bash check_ledger.sh`
2. Show the auth records
3. Explain: "Each successful IoT authentication creates an immutable record with timestamp, device ID, and status"
4. Run: `peer channel getinfo -c mychannel`
5. Show: "The blockchain height increases with each transaction, proving the chain is growing"

---

## 🛠️ TROUBLESHOOTING

**Problem**: Command says "error: no such file or directory"  
**Fix**: Make sure you're in the right directory:
```bash
cd /workspaces/capstone_project/fabric-samples-net/test-network
```

**Problem**: "Endorser and orderer connections failed"  
**Fix**: Network is down. Restart it:
```bash
npm run fabric:ops -- restart
```

**Problem**: "Asset not found"  
**Fix**: Check the exact asset name (case-sensitive):
```bash
peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}' | grep "ID"
```

---

## 📱 Mobile-Friendly Command Card

For your notes/phone:

```
🔍 CHECK LEDGER:
  bash check_ledger.sh

📊 SEE ALL DATA:
  peer chaincode query -C mychannel -n basic \
    -c '{"Args":["GetAllAssets"]}' | python3 -m json.tool

🔐 AUTH LOGS ONLY:
  peer chaincode query -C mychannel -n basic \
    -c '{"Args":["GetAllAssets"]}' | grep "auth-"

📈 BLOCK HEIGHT:
  peer channel getinfo -c mychannel

⚙️ DEPLOYED CODE:
  peer lifecycle chaincode queryinstalled
```

---

## 🎯 WHAT'S NEXT?

✅ **Now you can**:
- View all blockchain data
- Filter IoT authentication logs
- Monitor block height growth
- Verify immutable ledger

✅ **For your viva**:
- Show these commands
- Explain blockchain guarantees
- Demonstrate tamper-proof logging

✅ **To improve (future)**:
- Deploy asset-transfer-auth chaincode
- Add device history queries
- Build web dashboard
- Add performance metrics

---

**Last Updated**: March 31, 2026  
**Status**: 🔥 Production Ready
