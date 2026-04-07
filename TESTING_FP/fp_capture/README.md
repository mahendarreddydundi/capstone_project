# Fingerprint Capture Module

Hardware interface for fingerprint scanners used in biometric authentication.

## Features

- Multi-scanner support (Futronic, ZKTeco, Generic USB)
- Automatic scanner detection
- Enrollment workflow
- Verification/authentication operations
- Quality scoring

## Quick Start

```python
from fp_capture.scanner_interface import ScannerManager

manager = ScannerManager("generic")  # or "futronic", "zktoeo"
fp_image = manager.enroll_fingerprint("user_001", "device_001")
```

## Supported Scanners

| Scanner | Model | Resolution | Quality |
|---|---|---|---|
| Futronic | FS80H | 308×324 | High |
| ZKTeco | ZK4500 | 500×500 | Medium |
| Generic | USB CMOS | 256×256 | Low-Medium |

## API Reference

### ScannerManager

Main interface for scanner operations.

#### Methods

- **detect_scanners()** → List[ScannerInfo]
- **enroll_fingerprint(user_id, device_id)** → bytes
- **verify_fingerprint(user_id)** → Tuple[bytes, bool]

### FingerprintScanner (Abstract Base)

Base class for all scanner drivers.

#### Implementations

- **FutronicFS80H** (Professional grade)
- **ZKTecoZK4500** (Budget-friendly)
- **GenericUSBCMOS** (Testing)

## CLI Usage

```bash
# Detect connected scanners
python scanner_interface.py --detect

# Enroll user
python scanner_interface.py --enroll user_001 --device device_001 --scanner futronic

# Verify user
python scanner_interface.py --verify user_001 --scanner futronic

# List enrolled users
python scanner_interface.py --list
```

## Integration

Works with [FingerprintPixelConverter](/../fp_processing/) to convert captured images to pixel arrays for blockchain storage.

## Hardware Requirements

- USB port (for all scanners)
- USB drivers (scanner-specific)
- Python 3.9+
