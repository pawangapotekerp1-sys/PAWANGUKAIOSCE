import type { Finding } from "./types.ts";

/**
 * Prioritizes findings based on urgency score (severity * persistence * confidence * topicWeight).
 * Deterministic tie-breaker:
 * 1. urgencyScore DESC
 * 2. code ASC
 * 3. topicId ASC (bukan topicName)
 * 4. id ASC (jaminan kestabilan mutlak)
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

    // 3. Tertiary tie-breaker: topicId ASC (WAJIB topicId bukan topicName)
    const aTopicId = a.topicId || "";
    const bTopicId = b.topicId || "";
    if (aTopicId !== bTopicId) {
      return aTopicId.localeCompare(bTopicId);
    }

    // 4. Final tie-breaker: id ASC
    return a.id.localeCompare(b.id);
  });

  return sorted.slice(0, maxTop);
}
