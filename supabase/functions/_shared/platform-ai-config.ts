export type StoredPlatformConfigForTest = {
  model: string;
  platformSecretId: string | null;
};

export type PlatformTestPayload = {
  apiKey?: string;
  model?: string;
};

export type ResolvedPlatformTestConfig = {
  model: string;
  apiKey: string | null;
  shouldPersistLastTestedAt: boolean;
  secretSource: "payload" | "stored";
};

export function resolvePlatformTestConfig(
  currentConfig: StoredPlatformConfigForTest,
  payload: PlatformTestPayload,
): ResolvedPlatformTestConfig {
  const trimmedApiKey = payload.apiKey?.trim() || null;
  const trimmedModel = payload.model?.trim() || null;
  const effectiveModel = trimmedModel || currentConfig.model;
  const usesDraftOverride = Boolean(trimmedApiKey) || (
    trimmedModel !== null && trimmedModel !== currentConfig.model
  );

  return {
    model: effectiveModel,
    apiKey: trimmedApiKey,
    shouldPersistLastTestedAt: !usesDraftOverride,
    secretSource: trimmedApiKey ? "payload" : "stored",
  };
}
