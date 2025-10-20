import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThrottle } from '../useThrottle';

describe('useThrottle', () => {
  it('returns a function', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    expect(typeof result.current).toBe('function');
  });

  it('executes callback eventually', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 50));

    // Wait a bit to ensure delay has passed since hook initialization
    await new Promise((resolve) => setTimeout(resolve, 60));

    result.current('test');

    // Should execute immediately or schedule
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(callback).toHaveBeenCalledWith('test');
  });

  it('executes callback with correct arguments', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 50));

    // Wait to ensure delay has passed
    await new Promise((resolve) => setTimeout(resolve, 60));

    result.current('arg1', 'arg2');

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('creates new throttled function when callback changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }) => useThrottle(cb, 100),
      { initialProps: { cb: callback1 } }
    );

    const firstFunction = result.current;

    rerender({ cb: callback2 });

    // Should create a new function
    expect(result.current).not.toBe(firstFunction);
  });

  it('schedules callback when called within throttle window', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // Wait for initial delay to pass so first call executes immediately
    await new Promise((resolve) => setTimeout(resolve, 110));

    // First call - executes immediately
    result.current('call1');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('call1');

    // Second call within window - should be scheduled
    result.current('call2');
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, second call is scheduled

    // Wait for scheduled callback to execute
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('call2');
  });

  it('cancels previous timeout when multiple calls within window', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // Wait for initial delay to pass
    await new Promise((resolve) => setTimeout(resolve, 110));

    // First call - executes immediately
    result.current('call1');
    expect(callback).toHaveBeenCalledTimes(1);

    // Multiple rapid calls within window
    result.current('call2');
    await new Promise((resolve) => setTimeout(resolve, 20));
    result.current('call3');
    await new Promise((resolve) => setTimeout(resolve, 20));
    result.current('call4'); // This should cancel previous scheduled calls

    // Still only 1 call (the immediate one)
    expect(callback).toHaveBeenCalledTimes(1);

    // Wait for the final scheduled callback
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('call4'); // Only the last call executes
  });

  it('respects throttle delay for scheduled execution', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // Wait for initial delay to pass
    await new Promise((resolve) => setTimeout(resolve, 110));

    // First call at t=0
    result.current('immediate');
    expect(callback).toHaveBeenCalledTimes(1);

    // Second call at t=50ms (within window)
    await new Promise((resolve) => setTimeout(resolve, 50));
    result.current('scheduled');
    expect(callback).toHaveBeenCalledTimes(1); // Still 1

    // Wait for remaining delay (100 - 50 = 50ms + buffer)
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('scheduled');
  });

  it('allows immediate execution after scheduled callback completes', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    // Wait for initial delay to pass
    await new Promise((resolve) => setTimeout(resolve, 110));

    // First call - immediate
    result.current('call1');
    expect(callback).toHaveBeenCalledTimes(1);

    // Second call - scheduled
    result.current('call2');
    expect(callback).toHaveBeenCalledTimes(1);

    // Wait for scheduled callback
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(callback).toHaveBeenCalledTimes(2);

    // Wait for full delay to pass
    await new Promise((resolve) => setTimeout(resolve, 110));

    // Next call should execute immediately
    result.current('call3');
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith('call3');
  });
});
