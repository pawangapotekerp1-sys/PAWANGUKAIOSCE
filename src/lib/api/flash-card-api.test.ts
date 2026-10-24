import { describe, expect, test, vi } from "vitest";
import {
  auditRepairFlashCardMaterial,
  createFlashCardMaterialDraft,
  deleteFlashCardGeneratorCredential,
  getFlashCardGeneratorStatus,
  getPublishedFlashCardDeck,
  getFlashCardMaterialDetail,
  listPublishedFlashCardSubtopics,
  publishFlashCardMaterial,
  resolveFlashCardConflict,
  retryFlashCardMaterialProcessing,
  saveFlashCardGeneratorCredential,
  saveFlashCardMaterialReview,
  saveStudentFlashCardDifficulty,
  testFlashCardGeneratorCredential,
  type CardMetadata,
  type CardSourceReference,
  type MaterialMetadata,
} from "./flash-card-api";

describe("flash-card-api", () => {
  test("maps BYOK status and credential actions through the flash-card edge function contract", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.7-flash",
            lastValidatedAt: null,
            lastError: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.7-flash",
            lastValidatedAt: null,
            lastError: null,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: true,
            model: "gemini-3.7-flash",
            lastValidatedAt: null,
            lastError: null,
          },
          testResult: {
            ok: true,
            message: "Koneksi Gemini valid.",
            latencyMs: 90,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: {
            hasCredential: false,
            model: "gemini-3.7-flash",
            lastValidatedAt: null,
            lastError: null,
          },
        },
        error: null,
      });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(getFlashCardGeneratorStatus(client as never)).resolves.toEqual({
      hasCredential: true,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: null,
      lastError: null,
    });
    await expect(saveFlashCardGeneratorCredential({
      apiKey: "AIza-user",
      model: "gemini-3.7-flash",
    }, client as never)).resolves.toEqual({
      hasCredential: true,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: null,
      lastError: null,
    });
    await expect(testFlashCardGeneratorCredential(client as never)).resolves.toEqual({
      status: {
        hasCredential: true,
        model: "gemini-3.7-flash",
        modelLabel: "gemini-3.7-flash",
        lastValidatedAt: null,
        lastError: null,
      },
      testResult: {
        ok: true,
        message: "Koneksi Gemini valid.",
        latencyMs: 90,
      },
    });
    await expect(deleteFlashCardGeneratorCredential(client as never)).resolves.toEqual({
      hasCredential: false,
      model: "gemini-3.7-flash",
      modelLabel: "gemini-3.7-flash",
      lastValidatedAt: null,
      lastError: null,
    });

    expect(invoke).toHaveBeenNthCalledWith(1, "flash-card-generator", {
      body: { action: "get-status" },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "flash-card-generator", {
      body: { action: "save-credential", apiKey: "AIza-user", model: "gemini-3.7-flash" },
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "flash-card-generator", {
      body: { action: "test-credential" },
    });
    expect(invoke).toHaveBeenNthCalledWith(4, "flash-card-generator", {
      body: { action: "delete-credential" },
    });
  });

  test("uploads mentor source files, creates a draft, and fetches mentor review detail through the edge function contract", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_780_000_000_000);

    const upload = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          path: "mentor-1/1780000000000-farmakoterapi-transcript-kelas.txt",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          path: "mentor-1/1780000000000-farmakoterapi-slide-utama.pdf",
        },
        error: null,
      });
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          materialId: "material-1",
          status: "draft",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          detail: {
            material: {
              id: "material-1",
              title: "Farmakoterapi Hipertensi",
              academicGroup: "clinical_science",
              status: "ready_for_review",
              globalSummary: "Ringkasan materi utama yang layak direview mentor.",
              processingError: null,
              publishedAt: null,
              createdAt: "2026-06-06T10:00:00.000Z",
              updatedAt: "2026-06-06T10:05:00.000Z",
            },
            sourceFiles: [],
            subtopics: [
              {
                id: "subtopic-1",
                title: "Target terapi",
                summary: "Target terapi untuk pasien CKD dan hipertensi.",
                sortOrder: 2,
                cards: [
                  {
                    id: "card-2",
                    frontText: "Apa target terapi pada albuminuria?",
                    backText: "Kontrol tekanan darah dan proteksi ginjal.",
                    sortOrder: 2,
                  },
                  {
                    id: "card-1",
                    frontText: "Kapan ACE inhibitor dipilih?",
                    backText: "Saat ada albuminuria atau CKD yang sesuai.",
                    sortOrder: 1,
                  },
                ],
              },
            ],
          },
        },
        error: null,
      });
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload,
        })),
      },
      functions: {
        invoke,
      },
    };

    const transcriptFile = new File(["Transkrip kelas"], "Transcript Kelas.txt", {
      type: "text/plain",
    });
    const slidePdfFile = new File(["%PDF-1.4"], "Slide Utama.pdf", {
      type: "application/pdf",
    });

    await expect(
      createFlashCardMaterialDraft(
        {
          ownerId: "mentor-1",
          title: "Farmakoterapi Hipertensi",
          academicGroup: "Clinical Science",
          transcriptFile,
          slidePdfFile,
        },
        client as never,
      ),
    ).resolves.toEqual({
      materialId: "material-1",
      status: "draft",
    });

    expect(client.storage.from).toHaveBeenCalledWith("flash-card-sources");
    expect(upload).toHaveBeenNthCalledWith(
      1,
      "mentor-1/1780000000000-farmakoterapi-hipertensi-transcript-kelas.txt",
      transcriptFile,
      expect.objectContaining({
        contentType: "text/plain",
        upsert: false,
      }),
    );
    expect(upload).toHaveBeenNthCalledWith(
      2,
      "mentor-1/1780000000000-farmakoterapi-hipertensi-slide-utama.pdf",
      slidePdfFile,
      expect.objectContaining({
        contentType: "application/pdf",
        upsert: false,
      }),
    );
    expect(invoke).toHaveBeenNthCalledWith(1, "flash-card-generator", {
      body: {
        action: "create-material",
        title: "Farmakoterapi Hipertensi",
        academicGroup: "Clinical Science",
        sourceFiles: [
          expect.objectContaining({
            fileKind: "transcript",
            storageBucket: "flash-card-sources",
          }),
          expect.objectContaining({
            fileKind: "slide_pdf",
            storageBucket: "flash-card-sources",
          }),
        ],
      },
    });

    await expect(
      getFlashCardMaterialDetail(
        {
          materialId: "material-1",
        },
        client as never,
      ),
    ).resolves.toMatchObject({
      material: expect.objectContaining({
        id: "material-1",
        academicGroupLabel: "Clinical Science",
        statusLabel: "Siap direview",
      }),
      subtopics: [
        expect.objectContaining({
          title: "Target terapi",
          cards: [
            expect.objectContaining({
              id: "card-1",
            }),
            expect.objectContaining({
              id: "card-2",
            }),
          ],
        }),
      ],
    });
  });

  test("maps publish, student library, student deck, and guided recall save actions", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "subtopic-1",
        title: "ACE inhibitor pada CKD",
        summary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
        sort_order: 1,
        flashcard_materials: {
          id: "material-1",
          title: "Farmakoterapi Hipertensi",
          academic_group: "clinical_science",
          status: "published",
          published_at: "2026-06-06T12:00:00.000Z",
        },
        flashcard_cards: [
          {
            id: "card-1",
            front_text: "Kapan ACE inhibitor dipilih?",
            back_text: "Saat albuminuria atau CKD yang relevan.",
            sort_order: 2,
          },
          {
            id: "card-2",
            front_text: "Apa target tekanan darah?",
            back_text: "Kurang dari 130/80 mmHg pada banyak pasien CKD.",
            sort_order: 1,
          },
        ],
      },
      error: null,
    });
    const inQuery = vi.fn().mockResolvedValue({
      data: [
        {
          card_id: "card-2",
          difficulty: "hard",
          last_reviewed_at: "2026-06-06T12:05:00.000Z",
        },
      ],
      error: null,
    });
    const order = vi.fn(() => ({
      maybeSingle,
    }));
    const eq = vi.fn(() => ({
      order,
      maybeSingle,
    }));
    const selectLibrary = vi.fn(() => ({
      eq,
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "subtopic-1",
            title: "ACE inhibitor pada CKD",
            summary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
            sort_order: 1,
            flashcard_materials: {
              id: "material-1",
              title: "Farmakoterapi Hipertensi",
              academic_group: "clinical_science",
              status: "published",
              published_at: "2026-06-06T12:00:00.000Z",
            },
            flashcard_cards: [{ id: "card-1" }, { id: "card-2" }],
          },
          {
            id: "subtopic-2",
            title: "Draft tersembunyi",
            summary: "Tidak boleh masuk ke library siswa.",
            sort_order: 2,
            flashcard_materials: {
              id: "material-2",
              title: "Draft internal mentor",
              academic_group: "clinical_science",
              status: "draft",
              published_at: null,
            },
            flashcard_cards: [{ id: "card-3" }],
          },
        ],
        error: null,
      }),
    }));
    const upsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === "flashcard_subtopics") {
        return {
          select: selectLibrary,
        };
      }

      if (table === "student_flashcard_progress") {
        return {
          select: vi.fn(() => ({
            in: inQuery,
          })),
          upsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "published",
      },
      error: null,
    });
    const client = {
      from,
      functions: {
        invoke,
      },
    };

    await expect(
      publishFlashCardMaterial(
        {
          materialId: "material-1",
        },
        client as never,
      ),
    ).resolves.toEqual({
      materialId: "material-1",
      status: "published",
    });

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "publish-material",
        materialId: "material-1",
      },
    });

    await expect(listPublishedFlashCardSubtopics(client as never)).resolves.toEqual([
      {
        academicGroup: "clinical_science",
        academicGroupLabel: "Clinical Science",
        cardCount: 2,
        materialId: "material-1",
        materialTitle: "Farmakoterapi Hipertensi",
        publishedAt: "2026-06-06T12:00:00.000Z",
        subtopicId: "subtopic-1",
        subtopicTitle: "ACE inhibitor pada CKD",
        subtopicSummary: "Fokus terapi awal, monitoring, dan target proteksi ginjal.",
        sortOrder: 1,
      },
    ]);

    await expect(
      getPublishedFlashCardDeck(
        {
          subtopicId: "subtopic-1",
        },
        client as never,
      ),
    ).resolves.toMatchObject({
      subtopicId: "subtopic-1",
      academicGroupLabel: "Clinical Science",
      cards: [
        expect.objectContaining({
          id: "card-2",
          savedDifficulty: "hard",
        }),
        expect.objectContaining({
          id: "card-1",
          savedDifficulty: null,
        }),
      ],
    });

    await expect(
      saveStudentFlashCardDifficulty(
        {
          userId: "student-1",
          cardId: "card-2",
          difficulty: "hard",
        },
        client as never,
      ),
    ).resolves.toBeUndefined();

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "student-1",
        card_id: "card-2",
        difficulty: "hard",
      }),
      {
        onConflict: "user_id,card_id",
      },
    );
  });

  test("routes mentor retry requests through the processing action contract", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "processing",
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await expect(
      retryFlashCardMaterialProcessing(
        {
          materialId: "material-1",
        },
        client as never,
      ),
    ).resolves.toEqual({
      materialId: "material-1",
      status: "processing",
    });

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "retry-processing",
        materialId: "material-1",
      },
    });
  });

  test("forwards optional stepGroup in retryFlashCardMaterialProcessing when provided", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "processing",
        isSuspended: true,
        nextStepGroup: "generation",
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    await retryFlashCardMaterialProcessing(
      {
        materialId: "material-1",
        stepGroup: "cleaning",
      },
      client as never,
    );

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "retry-processing",
        materialId: "material-1",
        stepGroup: "cleaning",
      },
    });
  });

  test("invokes resolveFlashCardConflict with action resolve-conflict and correct payload", async () => {
    const mockMetadata: MaterialMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: "gemini-3.8-flash",
      sourceConflicts: [
        {
          conflictId: "conflict-1",
          conceptId: "captopril-dosage",
          category: "dosage_discrepancy",
          severity: "critical",
          slideEvidence: {
            pdfPageIndex: 12,
            printedSlideNumber: 12,
            exactQuote: "Dosis kaptopril 25 mg bid",
          },
          transcriptEvidence: {
            segmentId: "seg-5",
            exactQuote: "Dosis kaptopril 12.5 mg tid",
          },
          distinctionType: "substantive_contradiction",
          resolutionStatus: "mentor_clarified",
          clinicalClarificationNotes: "Gunakan panduan slide 25 mg bid.",
          resolvedAt: "2026-10-17T12:00:00.000Z",
          resolvedBy: "mentor-1",
        },
      ],
    };

    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "ready_for_review",
        metadata: mockMetadata,
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    const result = await resolveFlashCardConflict(
      {
        materialId: "material-1",
        conflictId: "conflict-1",
        resolutionStatus: "mentor_clarified",
        clinicalClarificationNotes: "Gunakan panduan slide 25 mg bid.",
        resolvedBy: "mentor-1",
      },
      client as never,
    );

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "resolve-conflict",
        materialId: "material-1",
        conflictId: "conflict-1",
        resolutionStatus: "mentor_clarified",
        clinicalClarificationNotes: "Gunakan panduan slide 25 mg bid.",
        resolvedBy: "mentor-1",
      },
    });
    expect(result).toEqual({
      materialId: "material-1",
      status: "ready_for_review",
      metadata: mockMetadata,
    });
  });

  test("invokes auditRepairFlashCardMaterial with action audit-repair-material and correct payload", async () => {
    const mockMetadata: MaterialMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      qualityReport: {
        totalCardsGenerated: 10,
        acceptedCount: 9,
        repairedCount: 1,
        droppedCount: 0,
      },
    };

    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "ready_for_review",
        metadata: mockMetadata,
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    const result = await auditRepairFlashCardMaterial(
      {
        materialId: "material-1",
      },
      client as never,
    );

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "audit-repair-material",
        materialId: "material-1",
      },
    });
    expect(result).toEqual({
      materialId: "material-1",
      status: "ready_for_review",
      metadata: mockMetadata,
    });
  });

  test("maps material metadata and card sources in getFlashCardMaterialDetail", async () => {
    const mockCardSource: CardSourceReference = {
      sourceId: "src-1",
      sourceType: "slide_pdf",
      provenanceStatus: "verified_exact",
      location: {
        pdfPageIndex: 4,
        printedSlideNumber: 4,
        segmentId: null,
        textQuote: "ACE inhibitor adalah lini pertama nefropati diabetik.",
      },
      alignmentConfidence: "high",
      confidenceReason: "Kutipan verbatim cocok dengan materi kuliah.",
    };

    const mockMaterialMeta: MaterialMetadata = {
      pipelineVersion: "gemini-3.8-source-aware-v1",
      modelUsed: "gemini-3.8-flash",
      tokenUsage: {
        generateCards: {
          isAvailable: true,
          promptTokenCount: 1200,
          candidatesTokenCount: 350,
          totalTokenCount: 1550,
        },
      },
      qualityReport: {
        totalCardsGenerated: 1,
        acceptedCount: 1,
      },
    };

    const mockCardMeta: CardMetadata = {
      sources: [mockCardSource],
      clinicalVerification: {
        status: "source_supported_only",
        notes: null,
      },
      qualityStatus: "ACCEPTED",
    };

    const invoke = vi.fn().mockResolvedValue({
      data: {
        detail: {
          material: {
            id: "material-1",
            title: "Nefropati Diabetik",
            academicGroup: "clinical_science",
            status: "ready_for_review",
            globalSummary: "Ringkasan nefropati diabetik.",
            processingError: null,
            publishedAt: null,
            createdAt: "2026-06-06T10:00:00.000Z",
            updatedAt: "2026-06-06T10:05:00.000Z",
            metadata: mockMaterialMeta,
          },
          sourceFiles: [],
          subtopics: [
            {
              id: "subtopic-1",
              title: "Terapi Renoprotektif",
              summary: "Ringkasan terapi renoprotektif.",
              sortOrder: 1,
              cards: [
                {
                  id: "card-1",
                  frontText: "Lini pertama nefropati diabetik?",
                  backText: "ACE inhibitor atau ARB.",
                  sortOrder: 1,
                  metadata: mockCardMeta,
                },
              ],
            },
          ],
        },
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    const detail = await getFlashCardMaterialDetail(
      { materialId: "material-1" },
      client as never,
    );

    expect(detail.material.metadata).toEqual(mockMaterialMeta);
    expect(detail.subtopics[0].cards[0].sources).toEqual([mockCardSource]);
    expect(detail.subtopics[0].cards[0].metadata).toEqual(mockCardMeta);
  });

  test("allows saveFlashCardMaterialReview to include card metadata", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        materialId: "material-1",
        status: "ready_for_review",
      },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    const cardMeta: CardMetadata = {
      sources: [],
      clinicalVerification: { status: "not_assessed" },
      qualityStatus: "ACCEPTED",
      mentorCustomNotes: "Catatan klinis dari mentor.",
    };

    await saveFlashCardMaterialReview(
      {
        materialId: "material-1",
        title: "Farmakoterapi Hipertensi",
        globalSummary: "Ringkasan diperbarui.",
        subtopics: [
          {
            title: "Subtopik 1",
            summary: "Ringkasan 1",
            cards: [
              {
                frontText: "Pertanyaan",
                backText: "Jawaban",
                metadata: cardMeta,
              },
            ],
          },
        ],
      },
      client as never,
    );

    expect(invoke).toHaveBeenCalledWith("flash-card-generator", {
      body: {
        action: "update-material",
        materialId: "material-1",
        title: "Farmakoterapi Hipertensi",
        globalSummary: "Ringkasan diperbarui.",
        subtopics: [
          {
            title: "Subtopik 1",
            summary: "Ringkasan 1",
            cards: [
              {
                frontText: "Pertanyaan",
                backText: "Jawaban",
                metadata: cardMeta,
              },
            ],
          },
        ],
      },
    });
  });
});
