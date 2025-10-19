import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformanceMonitor, checkMemoryUsage } from '../performance';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  describe('measure', () => {
    it('should measure synchronous function execution time', () => {
      const result = monitor.measure('test-sync', () => {
        return 42;
      });

      expect(result).toBe(42);

      const stats = monitor.getStats('test-sync');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.avg).toBeGreaterThan(0);
    });

    it('should handle Promise return values', async () => {
      const promise = monitor.measure('test-promise', () => {
        return Promise.resolve(123);
      });

      const result = await promise;
      expect(result).toBe(123);

      const stats = monitor.getStats('test-promise');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
    });

    it('should record multiple measurements for same operation', () => {
      monitor.measure('test-multi', () => 1);
      monitor.measure('test-multi', () => 2);
      monitor.measure('test-multi', () => 3);

      const stats = monitor.getStats('test-multi');
      expect(stats!.count).toBe(3);
    });

    it('should warn if exceeds performance budget', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate slow operation exceeding 200ms budget for 'initial-render'
      monitor.measure('initial-render', () => {
        // Manually record a high duration
        (monitor as any).recordMetric('initial-render', 250);
        return 'done';
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const warnCall = consoleWarnSpy.mock.calls.find((call) =>
        call[0].includes('initial-render exceeded budget')
      );
      expect(warnCall).toBeDefined();
    });
  });

  describe('measureAsync', () => {
    it('should measure async function execution time', async () => {
      const result = await monitor.measureAsync('test-async', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');

      const stats = monitor.getStats('test-async');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      // Should be at least 5ms (accounting for timer variance)
      expect(stats!.avg).toBeGreaterThanOrEqual(5);
    });

    it('should record time even if async function throws', async () => {
      await expect(
        monitor.measureAsync('test-async-error', async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const stats = monitor.getStats('test-async-error');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      // Just verify it recorded some time (timer variance)
      expect(stats!.avg).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return null for non-existent metric', () => {
      const stats = monitor.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should calculate average, max, min correctly', () => {
      // Record metrics directly for testing
      (monitor as any).recordMetric('test-stats', 10);
      (monitor as any).recordMetric('test-stats', 20);
      (monitor as any).recordMetric('test-stats', 30);

      const stats = monitor.getStats('test-stats');

      expect(stats).toEqual({
        avg: 20,
        max: 30,
        min: 10,
        count: 3,
      });
    });

    it('should handle single metric', () => {
      (monitor as any).recordMetric('single', 15);

      const stats = monitor.getStats('single');

      expect(stats).toEqual({
        avg: 15,
        max: 15,
        min: 15,
        count: 1,
      });
    });
  });

  describe('clear', () => {
    it('should clear specific metric', () => {
      monitor.measure('metric1', () => 1);
      monitor.measure('metric2', () => 2);

      monitor.clear('metric1');

      expect(monitor.getStats('metric1')).toBeNull();
      expect(monitor.getStats('metric2')).toBeDefined();
    });

    it('should clear all metrics when no name provided', () => {
      monitor.measure('metric1', () => 1);
      monitor.measure('metric2', () => 2);
      monitor.measure('metric3', () => 3);

      monitor.clear();

      expect(monitor.getStats('metric1')).toBeNull();
      expect(monitor.getStats('metric2')).toBeNull();
      expect(monitor.getStats('metric3')).toBeNull();
    });
  });

  describe('getAllStats', () => {
    it('should return all recorded stats', () => {
      monitor.measure('op1', () => 1);
      monitor.measure('op2', () => 2);
      monitor.measure('op1', () => 3);

      const allStats = monitor.getAllStats();

      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['op1']).toBeDefined();
      expect(allStats['op2']).toBeDefined();
      expect(allStats['op1'].count).toBe(2);
      expect(allStats['op2'].count).toBe(1);
    });

    it('should return empty object when no metrics', () => {
      const allStats = monitor.getAllStats();
      expect(allStats).toEqual({});
    });
  });

  describe('performance budgets', () => {
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should warn for initial-render exceeding 200ms', () => {
      (monitor as any).recordMetric('initial-render', 250);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('initial-render exceeded budget: 250.00ms > 200ms')
      );
    });

    it('should warn for filter-operation exceeding 100ms', () => {
      (monitor as any).recordMetric('filter-operation', 150);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('filter-operation exceeded budget: 150.00ms > 100ms')
      );
    });

    it('should warn for category-toggle exceeding 50ms', () => {
      (monitor as any).recordMetric('category-toggle', 75);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('category-toggle exceeded budget: 75.00ms > 50ms')
      );
    });

    it('should warn for keyboard-nav exceeding 16ms', () => {
      (monitor as any).recordMetric('keyboard-nav', 20);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('keyboard-nav exceeded budget: 20.00ms > 16ms')
      );
    });

    it('should not warn if within budget', () => {
      (monitor as any).recordMetric('initial-render', 100);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for unknown operations', () => {
      (monitor as any).recordMetric('unknown-op', 1000);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});

describe('checkMemoryUsage', () => {
  it('should return memory usage if available', async () => {
    // Mock performance.memory
    (performance as any).memory = {
      usedJSHeapSize: 50 * 1048576, // 50MB
    };

    const result = await checkMemoryUsage();

    expect(result).toEqual({
      usedMB: 50,
      warning: false,
    });

    // Clean up
    delete (performance as any).memory;
  });

  it('should warn if memory usage exceeds 100MB', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (performance as any).memory = {
      usedJSHeapSize: 150 * 1048576, // 150MB
    };

    const result = await checkMemoryUsage();

    expect(result).toEqual({
      usedMB: 150,
      warning: true,
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory usage high: 150.00MB')
    );

    consoleWarnSpy.mockRestore();
    delete (performance as any).memory;
  });

  it('should return null if memory API not available', async () => {
    // Ensure no memory property
    delete (performance as any).memory;

    const result = await checkMemoryUsage();

    expect(result).toBeNull();
  });
});
