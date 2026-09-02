import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../../src/libs/throttle';

describe('createRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('admits up to the limit immediately', async () => {
    const limit = createRateLimiter(5, 1000);
    const started: number[] = [];

    const work = Array.from({ length: 5 }, (_, i) =>
      limit(async () => { started.push(i); return i; }));

    await vi.advanceTimersByTimeAsync(0);
    expect(started).toHaveLength(5);
    await Promise.all(work);
  });

  it('holds the sixth call back until the window rolls over', async () => {
    // A grid page resolves up to 24 images in one Promise.all. Without this,
    // the first page load exceeds Ticketmaster's documented 5 per second.
    const limit = createRateLimiter(5, 1000);
    const started: number[] = [];

    const work = Array.from({ length: 8 }, (_, i) =>
      limit(async () => { started.push(i); return i; }));

    await vi.advanceTimersByTimeAsync(0);
    expect(started).toHaveLength(5);

    await vi.advanceTimersByTimeAsync(1000);
    expect(started).toHaveLength(8);

    expect(await Promise.all(work)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns each task its own resolved value', async () => {
    const limit = createRateLimiter(2, 1000);
    const work = [limit(async () => 'a'), limit(async () => 'b')];
    await vi.advanceTimersByTimeAsync(0);
    expect(await Promise.all(work)).toEqual(['a', 'b']);
  });

  it('propagates a rejection without stalling the queue', async () => {
    // A failing lookup must not hold a slot forever, or one bad name would
    // wedge every image on the site.
    const limit = createRateLimiter(1, 1000);
    const failing = limit(async () => { throw new Error('boom'); });
    const following = limit(async () => 'after');

    await vi.advanceTimersByTimeAsync(0);
    await expect(failing).rejects.toThrow('boom');

    await vi.advanceTimersByTimeAsync(1000);
    expect(await following).toBe('after');
  });
});
