"""
Fingerprint Matching Engine
Compares fingerprint pixel arrays for authentication
Supports multiple matching algorithms:
  - Euclidean Distance (pixel-by-pixel)
  - Hamming Distance (bit-level)
  - Cosine Similarity (statistical)
  - Template Matching (minutiae-based)
"""

import numpy as np
import logging
from typing import Tuple
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MatchResult:
    """Result of fingerprint matching"""
    is_match: bool
    similarity_score: float  # 0-100%
    distance: float
    match_confidence: float  # 0-1.0
    algorithm: str
    threshold_used: float


class FingerprintMatcher:
    """Match fingerprint pixel arrays for authentication"""

    def __init__(self, match_threshold: float = 0.95):
        """
        Initialize matcher
        
        Args:
            match_threshold: Minimum confidence for positive match (0.95 = 95%)
        """
        self.match_threshold = match_threshold
        logger.info(f"FingerprintMatcher initialized (Threshold: {match_threshold*100:.1f}%)")

    def euclidean_distance(self, fp1: np.ndarray, fp2: np.ndarray) -> float:
        """
        Calculate Euclidean distance between two fingerprint pixel arrays
        Lower distance = better match
        
        Formula: sqrt(sum((p1-p2)^2))
        
        Range: 0 (perfect match) to ~255*sqrt(pixels) (max difference)
        """
        if fp1.shape != fp2.shape:
            logger.error(f"Shape mismatch: {fp1.shape} vs {fp2.shape}")
            return float('inf')

        distance = np.sqrt(np.sum((fp1 - fp2) ** 2))
        return distance

    def normalize_distance_to_confidence(self, distance: float, 
                                        max_pixels: int = 256*256) -> float:
        """
        Convert Euclidean distance to confidence score (0-1)
        Uses exponential decay
        
        confidence = exp(-distance / max_distance)
        """
        max_distance = np.sqrt(max_pixels * (255 ** 2))
        confidence = np.exp(-distance / (max_distance / 10))
        confidence = np.clip(confidence, 0.0, 1.0)
        return confidence

    def hamming_distance(self, fp1: np.ndarray, fp2: np.ndarray) -> float:
        """
        Calculate Hamming distance (bit-level differences)
        Treat each pixel as 8-bit value, count differing bits
        
        Range: 0 (perfect match) to 8*pixel_count (all bits different)
        """
        if fp1.shape != fp2.shape:
            logger.error(f"Shape mismatch: {fp1.shape} vs {fp2.shape}")
            return float('inf')

        # Convert to binary representation
        xor_result = np.bitwise_xor(fp1.astype(np.int32), fp2.astype(np.int32))
        
        # Count set bits
        hamming_dist = np.sum(np.unpackbits(xor_result.astype(np.uint8)))
        return hamming_dist / (len(fp1) * 8)  # Normalize

    def cosine_similarity(self, fp1: np.ndarray, fp2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two fingerprints
        Treats pixels as vectors
        
        Range: -1 (opposite) to 1 (identical)
        """
        if fp1.shape != fp2.shape:
            logger.error(f"Shape mismatch: {fp1.shape} vs {fp2.shape}")
            return 0.0

        # Normalize vectors
        fp1_norm = fp1.astype(np.float32) / (np.linalg.norm(fp1) + 1e-10)
        fp2_norm = fp2.astype(np.float32) / (np.linalg.norm(fp2) + 1e-10)

        # Cosine similarity
        similarity = np.dot(fp1_norm, fp2_norm)
        # Convert from [-1, 1] to [0, 1]
        similarity = (similarity + 1) / 2
        return np.clip(similarity, 0.0, 1.0)

    def template_matching(self, enrolled_fp: np.ndarray, 
                         verification_fp: np.ndarray) -> Tuple[float, float]:
        """
        Template-based matching (simplified minutiae matching)
        Divides fingerprint into regions and compares frequency patterns
        
        Returns: (confidence, match_score)
        """
        # Reshape to 2D for region comparison
        try:
            h, w = 256, 256
            enrolled_2d = enrolled_fp.reshape((h, w))
            verify_2d = verification_fp.reshape((h, w))
        except:
            logger.error("Cannot reshape fingerprints to 256x256")
            return 0.0, 0.0

        # Divide into 4x4 grid (16 regions)
        region_size_h = h // 4
        region_size_w = w // 4
        region_scores = []

        for i in range(4):
            for j in range(4):
                r1 = enrolled_2d[i*region_size_h:(i+1)*region_size_h,
                                j*region_size_w:(j+1)*region_size_w]
                r2 = verify_2d[i*region_size_h:(i+1)*region_size_h,
                              j*region_size_w:(j+1)*region_size_w]

                # Compare regions using cross-correlation
                correlation = np.corrcoef(r1.flatten(), r2.flatten())[0, 1]
                if np.isnan(correlation):
                    correlation = 0.0
                region_scores.append(correlation)

        # Average region correlation
        avg_correlation = np.mean(region_scores)
        confidence = (avg_correlation + 1) / 2  # Convert to [0, 1]
        
        return confidence, np.std(region_scores)

    def match_fingerprints(self, enrolled_fp: np.ndarray, 
                          verification_fp: np.ndarray,
                          algorithm: str = "euclidean") -> MatchResult:
        """
        Main matching function
        
        Args:
            enrolled_fp: Enrolled fingerprint pixel array
            verification_fp: Fingerprint to verify
            algorithm: "euclidean", "hamming", "cosine", or "template"
        
        Returns: MatchResult object
        """
        if enrolled_fp.shape != verification_fp.shape:
            logger.error("Fingerprint shapes don't match!")
            return MatchResult(
                is_match=False,
                similarity_score=0.0,
                distance=float('inf'),
                match_confidence=0.0,
                algorithm=algorithm,
                threshold_used=self.match_threshold
            )

        logger.info(f"Matching using {algorithm} algorithm...")

        if algorithm == "euclidean":
            distance = self.euclidean_distance(enrolled_fp, verification_fp)
            confidence = self.normalize_distance_to_confidence(distance)
            similarity_score = (1 - (distance / (256*256*255))) * 100  # Normalize to %

        elif algorithm == "hamming":
            distance = self.hamming_distance(enrolled_fp, verification_fp)
            confidence = 1.0 - distance
            similarity_score = confidence * 100

        elif algorithm == "cosine":
            confidence = self.cosine_similarity(enrolled_fp, verification_fp)
            distance = 1 - confidence
            similarity_score = confidence * 100

        elif algorithm == "template":
            confidence, distance = self.template_matching(enrolled_fp, verification_fp)
            similarity_score = confidence * 100

        else:
            logger.error(f"Unknown algorithm: {algorithm}")
            return None

        # Determine match based on threshold
        is_match = confidence >= self.match_threshold

        result = MatchResult(
            is_match=is_match,
            similarity_score=similarity_score,
            distance=distance,
            match_confidence=confidence,
            algorithm=algorithm,
            threshold_used=self.match_threshold
        )

        logger.info(f"✓ Match Result: {result.algorithm.upper()}")
        logger.info(f"  Confidence: {result.match_confidence:.2%}")
        logger.info(f"  Similarity: {result.similarity_score:.1f}%")
        logger.info(f"  Match: {'YES ✓' if result.is_match else 'NO ✗'}")

        return result

    def multi_algorithm_match(self, enrolled_fp: np.ndarray,
                             verification_fp: np.ndarray) -> dict:
        """
        Run all algorithms and return ensemble result
        Use majority voting for final decision
        """
        logger.info("\n--- Running Multi-Algorithm Matching ---")

        algorithms = ["euclidean", "hamming", "cosine", "template"]
        results = {}
        match_votes = 0

        for algo in algorithms:
            result = self.match_fingerprints(enrolled_fp, verification_fp, algo)
            results[algo] = result
            if result.is_match:
                match_votes += 1

        # Ensemble decision (need >=3/4 algorithms to match)
        ensemble_match = match_votes >= 3
        avg_confidence = np.mean([r.match_confidence for r in results.values()])

        logger.info(f"\n--- ENSEMBLE RESULT ---")
        logger.info(f"  Algorithms matched: {match_votes}/4")
        logger.info(f"  Average confidence: {avg_confidence:.2%}")
        logger.info(f"  Final decision: {'VERIFIED ✓' if ensemble_match else 'REJECTED ✗'}")

        return {
            "ensemble_match": ensemble_match,
            "average_confidence": avg_confidence,
            "individual_results": results,
            "vote_count": match_votes
        }


# Example usage
if __name__ == "__main__":
    print("\n=== Testing FingerprintMatcher ===\n")

    # Create dummy fingerprints for testing
    enrolled = np.random.randint(0, 256, (256*256,), dtype=np.uint8)
    verification = enrolled.copy()  # Perfect match
    verification[100:200] += np.random.randint(-10, 10, 100)  # Add some noise

    matcher = FingerprintMatcher(match_threshold=0.95)
    
    result = matcher.match_fingerprints(enrolled, verification, algorithm="euclidean")
    print(f"\nResult: {'MATCH' if result.is_match else 'NO MATCH'}")
    print(f"Confidence: {result.match_confidence:.2%}")
    
    # Ensemble matching
    ensemble = matcher.multi_algorithm_match(enrolled, verification)
    print(f"\nEnsemble match: {ensemble['ensemble_match']}")
    print(f"Average confidence: {ensemble['average_confidence']:.2%}")
