export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        this.recordMetric(name, performance.now() - start);
      }) as T;
    }

    this.recordMetric(name, performance.now() - start);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.recordMetric(name, performance.now() - start);
      return result;
    } catch (error) {
      this.recordMetric(name, performance.now() - start);
      throw error;
    }
  }

  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Warn if exceeds budget
    const budgets: Record<string, number> = {
      'initial-render': 200,
      'filter-operation': 100,
      'category-toggle': 50,
      'keyboard-nav': 16,
    };

    if (budgets[name] && duration > budgets[name]) {
      console.warn(`⚠️ ${name} exceeded budget: ${duration.toFixed(2)}ms > ${budgets[name]}ms`);
    }
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return { avg, max, min, count: values.length };
  }

  clear(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  getAllStats() {
    const stats: Record<string, { avg: number; max: number; min: number; count: number }> = {};
    for (const [name] of this.metrics.entries()) {
      const result = this.getStats(name);
      if (result) {
        stats[name] = result;
      }
    }
    return stats;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Memory monitoring
export async function checkMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1048576;

    if (usedMB > 100) {
      console.warn(`⚠️ Memory usage high: ${usedMB.toFixed(2)}MB`);
      return { usedMB, warning: true };
    }

    return { usedMB, warning: false };
  }
  return null;
}
