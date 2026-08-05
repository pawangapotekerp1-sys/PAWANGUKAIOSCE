import { FunctionsHttpError } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../supabase/browser-client";
import {
  mapQuestionGenerationBatchDetail,
  mapQuestionGeneratorStatus,
  type QuestionGenerationBatchDetailViewModel,
  type QuestionGeneratorStatusViewModel,
} from "../mappers/question-generator-mappers";

type QuestionGeneratorClient = Pick<ReturnType<typeof getSupabaseBrowserClient>, "functions">;

export type QuestionGeneratorReferenceInput = {
  stem: string;
  options: Record<"A" | "B" | "C" | "D" | "E", string>;
  correctOptionKey: "A" | "B" | "C" | "D" | "E";
  explanationText: string;
};

async function normalizeFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json() as {
        message?: string;
        error?: string;
      };
      const message = payload.message?.trim() || payload.error?.trim();

      if (message) {
        return new Error(message);
      }
    } catch {
      // Fall back to the generic Supabase error.
    }
  }

  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof error.message === "string"
    && error.message.trim().length > 0
  ) {
    return new Error(error.message);
  }

  return error instanceof Error
    ? error
    : new Error("Question generator request failed.");
}

async function invokeQuestionGenerator<TData>(
  body: Record<string, unknown>,
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<TData> {
  const { data, error } = await client.functions.invoke("question-generator", {
    body,
  });

  if (error) {
    throw await normalizeFunctionError(error);
  }

  return data as TData;
}

export async function getQuestionGeneratorStatus(
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<QuestionGeneratorStatusViewModel> {
  const data = await invokeQuestionGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "get-status",
  }, client);

  return mapQuestionGeneratorStatus(data.status);
}

export async function saveQuestionGeneratorCredential(
  input: {
    apiKey: string;
    model?: string;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<QuestionGeneratorStatusViewModel> {
  const data = await invokeQuestionGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "save-credential",
    apiKey: input.apiKey,
    model: input.model,
  }, client);

  return mapQuestionGeneratorStatus(data.status);
}

export async function deleteQuestionGeneratorCredential(
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<QuestionGeneratorStatusViewModel> {
  const data = await invokeQuestionGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
  }>({
    action: "delete-credential",
  }, client);

  return mapQuestionGeneratorStatus(data.status);
}

export async function testQuestionGeneratorCredential(
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<{
  status: QuestionGeneratorStatusViewModel;
  testResult: {
    ok: boolean;
    message: string;
    latencyMs: number | null;
  };
}> {
  const data = await invokeQuestionGenerator<{
    status: {
      hasCredential: boolean;
      model: string;
      lastValidatedAt: string | null;
      lastError: string | null;
    };
    testResult: {
      ok: boolean;
      message: string;
      latencyMs: number | null;
    };
  }>({
    action: "test-credential",
  }, client);

  return {
    status: mapQuestionGeneratorStatus(data.status),
    testResult: data.testResult,
  };
}

export async function generateQuestionBatch(
  input: {
    references: QuestionGeneratorReferenceInput[];
    targetQuestionCount: number;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<{
  batchId: string;
  generatedCount: number;
}> {
  return invokeQuestionGenerator({
    action: "generate",
    references: input.references,
    targetQuestionCount: input.targetQuestionCount,
  }, client);
}

export async function getQuestionGenerationBatchDetail(
  input: {
    batchId: string;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<QuestionGenerationBatchDetailViewModel> {
  const data = await invokeQuestionGenerator<{
    detail: Parameters<typeof mapQuestionGenerationBatchDetail>[0];
  }>({
    action: "get-batch",
    batchId: input.batchId,
  }, client);

  return mapQuestionGenerationBatchDetail(data.detail);
}

export async function updateGeneratedDraftItem(
  input: {
    generationItemId: string;
    stem: string;
    options: Record<"A" | "B" | "C" | "D" | "E", string>;
    correctOptionKey: "A" | "B" | "C" | "D" | "E";
    explanationText: string;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<{
    itemId: string;
    status: string;
  }> {
  return invokeQuestionGenerator({
    action: "update-item",
    ...input,
  }, client);
}

export async function deliverGeneratedItemToQuestionBank(
  input: {
    generationItemId: string;
    blockId: string;
    topicId: string;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<{
    deliveryId: string;
    questionId: string;
  }> {
  return invokeQuestionGenerator({
    action: "deliver-to-question-bank",
    ...input,
  }, client);
}

export async function deliverGeneratedItemToScheduledEvent(
  input: {
    generationItemId: string;
    eventId: string;
  },
  client: QuestionGeneratorClient = getSupabaseBrowserClient(),
): Promise<{
    deliveryId: string;
    eventQuestionId: string;
  }> {
  return invokeQuestionGenerator({
    action: "deliver-to-scheduled-event",
    ...input,
  }, client);
}
