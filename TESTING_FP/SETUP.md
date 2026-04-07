# Installation & Setup Guide for TESTING_FP Module

## Quick Setup

### 1. Install Dependencies

```bash
cd TESTING_FP
pip install -r requirements.txt
```

### 2. Test Scanner Detection

```bash
python fp_capture/scanner_interface.py --detect
```

Expected output:
```
INFO:root:Scanning for connected fingerprint scanners...
INFO:root:Initializing Futronic FS80H scanner driver
INFO:root:✓ Connected to Futronic FS80H
(detection would show available scanners)
```

### 3. Run Test Suite

```bash
# Unit tests for pixel converter
python -m pytest fp_processing/pixel_converter.py -v

# Unit tests for matcher
python -m pytest fp_matching/matcher.py -v
```

## Fingerprint Capture Module

### Supported Hardware

- **Futronic FS80H** (Recommended - professional grade)
- **ZKTeco ZK4500** (Budget-friendly)
- **Suprema BioMini Combo** (Multi-modal)
- **Generic USB CMOS** (For testing without hardware)

### Usage Examples

#### Enroll Fingerprint

```bash
python fp_capture/scanner_interface.py --enroll user_001 --scanner generic
```

#### Verify Fingerprint

```bash
python fp_capture/scanner_interface.py --verify user_001 --scanner generic
```

#### Specific Scanner Type

```bash
# Use Futronic FS80H specifically
python fp_capture/scanner_interface.py --enroll john_doe --scanner futronic

# Use ZKTeco ZK4500
python fp_capture/scanner_interface.py --verify john_doe --scanner zktoeo

# Use generic USB (for testing)
python fp_capture/scanner_interface.py --detect --scanner generic
```

## Pixel Processing Module

### Convert Image to Pixel Array

```python
from fp_processing.pixel_converter import FingerprintPixelConverter

converter = FingerprintPixelConverter()

# From image file
result = converter.convert_image_to_pixels("path/to/fingerprint.jpg", enhance=True)

# From scanner bytes
scanner_bytes = b'\x00\x01\x02...'  # Raw bytes from fingerprint scanner
result = converter.convert_from_bytes(scanner_bytes, enhance=True)

# Access result
print(f"Pixel array length: {len(result.pixel_array)}")
print(f"Pixel hash: {result.pixel_hash}")
print(f"Quality score: {result.quality_score}%")
print(f"Dimensions: {result.dimensions}")
```

### Serialize for Blockchain

```python
# Convert to blockchain-compatible format
blockchain_data = converter.serialize_for_blockchain(result)

# Result ready for smart contract storage
print(blockchain_data)
# Output:
# {
#     'pixel_hash': '3f4e2a1b...',
#     'dimensions': (256, 256),
#     'bit_depth': 8,
#     'quality_score': 92.0,
#     'pixel_count': 65536,
#     'data_type': 'fingerprint_pixel_array'
# }
```

## Fingerprint Matching Module

### Match Two Fingerprints

```python
from fp_matching.matcher import FingerprintMatcher
import numpy as np

matcher = FingerprintMatcher(match_threshold=0.95)

# Load or generate fingerprints (256x256 = 65,536 pixels)
enrolled_fp = np.random.randint(0, 256, (256*256,), dtype=np.uint8)
test_fp = enrolled_fp.copy()  # Perfect match for testing

# Single algorithm match
result = matcher.match_fingerprints(
    enrolled_fp, 
    test_fp, 
    algorithm="euclidean"
)

print(f"Match: {'YES' if result.is_match else 'NO'}")
print(f"Confidence: {result.match_confidence:.2%}")
print(f"Similarity: {result.similarity_score:.1f}%")

# Multi-algorithm matching (recommended)
ensemble = matcher.multi_algorithm_match(enrolled_fp, test_fp)
print(f"Ensemble match: {ensemble['ensemble_match']}")
print(f"Vote count: {ensemble['vote_count']}/4 algorithms")
```

### Available Matching Algorithms

| Algorithm | Method | Use Case |
|---|---|---|
| **euclidean** | Pixel-by-pixel distance | Best for general use |
| **hamming** | Bit-level comparison | Fast, compact |
| **cosine** | Vector-based similarity | Statistical matching |
| **template** | Region-based correlation | Minutiae-inspired |

## Integration with Main Framework

### Modify Gateway /auth Endpoint

After testing fingerprint module independently, integrate into main authentication:

```javascript
// gateway/server.js - Modified /auth endpoint

app.post('/auth', async (req, res) => {
    try {
        // Option 1: Traditional HMAC (current)
        if (req.body.hmac) {
            const verified = verifyHMAC(req.body);
            // ... existing logic
        }
        
        // Option 2: Fingerprint biometric
        if (req.body.fingerprint_pixels) {
            const enrolled_fp = await getEnrolledFingerprint(req.body.device_id);
            const match_result = matcher.match_fingerprints(
                enrolled_fp,
                req.body.fingerprint_pixels,
                "euclidean"
            );
            
            if (match_result.is_match) {
                // Generate HMAC for this session
                const hmac = generateHMAC(req.body.device_id);
                // ... continue with blockchain logging
            } else {
                res.status(401).json({ error: "Fingerprint verification failed" });
            }
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Testing Workflow

### Step 1: Baseline Test (No Hardware)

```bash
# Test with generic USB simulator
python fp_capture/scanner_interface.py --detect --scanner generic
python fp_capture/scanner_interface.py --enroll test_user --device device_001 --scanner generic
```

### Step 2: Unit Tests

```bash
# Test pixel converter
python -m pytest fp_processing/test_pixel_converter.py::test_image_loading -v
python -m pytest fp_processing/test_pixel_converter.py::test_pixel_extraction -v
python -m pytest fp_processing/test_pixel_converter.py::test_hash_generation -v

# Test matcher
python -m pytest fp_matching/test_matcher.py::test_euclidean_distance -v
python -m pytest fp_matching/test_matcher.py::test_matching_accuracy -v
```

### Step 3: Integration Test (When Hardware Available)

```bash
# After purchasing fingerprint scanner

# 1. Connect scanner via USB
# 2. Install hardware drivers (scanner-specific)
# 3. Run detection
python fp_capture/scanner_interface.py --detect --scanner futronic

# 3. Enroll test user
python fp_capture/scanner_interface.py --enroll john_doe \
    --device device_001 \
    --scanner futronic

# 4. Verify (should match)
python fp_capture/scanner_interface.py --verify john_doe \
    --scanner futronic

# 5. Test with different finger (should not match)
# (Manually use different finger for this test)
```

### Step 4: Blockchain Integration Test

```bash
# Ensure main fabric network is running
npm run fabric:ops -- up

# Run modified gateway with fingerprint support
node gateway/server.js &

# Send auth request with fingerprint
python -c "
from fp_processing.pixel_converter import FingerprintPixelConverter
import requests
import json

converter = FingerprintPixelConverter()
# Load sample fingerprint
sample_fp = converter.convert_from_bytes(b'\x00' * (256*256))

payload = {
    'device_id': 'device_fp_001',
    'fingerprint_pixels': sample_fp.pixel_array.tolist(),
    'fingerprint_hash': sample_fp.pixel_hash
}

# Send to gateway
response = requests.post('http://localhost:3000/auth', 
                        json=payload)
print(response.json())
"
```

## Performance Benchmarking

### Capture Time Benchmark

```python
import time
from fp_capture.scanner_interface import ScannerManager

manager = ScannerManager("generic")

# Capture 10 times and measure
times = []
for i in range(10):
    start = time.time()
    fp_image = manager.enroll_fingerprint(f"user_{i}", "device_001")
    times.append(time.time() - start)

avg_time = sum(times) / len(times)
print(f"Average capture time: {avg_time*1000:.2f}ms")
```

### Matching Performance Benchmark

```python
import time
from fp_matching.matcher import FingerprintMatcher
import numpy as np

matcher = FingerprintMatcher()
enrolled = np.random.randint(0, 256, (256*256,), dtype=np.uint8)

# Test each algorithm
algorithms = ["euclidean", "hamming", "cosine", "template"]
for algo in algorithms:
    times = []
    for _ in range(100):
        test_fp = enrolled + np.random.randint(-5, 5, (256*256,))
        start = time.time()
        result = matcher.match_fingerprints(enrolled, test_fp, algo)
        times.append((time.time() - start) * 1000)  # Convert to ms
    
    avg_time = sum(times) / len(times)
    print(f"{algo}: {avg_time:.3f}ms average")
```

### Energy Consumption Measurement

For ARM Cortex-M4 devices, use hardware profilers:

```bash
# Example: STM32CubeIDE with power measurement

# 1. Flash TESTING_FP code to microcontroller
# 2. Run power profiler during:
#    - Scanner capture (measure GPIO + UART)
#    - Pixel conversion (measure CPU)
#    - Matching (measure CPU + memory access)
# 3. Calculate energy: Power (mW) × Time (ms) = mJ
```

## Troubleshooting

### Issue 1: Scanner Not Detected

```bash
# Check USB connections
lsusb

# Check drivers installed
apt-get install libusb-1.0-0-dev

# Try generic USB mode first
python fp_capture/scanner_interface.py --detect --scanner generic
```

### Issue 2: Fingerprint Quality Too Low

```bash
# Increase quality threshold check
matcher = FingerprintMatcher(match_threshold=0.90)  # Relax from 0.95

# Better: Improve capture quality
# - Ensure dry finger
# - Apply slight pressure
# - Keep finger still for 2 seconds
```

### Issue 3: Memory Issues with Large Pixel Arrays

```python
# Use memory-efficient numpy operations
enrolled_fp = np.memmap('enrolled_fp.npy', dtype=np.uint8, shape=(256*256,))

# Match with memory-mapped array
result = matcher.match_fingerprints(enrolled_fp, test_fp)
```

## Next Steps After Setup

1. **Research**: Measure and document all metrics (capture time, match accuracy, energy)
2. **Publication**: Prepare results for research paper \
3. **Deployment**: Once tested, integrate into main gateway `/auth` endpoint
4. **Scaling**: Test with 100+ enrolled users, measure blockchain impact
5. **Hardware**: When mentor approves, purchase real fingerprint scanner

---

**Status**: Ready for fingerprint testing!  
**Last Updated**: April 7, 2026
