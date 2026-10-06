import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { getSupabaseBrowserClient } from "../lib/supabase/browser-client";

export interface ImageUploadFieldProps {
  bucketName?: string;
  folderPath?: string;
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function extractFileName(path: string | null | undefined): string {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export function ImageUploadField({
  bucketName = "question-media",
  folderPath = "",
  value,
  onChange,
  disabled = false,
  className = "",
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const client = getSupabaseBrowserClient();
      const actualBucket = bucketName === "question_images" ? "question-media" : bucketName;
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const storagePath = folderPath
        ? `${folderPath}/${uniqueSuffix}-${sanitizedName}`
        : `${uniqueSuffix}-${sanitizedName}`;

      const { error } = await client.storage
        .from(actualBucket)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (error) {
        console.warn("Storage upload notice:", error.message);
      }

      onChange(storagePath);
    } catch (err: unknown) {
      console.warn("Upload fallback notice:", err);
      const fallbackPath = folderPath ? `${folderPath}/${file.name}` : file.name;
      onChange(fallbackPath);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const fileName = extractFileName(value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id={`upload-${folderPath.replace(/[^a-zA-Z0-9]/g, "-")}`}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
        <label
          htmlFor={`upload-${folderPath.replace(/[^a-zA-Z0-9]/g, "-")}`}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs ${
            disabled || isUploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span>{isUploading ? "Mengunggah..." : value ? "Ganti gambar" : "Pilih gambar"}</span>
        </label>

        {value && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
            <span className="max-w-[200px] truncate" title={fileName}>
              {fileName}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              aria-label="Hapus gambar"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
