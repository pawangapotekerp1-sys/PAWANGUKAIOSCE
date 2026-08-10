import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, ArrowRight, Play, Clock } from "lucide-react";
import { Link } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
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
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Mode Latihan
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Pilih Mode Try Out
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              Sesuaikan dengan gaya belajar dan kesiapanmu hari ini untuk memaksimalkan persiapan UKAI.
            </p>
          </div>
        </div>

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
        <div className="grid gap-6 md:grid-cols-2 w-full">
          {/* Card 1: Unlimited */}
          <Card className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 border-border hover:border-primary/40 bg-card rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shrink-0">
                  <BookOpen className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-extrabold tracking-tight">Unlimited</CardTitle>
              </div>
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Latihan mandiri tanpa batas waktu. Fokus pada pemahaman materi dan blok yang spesifik.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 border-t-0 bg-transparent mt-auto">
              <Link
                {...getButtonStyleProps({
                  variant: "outline",
                  className: "w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all font-semibold rounded-xl py-3 text-base justify-center",
                })}
                to="/app/tryout/blocks"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                Pilih Unlimited <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>

          {/* Card 2: Terjadwal */}
          <Card className="group relative flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 border-border hover:border-primary/40 bg-card rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shrink-0">
                  <CalendarClock className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-extrabold tracking-tight">Terjadwal</CardTitle>
              </div>
              <CardDescription className="text-base leading-relaxed text-muted-foreground">
                Simulasi ujian sebenarnya dengan batasan waktu yang ketat dan saingan serentak.
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-4 border-t-0 bg-transparent mt-auto">
              <Link
                {...getButtonStyleProps({
                  variant: "outline",
                  className: "w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all font-semibold rounded-xl py-3 text-base justify-center",
                })}
                to="/app/scheduled-tryout"
              >
                <span className="absolute inset-0" aria-hidden="true" />
                Pilih Terjadwal <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ProductShell>
  );
}

export default TryoutSelectionPage;
