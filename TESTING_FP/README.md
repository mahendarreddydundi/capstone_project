# TESTING_FP: Fingerprint Authentication Module

This directory contains the implementation for **biometric-based authentication** using fingerprint scanning integrated with the IoT-Blockchain authentication framework.

## 📁 Directory Structure

```
TESTING_FP/
├── fp_capture/              # Scanner hardware interface
│   ├── scanner_interface.py  # Fingerprint scanner driver
│   ├── requirements.txt      # Dependencies for hardware
│   └── README.md             # Capture module docs
├── fp_processing/           # Image-to-pixel conversion
│   ├── pixel_converter.py    # Convert FP image to pixel array
│   ├── feature_extraction.py # Extract minutiae/features
│   └── README.md             # Processing module docs
├── fp_matching/             # Pattern matching engine
│   ├── matcher.py            # Compare pixel arrays (Euclidean/Hamming)
│   ├── similarity_scorer.py  # Calculate match confidence
│   └── README.md             # Matching module docs
├── sample_data/             # Test fingerprints
│   ├── enrolled_fp.npy       # Enrolled fingerprint pixels
│   ├── test_fp1.npy          # Test fingerprint (authorized)
│   └── test_fp2.npy          # Test fingerprint (unauthorized)
└── README.md                 # This file
```

## 🔄 Authentication Flow with Fingerprint

```
1. USER ENROLLMENT
   Scan fingerprint → Capture image → Convert to pixels → Store in SmartContract

2. USER LOGIN
   Scan fingerprint → Capture image → Convert to pixels
   → Query SmartContract for enrolled pixels
   → Match against stored pixels (similarity check)
   → If match (>95% confidence): VERIFIED ✓
   → If no match: LOG IN as NEW USER

3. RE-LOGIN / AUTHENTICATION
   Scan fingerprint → Capture image → Convert to pixels
   → Match against SmartContract enrolled pixels
   → If verified: Return AUTH_SUCCESS with device token
   → If not verified: Return AUTH_FAILED
```

## 🛠️ Integration with Main Framework

The fingerprint module replaces the dummy `{timestamp, msg, id}` payload with:

```python
{
    "device_id": "device_001",
    "fp_pixels": [pixel_array_as_list],  # 1D flattened pixel array
    "fp_hash": "sha256_of_pixels",       # For storage & matching
    "match_confidence": 0.97,             # Similarity score
    "timestamp": "2026-04-07T10:30:00",  # When fingerprint was captured
    "nonce": "abc123def456...",          # For replay detection
    "hmac": "signature_of_payload"       # HMAC-SHA256 signature
}
```

## 📦 Setup & Installation

### Prerequisites
- Python 3.9+
- Fingerprint Scanner Hardware (implementation supports):
  - Futronic FS80H
  - ZKTeco ZK4500
  - Suprema BioMini Combo
  - USB Generic CMOS scanners

### Install Dependencies

```bash
cd TESTING_FP
pip install -r fp_capture/requirements.txt
pip install numpy opencv-python scikit-image scikit-learn
```

### Hardware Connection

1. Connect fingerprint scanner via USB
2. Run scanner detection:
   ```bash
   python fp_capture/scanner_interface.py --detect
   ```

## ✅ Testing

### Unit Tests
```bash
python -m pytest test_pixel_converter.py -v
python -m pytest test_matcher.py -v
```

### Integration Test (Full Flow)
```bash
python fp_capture/scanner_interface.py --enroll
python fp_capture/scanner_interface.py --authenticate
```

### Blockchain Integration
```bash
# After studying this module, integrate with gateway:
python -c "
from fp_processing import pixel_converter
from gateway.server import auth_endpoint
# Modified /auth endpoint payload will include fp_pixels
"
```

## 📊 Parameters for Research Paper Results

Document these metrics in your research:

1. **Capture Metrics**
   - Capture time per fingerprint (ms)
   - Success rate (% of successful captures)
   - Image quality score (0-100)

2. **Processing Metrics**
   - Pixel conversion time (ms)
   - Feature extraction count
   - Memory usage (MB)

3. **Matching Metrics**
   - Genuine Accept Rate (GAR %)
   - False Reject Rate (FRR %)
   - False Accept Rate (FAR %)
   - Equal Error Rate (EER %)

4. **Blockchain Integration**
   - TX latency with FP payload (ms)
   - Storage size per fingerprint (bytes)
   - Matching query time vs. HMAC-only (ms)

## 🔐 Security Considerations

- **Privacy**: Fingerprint pixels stored encrypted in blockchain
- **Liveness Detection**: Prevent fake fingerprints via moisture/texture analysis
- **Encryption**: Convert pixels to ByteString before blockchain storage
- **Revocation**: Device fingerprints can be revoked without firmware update

## 📝 Next Steps

1. **Phase 1**: Implement scanner interface & pixel converter ✓
2. **Phase 2**: Test with sample fingerprints
3. **Phase 3**: Integrate with blockchain (modify `/auth` endpoint)
4. **Phase 4**: Performance benchmarking
5. **Phase 5**: Research paper results & analysis

---

**Status**: Ready for fingerprint scanner implementation  
**Last Updated**: April 7, 2026
