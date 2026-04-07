# Fingerprint Pixel Processing Module

Converts fingerprint images to standardized pixel arrays suitable for blockchain storage and matching algorithms.

## Features

- Image-to-pixels conversion pipeline
- Normalization & contrast enhancement
- Grayscale standardization
- Configurable resolution (default 256×256)
- SHA256 hashing for blockchain
- Quality scoring
- Support for both file and byte inputs

## Quick Start

```python
from fp_processing.pixel_converter import FingerprintPixelConverter

converter = FingerprintPixelConverter()

# From file
result = converter.convert_image_to_pixels("fingerprint.jpg", enhance=True)

# From scanner bytes
result = converter.convert_from_bytes(scanner_bytes)

# Access results
print(f"Hash: {result.pixel_hash}")
print(f"Quality: {result.quality_score}%")
print(f"Dimensions: {result.dimensions}")
```

## Processing Steps

1. **Load Image** - Read from JPG/PNG or raw bytes
2. **Normalize** - Convert to grayscale, normalize pixel values [0, 255]
3. **Resize** - Standardize to 256×256 pixels
4. **Enhance** - Optional CLAHE contrast enhancement
5. **Extract** - Flatten to 1D pixel array (65,536 pixels)
6. **Hash** - Compute SHA256 for blockchain storage

## Performance

| Operation | Time |
|---|---|
| Image load | 1-2ms |
| Normalization | 0.5-1ms |
| Resizing | 2-3ms |
| Contrast enhancement | 1-2ms |
| Pixel extraction | 0.1ms |
| Hash computation | 0.5ms |
| **Total** | **5-10ms** |

## Storage Format

Standard fingerprint data stored in blockchain:

```python
pixel_data = {
    "pixel_hash": "3f4e2a1b...",      # SHA256 of pixels
    "dimensions": (256, 256),          # Resolution
    "bit_depth": 8,                    # 0-255 per pixel
    "quality_score": 92.0,             # % confidence
    "pixel_count": 65536,              # Total pixels
    "data_type": "fingerprint_pixel_array"
}
```

## API Reference

### FingerprintPixelConverter

#### Constants

- `STANDARD_WIDTH` = 256
- `STANDARD_HEIGHT` = 256

#### Methods

- **load_image(path)** → np.ndarray
- **normalize_image(img)** → np.ndarray
- **resize_image(img, width, height)** → np.ndarray
- **enhance_contrast(img)** → np.ndarray
- **extract_pixel_array(img)** → Tuple[List, int]
- **compute_pixel_hash(pixels)** → str
- **convert_image_to_pixels(path, enhance)** → PixelData
- **convert_from_bytes(bytes, enhance)** → PixelData
- **serialize_for_blockchain(pixel_data)** → dict

### PixelData (Dataclass)

```python
@dataclass
class PixelData:
    pixel_array: np.ndarray      # 1D array of 65,536 values
    pixel_hash: str              # SHA256 hash
    dimensions: Tuple[int, int]  # (256, 256)
    bit_depth: int               # 8
    quality_score: float         # 0-100%
    raw_bytes: bytes             # Bytes for blockchain
```

## Supported Formats

**Input**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff)
- Raw bytes from scanner

**Output**
- NumPy array
- 1D pixel list
- Blockchain-compatible JSON

## Dependencies

- numpy
- opencv-python (cv2)
- scikit-image

## Integration

Output directly feeds into [FingerprintMatcher](/../fp_matching/) for authentication.

Provides pixel hash for immutable blockchain ledger entries.
