import type { Finding } from "./types.ts";

/**
 * Prioritizes findings based on urgency score (severity * persistence * confidence * topicWeight).
 * Deterministic tie-breaker:
 * 1. urgencyScore DESC
 * 2. code ASC
 * 3. topicName ASC
 * Returns top 3 to 5 findings.
 */
export function prioritizeFindings(
  findings: Finding[],
  minTop = 3,
  maxTop = 5,
): Finding[] {
  if (!findings || findings.length === 0) {
    return [];
  }

  // Clone and sort deterministically
  const sorted = [...findings].sort((a, b) => {
    // 1. Primary: urgencyScore DESC
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }

    // 2. Secondary tie-breaker: code ASC
    if (a.code !== b.code) {
      return a.code.localeCompare(b.code);
    }

    // 3. Tertiary tie-breaker: topicName ASC
    const aTopic = a.topicName || "";
    const bTopic = b.topicName || "";
    return aTopic.localeCompare(bTopic);
  });

  // Limit to maxTop (default 5), ensuring at least minTop (if available)
  return sorted.slice(0, maxTop);
}
