import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2 } from "lucide-react";

import AdminShell from "../../components/layout/admin-shell";
import Button from "../../components/ui/button";




import { bootstrapProfile, logout } from "../../lib/api/auth-api";
import {
  getPaymentProofPreviewUrl,
  listPaymentSubmissionsForReview,
  reviewPaymentSubmission,
  type PaymentSubmission,
} from "../../lib/api/subscription-api";
import { useSession } from "../../lib/auth/use-session";
import { createAdminNavItems, adminShellMeta } from "../../mocks/admin-content";

function PaymentsPage() {
  const { status: sessionStatus, user } = useSession();
  const [payments, setPayments] = useState<PaymentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [actionSubmissionId, setActionSubmissionId] = useState<string | null>(null);
  const [previewSubmissionId, setPreviewSubmissionId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  function normalizeReviewMessage(message: string) {
    return message.replace(/^Submission pembayaran ini/i, "Pembayaran ini");
  }

  useEffect(() => {
    let isCancelled = false;

    async function hydrateQueue() {
      if (sessionStatus === "loading") {
        setIsLoading(true);
        return;
      }

      if (sessionStatus === "anonymous" || !user) {
        setPayments([]);
        setLoadError(null);
        setActionError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setActionError(null);

      try {
        const profile = await bootstrapProfile({
          user,
        });

        if (profile.role !== "admin") {
          throw new Error("Halaman ini hanya tersedia untuk admin.");
        }

        const nextPayments = await listPaymentSubmissionsForReview();

        if (!isCancelled) {
          setPayments(nextPayments);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Daftar pembayaran belum bisa dimuat.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void hydrateQueue();

    return () => {
      isCancelled = true;
    };
  }, [sessionStatus, user]);

  async function handleOpenProof(submission: PaymentSubmission) {
    setPreviewSubmissionId(submission.id);
    setActionError(null);

    try {
      const signedUrl = await getPaymentProofPreviewUrl({
        paymentProofPath: submission.paymentProofPath,
      });

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Bukti transfer belum bisa dibuka.",
      );
    } finally {
      setPreviewSubmissionId(null);
    }
  }

  async function handleReview(submission: PaymentSubmission, decision: "approve" | "reject") {
    if (!user) {
      return;
    }

    if (submission.status !== "pending_review") {
      setActionError("Pembayaran ini sudah direview. Muat ulang antrean untuk melihat status terbaru.");
      return;
    }

    setActionSubmissionId(submission.id);
    setFeedbackMessage(null);
    setActionError(null);

    try {
      await reviewPaymentSubmission({
        actor: {
          id: user.id,
          role: "admin",
        },
        submissionId: submission.id,
        decision,
        notes: reviewNotes[submission.id],
      });

      const nextPayments = await listPaymentSubmissionsForReview();
      setPayments(nextPayments);
      setFeedbackMessage(
        decision === "approve"
          ? "Pembayaran disetujui."
          : "Pembayaran ditolak. Minta pengguna unggah ulang jika perlu.",
      );
    } catch (error) {
      let nextActionError =
        error instanceof Error
          ? normalizeReviewMessage(error.message)
          : "Aksi review belum berhasil.";

      if (error instanceof Error && /sudah.*review/i.test(error.message)) {
        try {
          const nextPayments = await listPaymentSubmissionsForReview();
          setPayments(nextPayments);
        } catch (recoveryError) {
          nextActionError = `${normalizeReviewMessage(error.message)} Antrean terbaru juga belum berhasil dimuat. Muat ulang antrean untuk melihat status terbaru.`;

          if (!(recoveryError instanceof Error)) {
            nextActionError = `${normalizeReviewMessage(error.message)} Antrean terbaru belum berhasil dimuat. Muat ulang antrean untuk melihat status terbaru.`;
          }
        }
      }

      setActionError(nextActionError);
    } finally {
      setActionSubmissionId(null);
    }
  }

  return (
    <AdminShell
      title="Verifikasi pembayaran"
      description="Tinjau bukti transfer dan putuskan dari satu halaman."
      navItems={createAdminNavItems("/admin/payments")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary">Menunggu review</Badge>
          <Badge variant="default">Siap diproses</Badge>
        </div>
        {user ? (
          <div className="flex items-center gap-2">

            <Button
              onClick={() => void logout()}
              size="sm"
              variant="outline"
            >
              Keluar
            </Button>
          </div>
        ) : null}
      </div>

      {feedbackMessage ? (
        <p className="mt-6 rounded-[1.2rem] border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground">
          {feedbackMessage}
        </p>
      ) : null}

      {actionError ? (
        <p
          className="mt-6 rounded-[1.2rem] border border-border bg-muted px-4 py-3 text-sm font-medium text-foreground"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex flex-col items-center justify-center p-8 space-y-4">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  <p className="text-sm text-muted-foreground">Daftar pembayaran sedang disiapkan.</p>
</div>
      ) : loadError ? (
        <Alert variant="destructive" className="mt-6">
  <AlertTitle>Daftar pembayaran belum bisa dimuat</AlertTitle>
  <AlertDescription>{loadError}</AlertDescription>
</Alert>
      ) : payments.length === 0 ? (
        <Alert className="mt-6">
  <AlertTitle>Belum ada pembayaran</AlertTitle>
  <AlertDescription>Belum ada pembayaran baru.</AlertDescription>
</Alert>
      ) : (
        <div className="mt-6 space-y-3">
          {payments.map((item) => {
            const isPendingReview = item.status === "pending_review";

            return (
              <Card key={item.id} className="px-5 py-5" >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        Pengguna {item.userId}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {item.packageCode.replaceAll("_", " ")} - dikirim{" "}
                        {new Date(item.createdAt).toLocaleString("id-ID")}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        File bukti: {item.proofFileName ?? "Tanpa nama file"}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        Lokasi file: {item.paymentProofPath}
                      </p>
                    </div>
                    <Badge variant={item.status === "pending_review" ? "secondary" : "default"}>
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">
                      Catatan
                    </span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-[1.15rem] border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition duration-200 ease-in-out focus-visible:border-primary focus-visible:bg-white"
                      placeholder="Tambahkan catatan bila perlu."
                      value={reviewNotes[item.id] ?? ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      loading={previewSubmissionId === item.id}
                      loadingLabel="Menyiapkan bukti..."
                      onClick={() => void handleOpenProof(item)}
                      size="sm"
                      variant="outline"
                    >
                      Lihat bukti
                    </Button>
                    <Button
                      disabled={actionSubmissionId === item.id || !isPendingReview}
                      onClick={() => void handleReview(item, "approve")}
                      size="sm"
                      variant="primary"
                    >
                      {actionSubmissionId === item.id ? "Memproses..." : "Setujui pembayaran"}
                    </Button>
                    <Button
                      disabled={actionSubmissionId === item.id || !isPendingReview}
                      onClick={() => void handleReview(item, "reject")}
                      size="sm"
                      variant="destructive"
                    >
                      {actionSubmissionId === item.id ? "Memproses..." : "Tolak & minta ulang"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

export default PaymentsPage;
