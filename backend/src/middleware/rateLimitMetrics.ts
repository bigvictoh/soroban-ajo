export interface RateLimitMetrics {
  rateLimitedRequests: Record<string, number>; // keyed by tier name
  ddosBlocksIssued: number;
}

export const metrics: RateLimitMetrics = {
  rateLimitedRequests: {},
  ddosBlocksIssued: 0,
};

export function incrementTierCount(tier: string): void {
  const current = Object.prototype.hasOwnProperty.call(metrics.rateLimitedRequests, tier)
    ? metrics.rateLimitedRequests[tier]
    : 0;
  metrics.rateLimitedRequests[tier] = current + 1;
}

export function incrementDdosCount(): void {
  metrics.ddosBlocksIssued += 1;
}

export function getMetrics(): RateLimitMetrics {
  return {
    rateLimitedRequests: { ...metrics.rateLimitedRequests },
    ddosBlocksIssued: metrics.ddosBlocksIssued,
  };
}

export function resetMetrics(): void {
  metrics.rateLimitedRequests = {};
  metrics.ddosBlocksIssued = 0;
}
