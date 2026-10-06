import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, ArrowRight, Play, Clock, Infinity as InfinitySymbol } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { FeatureCard } from "../../components/ui/feature-card";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { useSession } from "../../lib/auth/use-session";
import { findActiveAttemptForUser } from "../../lib/api/tryout-api";
import { Navigate } from "react-router";

function TryoutSelectionPage() {
  const studentShell = useStudentShell("/app/tryout-selection");
  const session = useSession();
  const userId = session?.user?.id;

  const { data: activeAttempt, isLoading } = useQuery({
    queryKey: ["activeAttempt", userId],
    queryFn: () => {
      if (!userId) return null;
      return findActiveAttemptForUser({ userId });
    },
    enabled: !!userId,
  });

  if (studentShell.role === "osce_pro") {
    return <Navigate to="/app/scheduled-tryout" replace />;
  }

  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <div className="flex flex-col gap-8 w-full py-4">

        {/* Active Attempt Banner */}
        {isLoading ? (
          <div className="w-full h-[120px] rounded-2xl border bg-card text-card-foreground shadow-xs animate-pulse"></div>
        ) : activeAttempt && (activeAttempt.status === "in_progress" || activeAttempt.status === "paused") ? (
          <Card className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-card border-primary/30 relative overflow-hidden shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Sesi Try Out Sedang Berlangsung</CardTitle>
                  <CardDescription className="text-base mt-1 text-foreground/80 font-medium">
                    {activeAttempt.title}
                  </CardDescription>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Progres Sesi</div>
                <div className="text-lg font-bold text-foreground">
                  {activeAttempt.answeredCount} <span className="text-muted-foreground text-sm font-normal">/ {activeAttempt.totalQuestions} Soal</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link
                {...getButtonStyleProps({ className: "w-full sm:w-auto font-semibold shadow-sm", variant: "primary" })}
                to={`/app/tryout/session?attempt=${activeAttempt.attemptId}`}
              >
                Lanjutkan Sesi <Play className="ml-2 h-4 w-4 fill-current inline-block" />
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {/* 2-Column Card Grid */}
        <div className="grid gap-6 md:grid-cols-2 w-full mt-6">
          <FeatureCard
            title="Unlimited"
            description="Latihan mandiri tanpa batas waktu. Fokus pada pemahaman materi dan blok yang spesifik tanpa tekanan."
            icon={InfinitySymbol}
            href="/app/tryout/blocks"
            actionLabel="Pilih Unlimited"
            colorPreset="cyan"
          />

          <FeatureCard
            title="Terjadwal"
            description="Simulasi ujian sebenarnya dengan batasan waktu yang ketat dan saingan serentak se-nasional."
            icon={CalendarClock}
            href="/app/scheduled-tryout"
            actionLabel="Pilih Terjadwal"
            colorPreset="blue"
          />
        </div>
      </div>
    </ProductShell>
  );
}

export default TryoutSelectionPage;
