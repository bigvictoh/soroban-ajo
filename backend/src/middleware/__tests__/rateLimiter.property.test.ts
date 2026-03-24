import fc from 'fast-check';
import {
  incrementTierCount,
  incrementDdosCount,
  getMetrics,
  resetMetrics,
} from '../rateLimitMetrics';

beforeEach(() => {
  resetMetrics();
});

// Feature: rate-limiting-ddos-protection, Property 18: Metrics counters accurately reflect violation counts
// **Validates: Requirements 8.1, 8.2**
it('Property 18: metrics counters accurately reflect violation counts', () => {
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 20 }),
      fc.integer({ min: 0, max: 100 }),
      (tiers, ddosCount) => {
        resetMetrics();

        // Increment tier counts
        for (const tier of tiers) {
          incrementTierCount(tier);
        }

        // Increment DDoS count
        for (let i = 0; i < ddosCount; i++) {
          incrementDdosCount();
        }

        const snapshot = getMetrics();

        // Verify DDoS count matches exactly
        if (snapshot.ddosBlocksIssued !== ddosCount) return false;

        // Verify each tier count matches the number of times it appeared in the array
        for (const tier of new Set(tiers)) {
          const expected = tiers.filter((t) => t === tier).length;
          const actual = Object.prototype.hasOwnProperty.call(snapshot.rateLimitedRequests, tier)
            ? snapshot.rateLimitedRequests[tier]
            : 0;
          if (actual !== expected) return false;
        }

        return true;
      },
    ),
    { numRuns: 100 },
  );
});
