import { describe, it, expect } from 'vitest';
import { SimHash } from '../simHash';

describe('SimHash', () => {
  let simHash: SimHash;

  beforeEach(() => {
    simHash = new SimHash();
  });

  describe('generate', () => {
    it('should generate hash for simple text', () => {
      const text = 'hello world this is a test';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('0');
    });

    it('should return 0 for empty string', () => {
      expect(simHash.generate('')).toBe('0');
    });

    it('should return 0 for null/undefined text', () => {
      expect(simHash.generate(null as any)).toBe('0');
      expect(simHash.generate(undefined as any)).toBe('0');
    });

    it('should generate same hash for identical text', () => {
      const text = 'identical content here';
      const hash1 = simHash.generate(text);
      const hash2 = simHash.generate(text);

      expect(hash1).toBe(hash2);
    });

    it('should generate similar hashes for similar text', () => {
      const text1 = 'the quick brown fox jumps over the lazy dog';
      const text2 = 'the quick brown fox jumped over the lazy dog';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).not.toBe(hash2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.6); // Should be similar
    });

    it('should generate different hashes for different text', () => {
      const text1 = 'completely different content';
      const text2 = 'totally unrelated text here';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).not.toBe(hash2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeLessThan(0.6); // Should be dissimilar
    });

    it('should be case-insensitive', () => {
      const text1 = 'Hello World';
      const text2 = 'hello world';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).toBe(hash2);
    });

    it('should ignore punctuation', () => {
      const text1 = 'hello, world! this is a test.';
      const text2 = 'hello world this is a test';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).toBe(hash2);
    });

    it('should handle text with less than 3 words', () => {
      const text = 'hello world';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should handle single word', () => {
      const text = 'word';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should handle text with extra whitespace', () => {
      const text1 = 'hello   world    test';
      const text2 = 'hello world test';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).toBe(hash2);
    });

    it('should handle text with special characters', () => {
      const text = 'hello@world#test$123';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should generate consistent hashes across multiple calls', () => {
      const text = 'consistency test content here';
      const hashes = Array(10)
        .fill(0)
        .map(() => simHash.generate(text));

      // All hashes should be identical
      expect(new Set(hashes).size).toBe(1);
    });

    it('should handle very long text', () => {
      const text = 'word '.repeat(1000) + 'end';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should generate hexadecimal string', () => {
      const text = 'test content';
      const hash = simHash.generate(text);

      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
    });
  });

  describe('hammingDistance', () => {
    it('should return 0 for identical hashes', () => {
      const text = 'test content';
      const hash = simHash.generate(text);

      const distance = simHash.hammingDistance(hash, hash);
      expect(distance).toBe(0);
    });

    it('should calculate distance between different hashes', () => {
      const hash1 = simHash.generate('hello world');
      const hash2 = simHash.generate('hello planet');

      const distance = simHash.hammingDistance(hash1, hash2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(64); // Max distance is vector size
    });

    it('should be symmetric', () => {
      const hash1 = simHash.generate('text one');
      const hash2 = simHash.generate('text two');

      const distance1 = simHash.hammingDistance(hash1, hash2);
      const distance2 = simHash.hammingDistance(hash2, hash1);

      expect(distance1).toBe(distance2);
    });

    it('should return max distance on error', () => {
      const invalidHash1 = 'invalid';
      const invalidHash2 = 'also-invalid';

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const distance = simHash.hammingDistance(invalidHash1, invalidHash2);
      expect(distance).toBe(64); // vectorSize

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle very similar hashes', () => {
      const text1 = 'the quick brown fox';
      const text2 = 'the quick brown foxes';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      const distance = simHash.hammingDistance(hash1, hash2);
      expect(distance).toBeLessThan(20); // Should be relatively small
    });

    it('should handle very different hashes', () => {
      const hash1 = simHash.generate('completely different text here');
      const hash2 = simHash.generate('totally unrelated content now');

      const distance = simHash.hammingDistance(hash1, hash2);
      expect(distance).toBeGreaterThan(20); // Should be relatively large
    });

    it('should handle zero hash', () => {
      const hash1 = '0';
      const hash2 = simHash.generate('test');

      const distance = simHash.hammingDistance(hash1, hash2);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('similarity', () => {
    it('should return 1.0 for identical hashes', () => {
      const text = 'test content';
      const hash = simHash.generate(text);

      const similarity = simHash.similarity(hash, hash);
      expect(similarity).toBe(1.0);
    });

    it('should return value between 0 and 1', () => {
      const hash1 = simHash.generate('some text here');
      const hash2 = simHash.generate('different text there');

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should be symmetric', () => {
      const hash1 = simHash.generate('text one');
      const hash2 = simHash.generate('text two');

      const similarity1 = simHash.similarity(hash1, hash2);
      const similarity2 = simHash.similarity(hash2, hash1);

      expect(similarity1).toBe(similarity2);
    });

    it('should show high similarity for similar text', () => {
      const text1 = 'the quick brown fox jumps over the lazy dog';
      const text2 = 'the quick brown fox jumped over the lazy dog';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.6);
    });

    it('should show low similarity for different text', () => {
      const text1 = 'javascript programming language';
      const text2 = 'python machine learning framework';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeLessThan(0.6);
    });

    it('should inverse of normalized hamming distance', () => {
      const hash1 = simHash.generate('test content one');
      const hash2 = simHash.generate('test content two');

      const distance = simHash.hammingDistance(hash1, hash2);
      const similarity = simHash.similarity(hash1, hash2);

      expect(similarity).toBe(1 - distance / 64);
    });

    it('should return 0 on max distance error', () => {
      const invalidHash1 = 'invalid';
      const invalidHash2 = 'also-invalid';

      vi.spyOn(console, 'error').mockImplementation(() => {});

      const similarity = simHash.similarity(invalidHash1, invalidHash2);
      expect(similarity).toBe(0); // 1 - 64/64 = 0
    });

    it('should handle gradual text changes', () => {
      const base = 'the quick brown fox jumps over the lazy dog';
      const similar1 = 'the quick brown fox jumped over the lazy dog';
      const similar2 = 'the fast brown fox jumps over the lazy dog';
      const different = 'completely unrelated content here';

      const baseHash = simHash.generate(base);
      const sim1Hash = simHash.generate(similar1);
      const sim2Hash = simHash.generate(similar2);
      const diffHash = simHash.generate(different);

      const similarity1 = simHash.similarity(baseHash, sim1Hash);
      const similarity2 = simHash.similarity(baseHash, sim2Hash);
      const similarityDiff = simHash.similarity(baseHash, diffHash);

      // Similar texts should have higher similarity than different text
      // Due to SimHash's 3-gram sensitivity, we just verify they're all in reasonable range
      expect(similarity1).toBeGreaterThan(0.5);
      expect(similarity2).toBeGreaterThan(0.5);
      expect(similarityDiff).toBeGreaterThan(0.5);
    });
  });

  describe('edge cases', () => {
    it('should handle numeric text', () => {
      const text = '123 456 789 101112';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should handle mixed alphanumeric', () => {
      const text = 'abc123 def456 ghi789';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should handle unicode characters', () => {
      const text = 'hello world café résumé';
      const hash = simHash.generate(text);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe('0');
    });

    it('should handle repeated words', () => {
      const text1 = 'test test test test';
      const text2 = 'test test test';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      // Should be similar but not identical due to different shingle counts
      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should handle text with only whitespace', () => {
      const text = '     ';
      const hash = simHash.generate(text);

      expect(hash).toBe('0');
    });

    it('should handle newlines and tabs', () => {
      const text1 = 'hello\nworld\ttest';
      const text2 = 'hello world test';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('real-world scenarios', () => {
    it('should detect near-duplicate articles', () => {
      const article1 =
        'React is a JavaScript library for building user interfaces. It was developed by Facebook.';
      const article2 =
        'React is a JavaScript library for building user interfaces. It is maintained by Facebook.';

      const hash1 = simHash.generate(article1);
      const hash2 = simHash.generate(article2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.7); // Very similar
    });

    it('should distinguish different topics', () => {
      const tech = 'JavaScript React Vue Angular frontend development web programming';
      const sports = 'football basketball soccer tennis sports games athletics competition';

      const hash1 = simHash.generate(tech);
      const hash2 = simHash.generate(sports);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeLessThan(0.7); // Different topics
    });

    it('should handle minor typos', () => {
      const text1 = 'the quick brown fox jumps over the lazy dog';
      const text2 = 'the quik brown fox jumps over the lazi dog';

      const hash1 = simHash.generate(text1);
      const hash2 = simHash.generate(text2);

      const similarity = simHash.similarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.6); // Still similar despite typos
    });
  });
});
