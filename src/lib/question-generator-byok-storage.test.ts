import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  clearQuestionGeneratorApiKey,
  questionGeneratorApiKeyStorageKey,
  readQuestionGeneratorApiKey,
  writeQuestionGeneratorApiKey,
} from "./question-generator-byok-storage";

describe("question-generator-byok-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  test("stores keys per user id", () => {
    writeQuestionGeneratorApiKey("user-1", "key-a");
    writeQuestionGeneratorApiKey("user-2", "key-b");

    expect(readQuestionGeneratorApiKey("user-1")).toBe("key-a");
    expect(readQuestionGeneratorApiKey("user-2")).toBe("key-b");
    expect(questionGeneratorApiKeyStorageKey("user-1")).toBe("question-generator:gemini-key:user-1");
  });

  test("removes only the target user's key", () => {
    writeQuestionGeneratorApiKey("user-1", "key-a");
    writeQuestionGeneratorApiKey("user-2", "key-b");

    clearQuestionGeneratorApiKey("user-1");

    expect(readQuestionGeneratorApiKey("user-1")).toBe("");
    expect(readQuestionGeneratorApiKey("user-2")).toBe("key-b");
  });
});
