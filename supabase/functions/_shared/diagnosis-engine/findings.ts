import type { DiagnosisConfig } from "./config.ts";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import { buildRecommendationDraft } from "./recommend.ts";
import type { EvidenceRow, Finding } from "./types.ts";

interface TopicAccumulator {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctQuestions: number;
  attempts: Set<string>;
  attemptOrderMap: Map<string, { submittedAt: string; total: number; correct: number }>;
  wrongAnswersByOption: Map<string, number>;
  wrongOptionAttempts: Map<string, Set<string>>;
  confidentErrors: number;
  doubtfulTotal: number;
  doubtfulCorrect: number;
  confidentTotal: number;
  confidentCorrect: number;
}

/**
 * Deterministically detects the 8 cognitive/behavioral patterns from evidence rows.
 * Enforces strict sample gates and handles nullable telemetry safely.
 */
export function detectFindings(
  rows: EvidenceRow[],
  config: DiagnosisConfig = DIAGNOSIS_CONFIG,
): Finding[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const findings: Finding[] = [];

  // 1. Group data by topic
  const topicMap = new Map<string, TopicAccumulator>();

  for (const row of rows) {
    const key = row.topic_id || row.topic_name || "unknown";
    let acc = topicMap.get(key);
    if (!acc) {
      acc = {
        topicId: row.topic_id || key,
        topicName: row.topic_name || "Tanpa Topik",
        totalQuestions: 0,
        correctQuestions: 0,
        attempts: new Set<string>(),
        attemptOrderMap: new Map(),
        wrongAnswersByOption: new Map(),
        wrongOptionAttempts: new Map(),
        confidentErrors: 0,
        doubtfulTotal: 0,
        doubtfulCorrect: 0,
        confidentTotal: 0,
        confidentCorrect: 0,
      };
      topicMap.set(key, acc);
    }

    acc.totalQuestions += 1;
    acc.attempts.add(row.attempt_id);

    // Track attempt-level stats for chronological trend
    let attStat = acc.attemptOrderMap.get(row.attempt_id);
    if (!attStat) {
      attStat = { submittedAt: row.submitted_at, total: 0, correct: 0 };
      acc.attemptOrderMap.set(row.attempt_id, attStat);
    }
    attStat.total += 1;

    if (row.is_correct) {
      acc.correctQuestions += 1;
      attStat.correct += 1;
    } else {
      // Wrong answers tracking
      if (row.selected_option_key) {
        const count = acc.wrongAnswersByOption.get(row.selected_option_key) || 0;
        acc.wrongAnswersByOption.set(row.selected_option_key, count + 1);

        let optAttempts = acc.wrongOptionAttempts.get(row.selected_option_key);
        if (!optAttempts) {
          optAttempts = new Set();
          acc.wrongOptionAttempts.set(row.selected_option_key, optAttempts);
        }
        optAttempts.add(row.attempt_id);
      }

      // Confident errors strictly require was_ever_flagged_ragu === false (not null)
      if (row.was_ever_flagged_ragu === false) {
        acc.confidentErrors += 1;
      }
    }

    // Doubtful vs Confident tracking (skip if was_ever_flagged_ragu is null)
    if (row.was_ever_flagged_ragu === true) {
      acc.doubtfulTotal += 1;
      if (row.is_correct) acc.doubtfulCorrect += 1;
    } else if (row.was_ever_flagged_ragu === false) {
      acc.confidentTotal += 1;
      if (row.is_correct) acc.confidentCorrect += 1;
    }
  }

  // --- TOPIC-LEVEL DETECTORS ---

  for (const acc of topicMap.values()) {
    const accuracy = acc.totalQuestions > 0 ? (acc.correctQuestions / acc.totalQuestions) * 100 : 0;

    // A. RECURRING_DISTRACTOR: Same wrong option chosen >= recurringDistractorMinCount (3)
    // across >= recurringDistractorMinTryouts (2) distinct tryouts
    for (const [optionKey, count] of acc.wrongAnswersByOption.entries()) {
      const distinctTryouts = acc.wrongOptionAttempts.get(optionKey)?.size || 0;
      if (
        count >= config.sampleThresholds.recurringDistractorMinCount &&
        distinctTryouts >= config.sampleThresholds.recurringDistractorMinTryouts
      ) {
        const rec = buildRecommendationDraft("RECURRING_DISTRACTOR", {
          topicName: acc.topicName,
          optionKey,
          count,
        });
        findings.push({
          id: `FND_RECURRING_DISTRACTOR_${acc.topicId}_${optionKey}`,
          code: "RECURRING_DISTRACTOR",
          title: `Pengecoh Berulang pada Opsi ${optionKey}`,
          topicId: acc.topicId,
          topicName: acc.topicName,
          severity: 3,
          persistence: Math.min(count, 5),
          confidence: 4,
          topicWeight: 1.0,
          urgencyScore: 3 * Math.min(count, 5) * 4 * 1.0,
          evidenceSummary: `Opsi salah '${optionKey}' dipilih ${count} kali di ${distinctTryouts} sesi try out berbeda pada topik ${acc.topicName}.`,
          recommendationTemplateId: rec.templateId,
          recommendationTemplateStatus: rec.status,
          recommendationDraft: rec.draftText,
          metadata: { optionKey, count, distinctTryouts },
        });
      }
    }

    // B. CONFIDENT_ERRORS_TOPIC: >= confidentErrorsTopicMinCount (3) wrong answers without ragu
    if (acc.confidentErrors >= config.behaviorThresholds.confidentErrorsTopicMinCount) {
      const rec = buildRecommendationDraft("CONFIDENT_ERRORS_TOPIC", {
        topicName: acc.topicName,
        count: acc.confidentErrors,
      });
      findings.push({
        id: `FND_CONFIDENT_ERRORS_${acc.topicId}`,
        code: "CONFIDENT_ERRORS_TOPIC",
        title: `Kesalahan Tanpa Ragu di ${acc.topicName}`,
        topicId: acc.topicId,
        topicName: acc.topicName,
        severity: 4,
        persistence: Math.min(acc.confidentErrors, 5),
        confidence: 4,
        topicWeight: 1.0,
        urgencyScore: 4 * Math.min(acc.confidentErrors, 5) * 4 * 1.0,
        evidenceSummary: `Ditemukan ${acc.confidentErrors} kesalahan yang dijawab dengan rasa yakin (tanpa tanda ragu).`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: { confidentErrors: acc.confidentErrors },
      });
    }

    // C. PERSISTENT_WEAKNESS: Accuracy < persistentWeaknessMaxAccuracy (60%) across >= 2 attempts with >= 4 questions
    if (
      acc.attempts.size >= 2 &&
      acc.totalQuestions >= 4 &&
      accuracy < config.behaviorThresholds.persistentWeaknessMaxAccuracy
    ) {
      const rec = buildRecommendationDraft("PERSISTENT_WEAKNESS", {
        topicName: acc.topicName,
        accuracy: Math.round(accuracy),
        attemptCount: acc.attempts.size,
      });
      findings.push({
        id: `FND_PERSISTENT_WEAKNESS_${acc.topicId}`,
        code: "PERSISTENT_WEAKNESS",
        title: `Kelemahan Persisten di ${acc.topicName}`,
        topicId: acc.topicId,
        topicName: acc.topicName,
        severity: 4,
        persistence: Math.min(acc.attempts.size + 1, 5),
        confidence: 4,
        topicWeight: 1.2,
        urgencyScore: 4 * Math.min(acc.attempts.size + 1, 5) * 4 * 1.2,
        evidenceSummary: `Akurasi bertahan rendah (${Math.round(accuracy)}%) di ${acc.attempts.size} sesi try out.`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: { accuracy: Math.round(accuracy), attemptCount: acc.attempts.size },
      });
    }

    // D. FRAGILE_KNOWLEDGE: Confident accuracy >= 70% but doubtful accuracy <= 40%
    if (acc.confidentTotal >= 2 && acc.doubtfulTotal >= 2) {
      const confAcc = (acc.confidentCorrect / acc.confidentTotal) * 100;
      const doubtAcc = (acc.doubtfulCorrect / acc.doubtfulTotal) * 100;
      if (
        confAcc >= config.behaviorThresholds.fragileKnowledgeConfMinAcc &&
        doubtAcc <= config.behaviorThresholds.fragileKnowledgeDoubtMaxAcc
      ) {
        const rec = buildRecommendationDraft("FRAGILE_KNOWLEDGE", {
          topicName: acc.topicName,
          confidentAccuracy: Math.round(confAcc),
          doubtfulAccuracy: Math.round(doubtAcc),
        });
        findings.push({
          id: `FND_FRAGILE_KNOWLEDGE_${acc.topicId}`,
          code: "FRAGILE_KNOWLEDGE",
          title: `Pemahaman Rentan Ragu di ${acc.topicName}`,
          topicId: acc.topicId,
          topicName: acc.topicName,
          severity: 3,
          persistence: 3,
          confidence: 4,
          topicWeight: 1.0,
          urgencyScore: 3 * 3 * 4 * 1.0,
          evidenceSummary: `Akurasi mencapai ${Math.round(confAcc)}% saat yakin, namun anjlok ke ${Math.round(doubtAcc)}% saat ragu.`,
          recommendationTemplateId: rec.templateId,
          recommendationTemplateStatus: rec.status,
          recommendationDraft: rec.draftText,
          metadata: { confidentAccuracy: Math.round(confAcc), doubtfulAccuracy: Math.round(doubtAcc) },
        });
      }
    }

    // E. IMPROVING: Accuracy steadily increases across chronological attempts
    // Requires >= trendMinQuestionsPerPeriod (10) questions per period
    if (acc.attemptOrderMap.size >= 2) {
      const sortedAttempts = Array.from(acc.attemptOrderMap.values()).sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      );
      const midpoint = Math.floor(sortedAttempts.length / 2);
      const earlyAttempts = sortedAttempts.slice(0, midpoint);
      const lateAttempts = sortedAttempts.slice(midpoint);

      const earlyTotal = earlyAttempts.reduce((s, a) => s + a.total, 0);
      const earlyCorrect = earlyAttempts.reduce((s, a) => s + a.correct, 0);
      const lateTotal = lateAttempts.reduce((s, a) => s + a.total, 0);
      const lateCorrect = lateAttempts.reduce((s, a) => s + a.correct, 0);

      if (
        earlyTotal >= config.sampleThresholds.trendMinQuestionsPerPeriod &&
        lateTotal >= config.sampleThresholds.trendMinQuestionsPerPeriod
      ) {
        const earlyAcc = (earlyCorrect / earlyTotal) * 100;
        const lateAcc = (lateCorrect / lateTotal) * 100;

        if (lateAcc >= earlyAcc + 15 && lateAcc >= 50) {
          const rec = buildRecommendationDraft("IMPROVING", {
            topicName: acc.topicName,
            initialAccuracy: Math.round(earlyAcc),
            latestAccuracy: Math.round(lateAcc),
          });
          findings.push({
            id: `FND_IMPROVING_${acc.topicId}`,
            code: "IMPROVING",
            title: `Tren Peningkatan pada ${acc.topicName}`,
            topicId: acc.topicId,
            topicName: acc.topicName,
            severity: 1,
            persistence: 3,
            confidence: 4,
            topicWeight: 0.8,
            urgencyScore: 1 * 3 * 4 * 0.8,
            evidenceSummary: `Akurasi meningkat dari ${Math.round(earlyAcc)}% menjadi ${Math.round(lateAcc)}% di sesi-sesi terakhir.`,
            recommendationTemplateId: rec.templateId,
            recommendationTemplateStatus: rec.status,
            recommendationDraft: rec.draftText,
            metadata: { initialAccuracy: Math.round(earlyAcc), latestAccuracy: Math.round(lateAcc) },
          });
        }
      }
    }
  }

  // --- GLOBAL BEHAVIORAL DETECTORS ---
  // Mandatory sample gate: requires >= globalBehaviorMinQuestions (100) global questions
  const totalGlobalQuestions = rows.length;
  if (totalGlobalQuestions < config.sampleThresholds.globalBehaviorMinQuestions) {
    return findings;
  }

  // F. RUSHED_WRONG: >= 3 questions answered wrong with z-score < -0.8
  const rushedErrors = rows.filter(
    (r) =>
      !r.is_correct &&
      r.time_spent_z_score !== null &&
      r.time_spent_z_score < config.behaviorThresholds.rushedZScore,
  );
  if (rushedErrors.length >= 3) {
    const rec = buildRecommendationDraft("RUSHED_WRONG", {
      count: rushedErrors.length,
    });
    findings.push({
      id: "FND_RUSHED_WRONG_GLOBAL",
      code: "RUSHED_WRONG",
      title: "Pengerjaan Terburu-buru pada Soal Salah",
      severity: 3,
      persistence: Math.min(rushedErrors.length, 5),
      confidence: 4,
      topicWeight: 1.0,
      urgencyScore: 3 * Math.min(rushedErrors.length, 5) * 4 * 1.0,
      evidenceSummary: `Ditemukan ${rushedErrors.length} butir salah yang dijawab dengan kecepatan abnormal (z-score < -0.8).`,
      recommendationTemplateId: rec.templateId,
      recommendationTemplateStatus: rec.status,
      recommendationDraft: rec.draftText,
      metadata: { count: rushedErrors.length },
    });
  }

  // G. LATE_SESSION_DROP: Accuracy drops significantly in the last quartile (position >= 0.75)
  const rowsWithPosition = rows.filter((r) => r.session_position_ratio !== null);
  const earlyMidRows = rowsWithPosition.filter(
    (r) => r.session_position_ratio! < config.behaviorThresholds.lateSessionDropRatio,
  );
  const lateRows = rowsWithPosition.filter(
    (r) => r.session_position_ratio! >= config.behaviorThresholds.lateSessionDropRatio,
  );

  if (earlyMidRows.length >= 10 && lateRows.length >= 4) {
    const earlyMidAcc =
      (earlyMidRows.filter((r) => r.is_correct).length / earlyMidRows.length) * 100;
    const lateAcc =
      (lateRows.filter((r) => r.is_correct).length / lateRows.length) * 100;

    const drop = earlyMidAcc - lateAcc;
    if (drop >= config.behaviorThresholds.lateSessionDropMinPercentage) {
      const rec = buildRecommendationDraft("LATE_SESSION_DROP", {
        dropPercentage: Math.round(drop),
      });
      findings.push({
        id: "FND_LATE_SESSION_DROP_GLOBAL",
        code: "LATE_SESSION_DROP",
        title: "Penurunan Konsentrasi Akhir Sesi",
        severity: 4,
        persistence: 3,
        confidence: 4,
        topicWeight: 1.1,
        urgencyScore: 4 * 3 * 4 * 1.1,
        evidenceSummary: `Akurasi anjlok ${Math.round(drop)}% pada kuartil akhir sesi ujian (dari ${Math.round(earlyMidAcc)}% menjadi ${Math.round(lateAcc)}%).`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: {
          dropPercentage: Math.round(drop),
          earlyMidAcc: Math.round(earlyMidAcc),
          lateAcc: Math.round(lateAcc),
        },
      });
    }
  }

  // H. NET_ANSWER_CHANGE: Changed correct to wrong > changed wrong to correct
  const totalCtoW = rows.reduce(
    (s, r) => s + (r.changed_correct_to_wrong_count !== null ? r.changed_correct_to_wrong_count : 0),
    0,
  );
  const totalWtoC = rows.reduce(
    (s, r) => s + (r.changed_wrong_to_correct_count !== null ? r.changed_wrong_to_correct_count : 0),
    0,
  );

  if (totalCtoW > totalWtoC && totalCtoW >= 2) {
    const rec = buildRecommendationDraft("NET_ANSWER_CHANGE", {
      changedCorrectToWrong: totalCtoW,
      changedWrongToCorrect: totalWtoC,
    });
    findings.push({
      id: "FND_NET_ANSWER_CHANGE_GLOBAL",
      code: "NET_ANSWER_CHANGE",
      title: "Perubahan Jawaban Berdampak Negatif",
      severity: 3,
      persistence: Math.min(totalCtoW, 5),
      confidence: 4,
      topicWeight: 1.0,
      urgencyScore: 3 * Math.min(totalCtoW, 5) * 4 * 1.0,
      evidenceSummary: `Pengubahan jawaban dari benar ke salah (${totalCtoW}x) melampaui pengubahan dari salah ke benar (${totalWtoC}x).`,
      recommendationTemplateId: rec.templateId,
      recommendationTemplateStatus: rec.status,
      recommendationDraft: rec.draftText,
      metadata: { changedCorrectToWrong: totalCtoW, changedWrongToCorrect: totalWtoC },
    });
  }

  return findings;
}
