import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button, { getButtonStyleProps } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import SectionHeading from "../../components/ui/section-heading";
import {
  findActiveScheduledAttemptForUser,
  listScheduledTryoutCatalogEntries,
} from "../../lib/api/scheduled-tryout-api";
import {
  formatScheduledDurationAsClock,
  mapScheduledCatalogEntriesToCards,
} from "../../lib/mappers/scheduled-tryout-mappers";
import { useSession } from "../../lib/auth/use-session";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

function ScheduledTryoutCatalogCardView({
  item,
}: {
  item: ReturnType<typeof mapScheduledCatalogEntriesToCards>[number];
}) {
  const isStartDisabled = item.isLocked;

  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <Badge variant="secondary" className="w-fit flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {item.subtitle}
        </Badge>
        <h3 className="mt-4 text-2xl font-semibold text-foreground">{item.title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {!isStartDisabled ? (
            <Link
              {...getButtonStyleProps({
                variant: "primary",
              })}
              to={`/app/scheduled-tryout/session?event=${item.id}`}
            >
              Mulai sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            {...getButtonStyleProps({
              variant: "outline",
            })}
            to={`/app/scheduled-tryout/leaderboard?event=${item.id}`}
          >
            Lihat leaderboard
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{item.questionCountLabel}</Badge>
          <Badge variant="secondary">{item.durationLabel}</Badge>
          <Badge variant="secondary">{item.attemptsRemainingLabel}</Badge>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{item.windowLabel}</p>
        {isStartDisabled ? (
          <>
            <Button
              disabled
              trailingIcon={<ArrowRight className="h-4 w-4" />}
              variant="secondary"
            >
              Mulai sesi
            </Button>
            <p className="text-sm leading-6 text-muted-foreground">
              Kesempatan event ini sudah habis.
            </p>
          </>
        ) : null}
      </div>
    </Card>
  );
}

function ScheduledTryoutCatalogPage() {
  const { user } = useSession();
  const studentShell = useStudentShell("/app/scheduled-tryout");
  const catalogQuery = useQuery({
    queryKey: ["scheduled-tryout-catalog", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listScheduledTryoutCatalogEntries({
      userId: user!.id,
    }),
  });
  const activeAttemptQuery = useQuery({
    queryKey: ["active-scheduled-tryout-attempt", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => findActiveScheduledAttemptForUser({
      userId: user!.id,
    }),
  });
  const cards = mapScheduledCatalogEntriesToCards(catalogQuery.data ?? []);
  const activeAttempt = activeAttemptQuery.data;
  const remainingCards = activeAttempt
    ? cards.filter((item) => item.id !== activeAttempt.eventId)
    : cards;

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="scheduled-tryout">
        <SectionHeading
          title="Try Out Terjadwal"
          description="Pilih sesi yang sedang dibuka atau lanjutkan sesi yang tertunda."
          eyebrow="Event aktif"
        />

        <div className="mt-6">
          {catalogQuery.isPending ? (
            <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Daftar sesi sedang dimuat</h3>
                <p>Sesi terjadwal sedang disiapkan.</p>
              </div>
            </div>
          ) : catalogQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Daftar sesi belum bisa dimuat</AlertTitle>
              <AlertDescription>Coba lagi sebentar.</AlertDescription>
            </Alert>
          ) : cards.length === 0 ? (
            <Alert className="border-dashed">
              <AlertTitle>Belum ada sesi aktif</AlertTitle>
              <AlertDescription>Belum ada sesi yang bisa diikuti saat ini.</AlertDescription>
            </Alert>
          ) : activeAttemptQuery.isPending ? (
            <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Daftar sesi sedang dimuat</h3>
                <p>Sesi terjadwal sedang disiapkan.</p>
              </div>
            </div>
          ) : (
            <>
              {activeAttempt ? (
                <Card className="mb-6 p-6 sm:p-7 bg-accent text-accent-foreground">
                  <Badge variant="outline" className="w-fit bg-background text-foreground">
                    {activeAttempt.status === "paused" ? "Lanjutkan sesi" : "Sesi masih berjalan"}
                  </Badge>
                  <h3 className="mt-4 text-3xl font-semibold text-foreground">
                    {activeAttempt.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Lanjutkan sesi yang tertunda tanpa mulai dari awal.
                  </p>
                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary">
                        {activeAttempt.answeredCount} dari {activeAttempt.totalQuestions} soal terjawab
                      </Badge>
                      <Badge variant="secondary">
                        Timer sesi {formatScheduledDurationAsClock(activeAttempt.timeRemainingSeconds)}
                      </Badge>
                    </div>
                    <Link
                      {...getButtonStyleProps({
                        variant: "primary",
                      })}
                      to={`/app/scheduled-tryout/session?attempt=${activeAttempt.attemptId}`}
                    >
                      <span className="flex items-center gap-2">
                        Lanjutkan sesi
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>
                </Card>
              ) : null}

              {remainingCards.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {remainingCards.map((item) => (
                    <ScheduledTryoutCatalogCardView key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </ProductShell>
  );
}

export default ScheduledTryoutCatalogPage;
