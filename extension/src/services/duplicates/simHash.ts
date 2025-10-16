/**
 * SimHash implementation for content fingerprinting
 * Based on Charikar's SimHash algorithm
 */
export class SimHash {
  private readonly vectorSize = 64; // 64-bit hash

  /**
   * Generate SimHash fingerprint for text
   */
  generate(text: string): string {
    if (!text || text.length === 0) {
      return '0';
    }

    const shingles = this.generateShingles(text, 3);
    if (shingles.length === 0) {
      return '0';
    }

    const vector = new Array(this.vectorSize).fill(0);

    shingles.forEach((shingle) => {
      const hash = this.hashString(shingle);
      const weight = 1;

      for (let i = 0; i < this.vectorSize; i++) {
        const bit = (hash >> i) & 1;
        vector[i] += bit === 1 ? weight : -weight;
      }
    });

    // Convert to binary fingerprint
    let fingerprint = 0n;
    for (let i = 0; i < this.vectorSize; i++) {
      if (vector[i] > 0) {
        fingerprint |= 1n << BigInt(i);
      }
    }

    return fingerprint.toString(16);
  }

  /**
   * Generate n-grams (shingles) from text
   */
  private generateShingles(text: string, n: number): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length < n) {
      // If not enough words, return single shingle
      return words.length > 0 ? [words.join(' ')] : [];
    }

    const shingles: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      shingles.push(words.slice(i, i + n).join(' '));
    }

    return shingles;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash >>> 0; // Unsigned
  }

  /**
   * Calculate Hamming distance between two fingerprints
   */
  hammingDistance(hash1: string, hash2: string): number {
    try {
      const a = BigInt('0x' + hash1);
      const b = BigInt('0x' + hash2);
      const xor = a ^ b;

      // Count set bits (Brian Kernighan's algorithm)
      let count = 0;
      let n = xor;
      while (n > 0n) {
        count++;
        n &= n - 1n;
      }

      return count;
    } catch (error) {
      console.error('Error calculating Hamming distance:', error);
      return this.vectorSize; // Max distance on error
    }
  }

  /**
   * Calculate similarity score (0-1)
   */
  similarity(hash1: string, hash2: string): number {
    const distance = this.hammingDistance(hash1, hash2);
    return 1 - distance / this.vectorSize;
  }
}
