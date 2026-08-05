import type { ReactNode } from "react";

export type FullPageLoaderProps = {
  title?: string;
  description?: string;
  variant?: "loading" | "error";
  errorDetails?: string;
  children?: ReactNode;
};

export default function FullPageLoader({
  title = "Menyiapkan Ruang Belajar...",
  description = "Halaman sedang dimuat agar pengalaman belajar Anda tetap cepat & responsif.",
  variant = "loading",
  errorDetails,
  children,
}: FullPageLoaderProps) {
  const isError = variant === "error";

  return (
    <main
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className="relative flex min-h-[100dvh] w-full items-center justify-center bg-clinical-surface px-4 py-8 text-foreground overflow-hidden"
    >
      {/* Glowing Ambient Mesh Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px] transition-all duration-700"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] transition-all duration-700"
      />

      {/* Glassmorphic Container Card */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center rounded-3xl border border-border/50 bg-card/80 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Icon Header */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          {!isError && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-30"
            />
          )}
          {/* Bowl of Hygieia Icon */}
          <svg
            viewBox="0 0 100 100"
            className="h-9 w-9 text-primary fill-current transition-transform duration-300"
            aria-hidden="true"
          >
            <path d="M42 22 L58 22 C64 22 68 25 71 30 C74 36 75 44 73 51 C70 60 62 67 52 68 L52 76 L66 76 C68 76 70 78 70 80 C70 82 68 84 66 84 L34 84 C32 84 30 82 30 80 C30 78 32 76 34 76 L48 76 L48 68 C38 67 30 60 27 51 C25 44 26 36 29 30 C32 25 36 22 42 22 Z M43 26 C38 26 34 29 32 33 C30 38 29 44 31 50 C33 57 40 63 50 63 C60 63 67 57 69 50 C71 44 70 38 68 33 C66 29 62 26 57 26 Z" />
            <path d="M50 14 C48 10 44 7 40 7 C34 7 30 11 30 16 C30 20 33 24 37 27 C42 30 46 34 46 40 C46 47 41 52 35 54 L36 57 C44 55 50 49 50 40 C50 32 44 28 40 25 C36 22 34 20 34 16 C34 13 37 10 40 10 C43 10 45 12 47 15 Z" />
          </svg>
        </div>

        {/* Shimmering Indeterminate Progress Bar */}
        {!isError && (
          <div className="mb-6 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted/60 relative">
            <div className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-[shimmer_1.5s_infinite] -translate-x-full" />
          </div>
        )}

        {/* Title and Description */}
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed max-w-sm">
          {description}
        </p>

        {errorDetails && (
          <div className="mt-4 w-full rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            {errorDetails}
          </div>
        )}

        {children}
      </div>
    </main>
  );
}
