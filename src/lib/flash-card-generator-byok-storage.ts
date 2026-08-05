const FLASH_CARD_GENERATOR_BYOK_STORAGE_PREFIX = "flash-card-generator:gemini-key";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function flashCardGeneratorApiKeyStorageKey(userId: string) {
  return `${FLASH_CARD_GENERATOR_BYOK_STORAGE_PREFIX}:${userId}`;
}

export function readFlashCardGeneratorApiKey(userId: string) {
  if (!hasWindow() || !userId.trim()) {
    return "";
  }

  return window.localStorage.getItem(flashCardGeneratorApiKeyStorageKey(userId)) ?? "";
}

export function writeFlashCardGeneratorApiKey(userId: string, apiKey: string) {
  if (!hasWindow() || !userId.trim()) {
    return;
  }

  window.localStorage.setItem(flashCardGeneratorApiKeyStorageKey(userId), apiKey);
}

export function clearFlashCardGeneratorApiKey(userId: string) {
  if (!hasWindow() || !userId.trim()) {
    return;
  }

  window.localStorage.removeItem(flashCardGeneratorApiKeyStorageKey(userId));
}
