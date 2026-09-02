/**
 * A fixed-window rate limiter for outbound calls.
 *
 * Ticketmaster's Discovery API documents 5 requests per second. Our own code
 * is what breaches it: `getEventImages` resolves a whole grid in a single
 * `Promise.all`, so one page load asks for up to 24 images at once.
 *
 * The parallelism is deliberate and worth keeping — resolving a grid serially
 * would let one slow lookup hold up every card behind it. So the throttle goes
 * on the outbound calls rather than on the page: tasks are admitted up to the
 * limit, and the rest wait for the window to roll over.
 *
 * A fixed window rather than a token bucket because the limit being respected
 * is itself expressed as a fixed window, and matching it exactly is easier to
 * reason about than approximating it more smoothly.
 * @param limit - How many tasks may start within one window.
 * @param windowMs - The window length in milliseconds.
 * @returns A function that runs a task, waiting first if the window is full.
 */
export function createRateLimiter(
  limit: number,
  windowMs: number,
): <T>(task: () => Promise<T>) => Promise<T> {
  let windowStart = 0;
  let usedInWindow = 0;

  /** Resolves once a slot in the current or a future window is free. */
  async function claimSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();

      if (now - windowStart >= windowMs) {
        windowStart = now;
        usedInWindow = 0;
      }

      if (usedInWindow < limit) {
        usedInWindow += 1;
        return;
      }

      const waitMs = windowMs - (now - windowStart);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    await claimSlot();
    // No try/finally releasing the slot: a fixed window counts starts, not
    // completions, and a rejected task has already consumed its request. Adding
    // a release here would let a burst of failures exceed the limit.
    return task();
  };
}
