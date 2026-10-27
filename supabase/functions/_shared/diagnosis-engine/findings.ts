import { getEffectiveRaguStatus } from "./classify.ts";
import type { DiagnosisConfig } from "./config.ts";
import { DIAGNOSIS_CONFIG } from "./config.ts";
import { buildRecommendationDraft, formatQuestionSummary } from "./recommend.ts";
import type { EvidenceRow, Finding } from "./types.ts";

interface TopicAccumulator {
  topicId: string;
  topicName: string;
  totalQuestions: number;
  correctQuestions: number;
  attempts: Set<string>;
  attemptOrderMap: Map<string, { submittedAt: string; total: number; correct: number }>;
  confidentErrors: number;
  hasFallbackConfidence: boolean;
  doubtfulTotal: number;
  doubtfulCorrect: number;
  confidentTotal: number;
  confidentCorrect: number;
}

interface QuestionDistractorAccumulator {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  wrongOptionAttempts: Map<string, Set<string>>;
}

/**
 * Deterministically detects the 8 cognitive/behavioral patterns from evidence rows.
 * Enforces strict sample gates, question-level distractor tracking, and handles nullable telemetry safely.
 */
export function detectFindings(
  rows: EvidenceRow[],
  config: DiagnosisConfig = DIAGNOSIS_CONFIG,
): Finding[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const findings: Finding[] = [];

  // 1. Group data by question_id for RECURRING_DISTRACTOR
  const questionMap = new Map<string, QuestionDistractorAccumulator>();

  // 2. Group data by topic
  const topicMap = new Map<string, TopicAccumulator>();

  for (const row of rows) {
    const topicKey = row.topic_id || row.topic_name || "unknown";
    let acc = topicMap.get(topicKey);
    if (!acc) {
      acc = {
        topicId: row.topic_id || topicKey,
        topicName: row.topic_name || "Tanpa Topik",
        totalQuestions: 0,
        correctQuestions: 0,
        attempts: new Set<string>(),
        attemptOrderMap: new Map(),
        confidentErrors: 0,
        hasFallbackConfidence: false,
        doubtfulTotal: 0,
        doubtfulCorrect: 0,
        confidentTotal: 0,
        confidentCorrect: 0,
      };
      topicMap.set(topicKey, acc);
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

    const { isDoubtful, isConfident } = getEffectiveRaguStatus(row);
    if (row.was_ever_flagged_ragu === null && row.flagged_ragu_at_submit !== null && row.flagged_ragu_at_submit !== undefined) {
      acc.hasFallbackConfidence = true;
    }

    if (row.is_correct) {
      acc.correctQuestions += 1;
      attStat.correct += 1;
      if (isDoubtful) {
        acc.doubtfulCorrect += 1;
      }
      if (isConfident) {
        acc.confidentCorrect += 1;
      }
    } else {
      // Confident errors tracking
      if (isConfident) {
        acc.confidentErrors += 1;
      }

      // Question-level distractor tracking for RECURRING_DISTRACTOR
      if (row.selected_option_key) {
        let qAcc = questionMap.get(row.question_id);
        if (!qAcc) {
          qAcc = {
            questionId: row.question_id,
            questionText: row.question_text || "",
            topicId: row.topic_id || topicKey,
            topicName: row.topic_name || "Tanpa Topik",
            wrongOptionAttempts: new Map(),
          };
          questionMap.set(row.question_id, qAcc);
        }
        let attSet = qAcc.wrongOptionAttempts.get(row.selected_option_key);
        if (!attSet) {
          attSet = new Set();
          qAcc.wrongOptionAttempts.set(row.selected_option_key, attSet);
        }
        attSet.add(row.attempt_id);
      }
    }

    if (isDoubtful) {
      acc.doubtfulTotal += 1;
    }
    if (isConfident) {
      acc.confidentTotal += 1;
    }
  }

  // --- A. RECURRING_DISTRACTOR (Question-Level Detector) ---
  // Pengecoh yang sama dipilih pada butir soal yang sama (question_id) di >= 2 attempt berbeda
  for (const qAcc of questionMap.values()) {
    for (const [optionKey, attemptSet] of qAcc.wrongOptionAttempts.entries()) {
      if (attemptSet.size >= config.sampleThresholds.recurringDistractorMinAttempts) {
        const questionSummary = formatQuestionSummary(qAcc.questionText, qAcc.questionId);
        const count = attemptSet.size;
        const rec = buildRecommendationDraft("RECURRING_DISTRACTOR", {
          topicName: qAcc.topicName,
          optionKey,
          count,
          questionSummary,
        });

        findings.push({
          id: `FND_RECURRING_DISTRACTOR_${qAcc.questionId}_${optionKey}`,
          code: "RECURRING_DISTRACTOR",
          title: `Pengecoh Berulang pada Opsi ${optionKey}`,
          topicId: qAcc.topicId,
          topicName: qAcc.topicName,
          severity: 3,
          persistence: Math.min(count, 5),
          confidence: 4,
          topicWeight: 1.0,
          urgencyScore: 3 * Math.min(count, 5) * 4 * 1.0,
          evidenceSummary: `Opsi salah '${optionKey}' dipilih ${count} kali di sesi try out berbeda pada butir '${questionSummary}'.`,
          recommendationTemplateId: rec.templateId,
          recommendationTemplateStatus: rec.status,
          recommendationDraft: rec.draftText,
          metadata: { questionId: qAcc.questionId, optionKey, count, questionSummary },
        });
      }
    }
  }

  // --- TOPIC-LEVEL DETECTORS ---

  for (const acc of topicMap.values()) {
    const accuracy = acc.totalQuestions > 0 ? (acc.correctQuestions / acc.totalQuestions) * 100 : 0;

    // B. CONFIDENT_ERRORS_TOPIC: >= confidentErrorsTopicMinCount (3) wrong answers without ragu
    if (acc.confidentErrors >= config.behaviorThresholds.confidentErrorsTopicMinCount) {
      const rec = buildRecommendationDraft("CONFIDENT_ERRORS_TOPIC", {
        topicName: acc.topicName,
        count: acc.confidentErrors,
      });
      const confidence = acc.hasFallbackConfidence ? 3 : 4;
      findings.push({
        id: `FND_CONFIDENT_ERRORS_${acc.topicId}`,
        code: "CONFIDENT_ERRORS_TOPIC",
        title: `Kesalahan Tanpa Ragu di ${acc.topicName}`,
        topicId: acc.topicId,
        topicName: acc.topicName,
        severity: 4,
        persistence: Math.min(acc.confidentErrors, 5),
        confidence,
        topicWeight: 1.0,
        urgencyScore: 4 * Math.min(acc.confidentErrors, 5) * confidence * 1.0,
        evidenceSummary: `Ditemukan ${acc.confidentErrors} kesalahan yang dijawab dengan rasa yakin (tanpa tanda ragu).`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: { confidentErrors: acc.confidentErrors },
      });
    }

    // C. PERSISTENT_WEAKNESS:
    // Mengikuti ambang sampel topik (>= 10 soal indikatif, >= 20 soal utama), bukan 4 soal.
    // Akurasi < 60% yang bertahan di >= 2 sesi try out.
    if (
      acc.totalQuestions >= config.sampleThresholds.subtopicIndicativeMin &&
      acc.attempts.size >= 2 &&
      accuracy < config.behaviorThresholds.persistentWeaknessMaxAccuracy
    ) {
      const sampleStatus =
        acc.totalQuestions >= config.sampleThresholds.subtopicPrimaryMin
          ? "sampel utama"
          : "sampel indikatif";

      // Periksa apakah berurutan (consecutive)
      const sortedAttempts = Array.from(acc.attemptOrderMap.values()).sort(
        (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
      );
      const isConsecutive =
        sortedAttempts.length >= 2 &&
        sortedAttempts.every((a) => a.total > 0 && (a.correct / a.total) * 100 < config.behaviorThresholds.persistentWeaknessMaxAccuracy);

      const rec = buildRecommendationDraft("PERSISTENT_WEAKNESS", {
        topicName: acc.topicName,
        accuracy: Math.round(accuracy),
        attemptCount: acc.attempts.size,
        sampleStatus,
        isConsecutive,
      });

      findings.push({
        id: `FND_PERSISTENT_WEAKNESS_${acc.topicId}`,
        code: "PERSISTENT_WEAKNESS",
        title: `Kelemahan Persisten di ${acc.topicName}`,
        topicId: acc.topicId,
        topicName: acc.topicName,
        severity: 4,
        persistence: Math.min(acc.attempts.size + 1, 5),
        confidence: acc.totalQuestions >= config.sampleThresholds.subtopicPrimaryMin ? 5 : 4,
        topicWeight: 1.2,
        urgencyScore: 4 * Math.min(acc.attempts.size + 1, 5) * (acc.totalQuestions >= config.sampleThresholds.subtopicPrimaryMin ? 5 : 4) * 1.2,
        evidenceSummary: `Akurasi bertahan rendah (${Math.round(accuracy)}%, ${sampleStatus}) di ${acc.attempts.size} sesi try out${isConsecutive ? " berurutan" : ""}.`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: {
          accuracy: Math.round(accuracy),
          attemptCount: acc.attempts.size,
          sampleStatus,
          isConsecutive,
        },
      });
    }

    // D. FRAGILE_KNOWLEDGE:
    // Pemicu baru: proporsi jawaban BENAR yang ditandai ragu pada topik >= 30% dengan sampel topik >= 10 soal
    if (
      acc.totalQuestions >= config.sampleThresholds.fragileKnowledgeMinQuestions &&
      acc.correctQuestions > 0
    ) {
      const doubtfulCorrectRatio = acc.doubtfulCorrect / acc.correctQuestions;
      if (doubtfulCorrectRatio >= config.behaviorThresholds.fragileKnowledgeDoubtfulCorrectRatio) {
        const doubtfulPercent = Math.round(doubtfulCorrectRatio * 100);
        const rec = buildRecommendationDraft("FRAGILE_KNOWLEDGE", {
          topicName: acc.topicName,
          doubtfulRatio: doubtfulPercent,
        });

        findings.push({
          id: `FND_FRAGILE_KNOWLEDGE_${acc.topicId}`,
          code: "FRAGILE_KNOWLEDGE",
          title: `Pemahaman Rentan Ragu di ${acc.topicName}`,
          topicId: acc.topicId,
          topicName: acc.topicName,
          severity: 3,
          persistence: 3,
          confidence: acc.hasFallbackConfidence ? 3 : 4,
          topicWeight: 1.0,
          urgencyScore: 3 * 3 * (acc.hasFallbackConfidence ? 3 : 4) * 1.0,
          evidenceSummary: `${doubtfulPercent}% jawaban benar pada topik ini ditandai ragu-ragu (${acc.doubtfulCorrect} dari ${acc.correctQuestions} butir benar).`,
          recommendationTemplateId: rec.templateId,
          recommendationTemplateStatus: rec.status,
          recommendationDraft: rec.draftText,
          metadata: {
            doubtfulRatio: doubtfulPercent,
            doubtfulCorrect: acc.doubtfulCorrect,
            correctQuestions: acc.correctQuestions,
          },
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

  // F. RUSHED_WRONG: Proporsi butir salah-cepat terhadap total jawaban >= 5%
  const rushedErrors = rows.filter(
    (r) =>
      !r.is_correct &&
      r.time_spent_z_score !== null &&
      r.time_spent_z_score < config.behaviorThresholds.rushedZScore,
  );
  const rushedRatio = rushedErrors.length / totalGlobalQuestions;

  if (rushedRatio >= config.behaviorThresholds.rushedWrongMinRatio) {
    const ratioPercent = Math.round(rushedRatio * 100);
    const rec = buildRecommendationDraft("RUSHED_WRONG", {
      count: rushedErrors.length,
      ratio: ratioPercent,
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
      evidenceSummary: `Ditemukan ${rushedErrors.length} butir salah (${ratioPercent}% dari total soal) yang dijawab dengan kecepatan abnormal (z < -0.8).`,
      recommendationTemplateId: rec.templateId,
      recommendationTemplateStatus: rec.status,
      recommendationDraft: rec.draftText,
      metadata: { count: rushedErrors.length, ratio: ratioPercent },
    });
  }

  // G. LATE_SESSION_DROP: Penurunan akurasi kuartil akhir sesi (posisi >= 0.75) merosot >= 20 poin persentase
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

    const dropPoints = earlyMidAcc - lateAcc;
    if (dropPoints >= config.behaviorThresholds.lateSessionDropThresholdPoints) {
      const rec = buildRecommendationDraft("LATE_SESSION_DROP", {
        dropPercentage: Math.round(dropPoints),
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
        evidenceSummary: `Akurasi anjlok ${Math.round(dropPoints)} poin persentase pada kuartil akhir sesi ujian (dari ${Math.round(earlyMidAcc)}% menjadi ${Math.round(lateAcc)}%).`,
        recommendationTemplateId: rec.templateId,
        recommendationTemplateStatus: rec.status,
        recommendationDraft: rec.draftText,
        metadata: {
          dropPercentage: Math.round(dropPoints),
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
