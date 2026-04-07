"""
Fingerprint Image to Pixel Array Converter
Converts raw fingerprint images into normalized pixel arrays for blockchain storage

Operations:
  - Load fingerprint image (JPG, PNG, etc.)
  - Normalize to grayscale
  - Resize to standard resolution (256x256)
  - Extract 1D pixel array
  - Hash for blockchain storage
"""

import numpy as np
import hashlib
import logging
from typing import Tuple, List
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PixelData:
    """Converted fingerprint pixel data"""
    pixel_array: np.ndarray
    pixel_hash: str
    dimensions: Tuple[int, int]
    bit_depth: int
    quality_score: float
    raw_bytes: bytes


class FingerprintPixelConverter:
    """Convert fingerprint images to standardized pixel arrays"""

    # Standard fingerprint resolution for blockchain storage
    STANDARD_WIDTH = 256
    STANDARD_HEIGHT = 256

    def __init__(self):
        """Initialize converter"""
        logger.info(f"Initializing PixelConverter (Standard: {self.STANDARD_WIDTH}x{self.STANDARD_HEIGHT})")

    @staticmethod
    def load_image(image_path: str) -> np.ndarray:
        """
        Load fingerprint image from file
        Supports: JPG, PNG, BMP, TIFF
        """
        try:
            # Import OpenCV
            import cv2
            
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                logger.error(f"Failed to load image: {image_path}")
                return None
            
            logger.info(f"✓ Loaded image: {image_path} (Shape: {img.shape})")
            return img
        
        except ImportError:
            logger.error("OpenCV (cv2) not installed. Run: pip install opencv-python")
            return None

    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Normalize fingerprint image
        - Convert to grayscale (if needed)
        - Normalize pixel values to [0, 255]
        - Remove noise
        """
        if image is None:
            return None

        # Ensure grayscale
        if len(image.shape) == 3:
            import cv2
            image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Normalize to [0, 255]
        image = (image / image.max() * 255).astype(np.uint8)

        logger.info(f"✓ Image normalized: Min={image.min()}, Max={image.max()}")
        return image

    def resize_image(self, image: np.ndarray, 
                    width: int = None, height: int = None) -> np.ndarray:
        """
        Resize image to standard fingerprint resolution
        Default: 256x256 (standard for blockchain storage)
        """
        if image is None:
            return None

        width = width or self.STANDARD_WIDTH
        height = height or self.STANDARD_HEIGHT

        try:
            import cv2
            resized = cv2.resize(image, (width, height), interpolation=cv2.INTER_CUBIC)
            logger.info(f"✓ Resized: {image.shape} → {resized.shape}")
            return resized
        
        except ImportError:
            logger.error("OpenCV required for resizing")
            return None

    def enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """
        Enhance fingerprint contrast for better matching
        Uses Histogram Equalization
        """
        if image is None:
            return None

        try:
            import cv2
            
            # CLAHE: Contrast Limited Adaptive Histogram Equalization
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(image)
            
            logger.info(f"✓ Contrast enhanced (CLAHE applied)")
            return enhanced
        
        except ImportError:
            logger.error("OpenCV required for enhancement")
            return None

    def extract_pixel_array(self, image: np.ndarray) -> Tuple[List[int], int]:
        """
        Extract 1D pixel array from 2D image
        Flatten to 1D for blockchain storage
        
        Returns: (pixel_list, quality_score)
        """
        if image is None:
            return None, 0

        # Flatten 2D image to 1D array
        pixel_array = image.flatten().tolist()
        
        # Calculate quality score based on contrast
        variance = np.var(image)
        quality_score = min(100, int((variance / 256) * 100))
        
        logger.info(f"✓ Extracted {len(pixel_array)} pixels (Quality: {quality_score}%)")
        return pixel_array, quality_score

    def compute_pixel_hash(self, pixel_array: List[int]) -> str:
        """
        Compute SHA256 hash of pixel array
        Used for blockchain ledger storage and quick matching
        """
        # Convert pixel array to bytes
        pixel_bytes = bytes(pixel_array)
        
        # SHA256 hash
        hash_value = hashlib.sha256(pixel_bytes).hexdigest()
        
        logger.info(f"✓ Pixel hash computed: {hash_value[:16]}...")
        return hash_value

    def convert_image_to_pixels(self, image_path: str, 
                               enhance: bool = True) -> PixelData:
        """
        Complete pipeline: Image → Normalized → Resized → Pixels → Hash
        
        Args:
            image_path: Path to fingerprint image
            enhance: Apply contrast enhancement
        
        Returns: PixelData object with all converted data
        """
        logger.info(f"\n--- Processing: {image_path} ---")

        # 1. Load image
        image = self.load_image(image_path)
        if image is None:
            return None

        # 2. Normalize
        image = self.normalize_image(image)

        # 3. Resize
        image = self.resize_image(image)

        # 4. Enhance contrast (optional)
        if enhance:
            image = self.enhance_contrast(image)

        # 5. Extract pixels
        pixel_array, quality_score = self.extract_pixel_array(image)

        # 6. Compute hash
        pixel_hash = self.compute_pixel_hash(pixel_array)

        # 7. Convert to bytes for blockchain
        pixel_bytes = bytes(pixel_array)

        # Create PixelData object
        pixel_data = PixelData(
            pixel_array=np.array(pixel_array),
            pixel_hash=pixel_hash,
            dimensions=(self.STANDARD_WIDTH, self.STANDARD_HEIGHT),
            bit_depth=8,
            quality_score=quality_score,
            raw_bytes=pixel_bytes
        )

        logger.info(f"✓ Conversion complete: {len(pixel_array)} pixels, hash: {pixel_hash[:16]}...")
        return pixel_data

    def convert_from_bytes(self, image_bytes: bytes, 
                          enhance: bool = True) -> PixelData:
        """
        Convert fingerprint from raw bytes (from scanner hardware)
        
        Args:
            image_bytes: Raw fingerprint image bytes from scanner
            enhance: Apply contrast enhancement
        
        Returns: PixelData object
        """
        logger.info(f"\n--- Processing {len(image_bytes)} bytes from scanner ---")

        import cv2
        
        # Decode image bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        
        if image is None:
            # Handle raw pixel data (already grayscale)
            # Assume it's a raw pixel buffer
            image = np.frombuffer(image_bytes, dtype=np.uint8)
            # Try to reshape to standard size
            try:
                image = image.reshape((256, 256))
            except:
                logger.error("Cannot reshape scanner data to 256x256")
                return None

        # Continue with normal pipeline
        image = self.normalize_image(image)
        image = self.resize_image(image)
        
        if enhance:
            image = self.enhance_contrast(image)

        pixel_array, quality_score = self.extract_pixel_array(image)
        pixel_hash = self.compute_pixel_hash(pixel_array)
        pixel_bytes = bytes(pixel_array)

        pixel_data = PixelData(
            pixel_array=np.array(pixel_array),
            pixel_hash=pixel_hash,
            dimensions=(self.STANDARD_WIDTH, self.STANDARD_HEIGHT),
            bit_depth=8,
            quality_score=quality_score,
            raw_bytes=pixel_bytes
        )

        logger.info(f"✓ Scanner data converted: {len(pixel_array)} pixels")
        return pixel_data

    def serialize_for_blockchain(self, pixel_data: PixelData) -> dict:
        """
        Serialize pixel data for blockchain storage
        Format suitable for Hyperledger Fabric asset
        """
        return {
            "pixel_hash": pixel_data.pixel_hash,
            "dimensions": pixel_data.dimensions,
            "bit_depth": pixel_data.bit_depth,
            "quality_score": pixel_data.quality_score,
            "pixel_count": len(pixel_data.pixel_array),
            "data_type": "fingerprint_pixel_array",
            "encoding": "base64"
        }


# Example usage
if __name__ == "__main__":
    converter = FingerprintPixelConverter()
    
    # Example: Convert from image file
    print("\n=== Testing PixelConverter ===\n")
    
    # This would work with actual fingerprint images
    # result = converter.convert_image_to_pixels("path/to/fingerprint.jpg")
    print("✓ PixelConverter initialized and ready")
    print("  Use: converter.convert_image_to_pixels('path/to/image.jpg')")
    print("  Or:  converter.convert_from_bytes(scanner_image_bytes)")
