import {
  ArrowRight,
  CheckCircle,
  FileUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import Button, { getButtonStyleProps } from "../components/ui/button";

import { useSession } from "../lib/auth/use-session";
import { bootstrapProfile, logout } from "../lib/api/auth-api";
import {
  getSubscriptionOverview,
  submitPaymentProof,
  subscriptionPackageOptions,
  type SubscriptionOverview,
} from "../lib/api/subscription-api";
import { usePreviewRouteState } from "../lib/preview-route-state";
import {
  subscriptionPackages,
  subscriptionStatuses,
  transferSteps,
  uploadChecklist,
  type SubscriptionPreviewState,
} from "../mocks/subscription-content";
import { Card, CardTitle, CardDescription } from "../components/ui/card";
import { useWindowFocusRefresh } from "../lib/use-window-focus-refresh";

function resolveLiveStatus(overview: SubscriptionOverview | null): SubscriptionPreviewState {
  if (!overview) {
    return "expired";
  }

  if (overview.subscription?.state === "active") {
    return "active";
  }

  if (overview.latestSubmission?.status === "pending_review") {
    return "pending_review";
  }

  if (overview.latestSubmission?.status === "rejected") {
    return "rejected";
  }

  if (overview.subscription?.state === "pending_review") {
    return "pending_review";
  }

  if (overview.subscription?.state === "rejected") {
    return "rejected";
  }

  return "expired";
}

function SubscriptionPage() {
  const { status: sessionStatus, user } = useSession();
  const refreshVersion = useWindowFocusRefresh({
    enabled: sessionStatus === "authenticated" && Boolean(user),
  });
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPackageCode, setSelectedPackageCode] = useState("pro_30_hari");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [refreshIssue, setRefreshIssue] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const statusView = usePreviewRouteState("statusView");
  const previewStatus = resolveLiveStatus(overview);
  const status = subscriptionStatuses[previewStatus];
  const isReadyStatusView = statusView === "ready";
  const hasLiveOverviewError = isReadyStatusView && !isLoadingOverview && Boolean(loadError);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateOverview() {
      if (sessionStatus === "loading") {
        setIsLoadingOverview(true);
        return;
      }

      if (sessionStatus === "anonymous" || !user) {
        setOverview(null);
        setLoadError(null);
        setRefreshIssue(null);
        setIsLoadingOverview(false);
        return;
      }

      setIsLoadingOverview(true);
      setLoadError(null);
      setRefreshIssue(null);

      try {
        await bootstrapProfile({
          user,
        });
        const nextOverview = await getSubscriptionOverview({
          user,
        });

        if (!isCancelled) {
          setOverview(nextOverview);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Status langganan belum berhasil dimuat.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingOverview(false);
        }
      }
    }

    void hydrateOverview();

    return () => {
      isCancelled = true;
    };
  }, [refreshVersion, sessionStatus, user]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setRefreshIssue(null);

    if (!user) {
      setSubmitError("Silakan login terlebih dahulu sebelum mengunggah bukti transfer.");
      return;
    }

    if (!selectedFile) {
      setSubmitError("Pilih file bukti transfer terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextSubmission = await submitPaymentProof({
        user,
        packageCode: selectedPackageCode,
        file: selectedFile,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSubmitSuccess(
        `Bukti transfer paket ${nextSubmission.packageCode.replaceAll("_", " ")} sudah dikirim dan sedang ditinjau.`,
      );

      try {
        const nextOverview = await getSubscriptionOverview({
          user,
        });

        setOverview(nextOverview);
        setLoadError(null);
      } catch (error) {
        setRefreshIssue(
          error instanceof Error
            ? `Bukti transfer berhasil dikirim, tetapi ${error.message}`
            : "Bukti transfer berhasil dikirim, tetapi status terbaru belum bisa dimuat.",
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Upload bukti transfer belum berhasil. Coba lagi sebentar.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderStatePanel = ({
    title,
    description,
    variant,
    action,
    icon: Icon,
  }: {
    title: string;
    description: string;
    variant: "error" | "empty" | "loading" | "success";
    action?: React.ReactNode;
    icon?: React.ElementType;
  }) => {
    const isError = variant === 'error';
    const isEmpty = variant === 'empty';
    const isLoading = variant === 'loading';
    const isSuccess = variant === 'success';

    let bgClass = "bg-card text-card-foreground";
    let iconClass = "text-primary";

    if (isError) {
      bgClass = "bg-destructive/10 border-destructive/20 text-foreground";
      iconClass = "text-destructive";
    } else if (isLoading) {
      bgClass = "bg-muted text-muted-foreground";
      iconClass = "text-muted-foreground animate-spin";
    } else if (isSuccess) {
      bgClass = "bg-primary/10 border-primary/20 text-foreground";
      iconClass = "text-primary";
    } else if (isEmpty) {
      bgClass = "bg-muted/50 text-foreground";
      iconClass = "text-muted-foreground";
    }

    return (
      <Card className={`rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm ${bgClass}`}>
        {Icon && (
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full bg-background mb-5 shadow-sm border ${iconClass}`}>
            <Icon className="h-8 w-8" />
          </div>
        )}
        <CardTitle className="text-2xl font-bold mb-2">{title}</CardTitle>
        <CardDescription className={`mb-6 max-w-md ${isError ? 'text-destructive/80' : 'text-muted-foreground'}`}>{description}</CardDescription>
        {action && <div>{action}</div>}
      </Card>
    );
  };

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col gap-6">
        <header className="rounded-3xl border bg-card px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                Pawang Masuk Apoteker
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-foreground">
                Aktifkan akses belajar.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                Pilih paket, unggah bukti transfer, lalu pantau statusnya di sini.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                    })}
                    to="/profile"
                  >
                    Profil
                  </Link>

                  <Button
                    onClick={() => void logout()}
                    variant="outline"
                  >
                    Keluar
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    {...getButtonStyleProps({
                      variant: "outline",
                    })}
                    to="/auth/login"
                  >
                    Kembali ke login
                  </Link>
                  <Link
                    {...getButtonStyleProps({
                      variant: "primary",
                    })}
                    to="/auth/login"
                  >
                    Masuk akun
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {isReadyStatusView && !isLoadingOverview && !loadError ? (
          renderStatePanel({
            title: status.title,
            description: status.description,
            variant: status.variant,
            icon: status.icon,
            action: previewStatus === "active" ? (
              <Link
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                to="/app"
              >
                {status.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            ) : (
              <a
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                href="#instruksi-transfer"
              >
                {status.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            )
          })
        ) : hasLiveOverviewError ? (
          renderStatePanel({
            title: "Status langganan belum berhasil dimuat",
            description: loadError ?? "Status langganan belum berhasil dimuat.",
            variant: "error",
            icon: AlertCircle,
            action: (
              <a
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                href="#instruksi-transfer"
              >
                Lihat cara bayar
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            )
          })
        ) : statusView === "loading" || isLoadingOverview ? (
          renderStatePanel({
            title: "Status pembayaran sedang dicek",
            description: "Mohon tunggu sebentar.",
            variant: "loading",
            icon: Loader2,
          })
        ) : statusView === "empty" ? (
          renderStatePanel({
            title: "Belum ada pembayaran",
            description: "Belum ada pembayaran untuk akun ini.",
            variant: "empty",
            icon: AlertCircle,
            action: (
              <a
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                href="#instruksi-transfer"
              >
                Lihat cara bayar
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            )
          })
        ) : (
          renderStatePanel({
            title: "Status pembayaran belum bisa dimuat",
            description: "Coba lagi sebentar.",
            variant: "error",
            icon: AlertCircle,
            action: (
              <a
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                href="#instruksi-transfer"
              >
                Lihat cara bayar
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            )
          })
        )}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] items-start">
          <div className="grid gap-6">
            <article className="rounded-3xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    Paket belajar
                  </div>
                  <h2 className="mt-4 text-3xl font-bold leading-tight text-foreground">
                    Pilih paket yang sesuai.
                  </h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Pilih paket lalu lanjut bayar.
                </p>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                {subscriptionPackages.map((item) => (
                  <div
                    key={item.name}
                    className={`rounded-2xl p-6 border shadow-sm ${
                      item.emphasis === "accent"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p
                      className={`font-mono text-xs font-semibold uppercase tracking-wider ${
                        item.emphasis === "accent"
                          ? "text-primary-foreground/70"
                          : "text-primary"
                      }`}
                    >
                      {item.duration}
                    </p>
                    <h3 className="mt-4 text-2xl font-bold">
                      {item.name}
                    </h3>
                    <p
                      className={`mt-3 text-4xl font-bold tracking-tight ${
                        item.emphasis === "accent" ? "text-background" : "text-foreground"
                      }`}
                    >
                      {item.price}
                    </p>
                    <p
                      className={`mt-3 text-sm leading-6 ${
                        item.emphasis === "accent"
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.summary}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-3">
                          <CheckCircle
                            className={`mt-0.5 h-5 w-5 shrink-0 ${
                              item.emphasis === "accent"
                                ? "text-background"
                                : "text-primary"
                            }`}
                          />
                          <span
                            className={`text-sm leading-6 ${
                              item.emphasis === "accent"
                                ? "text-primary-foreground/90"
                                : "text-muted-foreground"
                            }`}
                          >
                            {highlight}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="grid gap-6">
            <article
              className="rounded-3xl border bg-muted p-6 shadow-sm"
              id="instruksi-transfer"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <FileUp className="h-4 w-4" />
                Cara bayar
              </div>
              <div className="mt-6 space-y-3">
                {transferSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="grid gap-4 rounded-2xl border bg-card px-5 py-5 sm:grid-cols-[auto_1fr] shadow-sm"
                    >
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                          Langkah {index + 1}
                        </p>
                        <h3 className="mt-2 text-lg font-bold text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-3xl border bg-card p-6 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <FileUp className="h-4 w-4" />
                Unggah bukti transfer
              </div>
              <form className="mt-6 space-y-5" onSubmit={handleUpload}>
                <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-6 py-10 text-center">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-background text-primary shadow-sm border">
                    <FileUp className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-foreground">
                    Unggah bukti transfer
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Unggah bukti transfer untuk verifikasi.
                  </p>

                  <div className="mt-6 grid gap-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="block">
                      <span className="text-sm font-semibold text-foreground">
                        Paket yang dibeli
                      </span>
                      <select
                        className="mt-2 min-h-12 w-full rounded-xl border bg-background px-4 text-sm text-foreground outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        value={selectedPackageCode}
                        onChange={(event) => setSelectedPackageCode(event.target.value)}
                      >
                        {subscriptionPackageOptions.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div>
                      <input
                        ref={fileInputRef}
                        className="hidden"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        type="button"
                      >
                        Pilih file
                      </Button>
                    </div>
                  </div>

                  <p className="mt-5 text-sm font-medium text-muted-foreground">
                    {selectedFile
                      ? `File terpilih: ${selectedFile.name}`
                      : "Belum ada file dipilih."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {user
                      ? "Akun siap kirim bukti transfer."
                      : "Login untuk kirim bukti transfer."}
                  </p>
                </div>

                <Button
                  fullWidth
                  loading={isSubmitting}
                  loadingLabel="Mengirim bukti transfer..."
                  type="submit"
                  variant="primary"
                >
                  Kirim bukti transfer
                </Button>

                {submitError ? (
                  <p
                    className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                    role="alert"
                  >
                    {submitError}
                  </p>
                ) : null}

                {submitSuccess ? (
                  <p
                    className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
                    role="status"
                  >
                    {submitSuccess}
                  </p>
                ) : null}

                {refreshIssue ? (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-600">
                    {refreshIssue}
                  </p>
                ) : null}
              </form>

              <ul className="mt-6 space-y-3">
                {uploadChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {loadError ? (
                <p className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {loadError}
                </p>
              ) : null}

              {overview?.latestSubmission ? (
                <div className="mt-6 rounded-2xl border bg-muted/50 px-5 py-5 shadow-sm">
                  <p className="font-semibold text-foreground">
                    Pengiriman terakhir: {overview.latestSubmission.packageCode.replaceAll("_", " ")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Dikirim {new Date(overview.latestSubmission.createdAt).toLocaleString("id-ID")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Status: {overview.latestSubmission.status.replaceAll("_", " ")}
                  </p>
                  {overview.latestSubmission.reviewerNotes ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Catatan: {overview.latestSubmission.reviewerNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

export default SubscriptionPage;
