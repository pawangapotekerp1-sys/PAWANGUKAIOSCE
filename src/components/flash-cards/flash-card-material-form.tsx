import { useState } from "react";
import Button from "../ui/button";

const ACADEMIC_GROUP_OPTIONS = [
  {
    value: "pharmaceutical_science",
    label: "Pharmaceutical Science",
  },
  {
    value: "clinical_science",
    label: "Clinical Science",
  },
  {
    value: "social_behavioral_and_administration",
    label: "Social Behavioral and Administration",
  },
] as const;

type FlashCardMaterialFormProps = {
  isSubmitting?: boolean;
  isSubmitDisabled?: boolean;
  onSubmit: (input: {
    title: string;
    academicGroup: string;
    transcriptFile: File;
    slidePdfFile: File;
  }) => Promise<void> | void;
};

type FormErrors = {
  title?: string;
  academicGroup?: string;
  transcriptFile?: string;
  slidePdfFile?: string;
};

function FlashCardMaterialForm({
  isSubmitting = false,
  isSubmitDisabled = false,
  onSubmit,
}: FlashCardMaterialFormProps) {
  const [title, setTitle] = useState("");
  const [academicGroupValue, setAcademicGroupValue] = useState("");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [slidePdfFile, setSlidePdfFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};

    if (!title.trim()) {
      nextErrors.title = "Judul materi wajib diisi.";
    }

    if (!academicGroupValue) {
      nextErrors.academicGroup = "Kelompok materi wajib dipilih.";
    }

    if (!transcriptFile) {
      nextErrors.transcriptFile = "Transkrip wajib diunggah.";
    }

    if (!slidePdfFile) {
      nextErrors.slidePdfFile = "Slide PDF wajib diunggah.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !transcriptFile || !slidePdfFile) {
      return;
    }

    const selectedGroup = ACADEMIC_GROUP_OPTIONS.find((option) => option.value === academicGroupValue);

    await onSubmit({
      title: title.trim(),
      academicGroup: selectedGroup?.label ?? academicGroupValue,
      transcriptFile,
      slidePdfFile,
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
          Judul materi
          <input
            aria-label="Judul materi"
            className="min-h-11 rounded-2xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {errors.title ? <span className="text-sm text-rose-700">{errors.title}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)]">
          Kelompok materi
          <select
            aria-label="Kelompok materi"
            className="min-h-11 rounded-2xl border border-[var(--color-outline-soft)] bg-white px-4 py-3 text-sm text-[var(--color-ink)]"
            value={academicGroupValue}
            onChange={(event) => setAcademicGroupValue(event.target.value)}
          >
            <option value="">Pilih kelompok materi</option>
            {ACADEMIC_GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.academicGroup ? <span className="text-sm text-rose-700">{errors.academicGroup}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)] cursor-pointer hover:text-primary transition-colors">
          Unggah transkrip
          <input
            aria-label="Unggah transkrip"
            accept=".txt,.md"
            className="block text-sm text-[var(--color-ink)] cursor-pointer file:cursor-pointer file:hover:bg-primary/20 file:bg-primary/10 file:text-primary file:font-semibold file:px-3 file:py-1 file:rounded-lg file:border-0 file:transition-all"
            type="file"
            onChange={(event) => setTranscriptFile(event.target.files?.[0] ?? null)}
          />
          {errors.transcriptFile ? <span className="text-sm text-rose-700">{errors.transcriptFile}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--color-outline)] cursor-pointer hover:text-primary transition-colors">
          Unggah slide PDF
          <input
            aria-label="Unggah slide PDF"
            accept="application/pdf,.pdf"
            className="block text-sm text-[var(--color-ink)] cursor-pointer file:cursor-pointer file:hover:bg-primary/20 file:bg-primary/10 file:text-primary file:font-semibold file:px-3 file:py-1 file:rounded-lg file:border-0 file:transition-all"
            type="file"
            onChange={(event) => setSlidePdfFile(event.target.files?.[0] ?? null)}
          />
          {errors.slidePdfFile ? <span className="text-sm text-rose-700">{errors.slidePdfFile}</span> : null}
        </label>
      </div>

      <div className="rounded-3xl border border-[var(--color-outline-soft)] bg-[rgba(31,111,115,0.05)] px-4 py-4 text-sm leading-7 text-[var(--color-ink-muted)]">
        Scan atau foto PDF tetap bisa dipakai. Jika teks kurang jelas, periksa hasilnya sebelum diterbitkan.
      </div>

      <Button
        disabled={isSubmitDisabled}
        loading={isSubmitting}
        loadingLabel="Menyimpan materi..."
        type="submit"
        variant="primary"
      >
        Buat materi kartu belajar
      </Button>
    </form>
  );
}

export default FlashCardMaterialForm;
