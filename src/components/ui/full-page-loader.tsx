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
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md border border-primary/10">
          {!isError && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-30"
            />
          )}
          {/* Brand Logo */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <img 
              src="/logo.jpg" 
              alt="Logo Pawang Apoteker" 
              className="h-full w-full object-cover" 
            />
          </div>
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
