export function arePreviewToolsEnabled() {
  const forcedValue = import.meta.env.VITE_ENABLE_PREVIEW_TOOLS;

  if (forcedValue === "true") {
    return true;
  }

  if (forcedValue === "false") {
    return false;
  }

  return import.meta.env.MODE !== "production";
}
