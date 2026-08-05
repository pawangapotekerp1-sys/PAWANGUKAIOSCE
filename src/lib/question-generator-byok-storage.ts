const QUESTION_GENERATOR_BYOK_STORAGE_PREFIX = "question-generator:gemini-key";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function questionGeneratorApiKeyStorageKey(userId: string) {
  return `${QUESTION_GENERATOR_BYOK_STORAGE_PREFIX}:${userId}`;
}

export function readQuestionGeneratorApiKey(userId: string) {
  if (!hasWindow() || !userId.trim()) {
    return "";
  }

  return window.localStorage.getItem(questionGeneratorApiKeyStorageKey(userId)) ?? "";
}

export function writeQuestionGeneratorApiKey(userId: string, apiKey: string) {
  if (!hasWindow() || !userId.trim()) {
    return;
  }

  window.localStorage.setItem(questionGeneratorApiKeyStorageKey(userId), apiKey);
}

export function clearQuestionGeneratorApiKey(userId: string) {
  if (!hasWindow() || !userId.trim()) {
    return;
  }

  window.localStorage.removeItem(questionGeneratorApiKeyStorageKey(userId));
}
