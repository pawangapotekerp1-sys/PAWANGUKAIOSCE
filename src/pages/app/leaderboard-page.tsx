import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, AlertCircle, Info, Trophy, Crown, Medal, Award, Clock } from "lucide-react";
import { Navigate } from "react-router";
import ProductShell from "../../components/layout/product-shell";
import Button from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent } from "../../components/ui/card";
import {
  getLeaderboard,
  type LeaderboardCategory,
} from "../../lib/api/leaderboard-api";
import { productShellMeta } from "../../mocks/student-dashboard";
import { useStudentShell } from "./use-student-shell";

const CATEGORY_OPTIONS: Array<{
  id: LeaderboardCategory;
  label: string;
}> = [
  { id: "overall", label: "Overall" },
  { id: "clinical_science", label: "Clinical Science" },
  {
    id: "social_behavior_administrative_pharmacy",
    label: "Social, Behavioral & Administrative Pharmacy",
  },
  { id: "pharmaceutical_science", label: "Pharmaceutical Science" },
];

function formatScore(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatDuration(value: number | null) {
  if (value === null) {
    return "-";
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function getRankBadgeStyle(rank: number) {
  if (rank === 1) {
    return {
      bg: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40",
      card: "border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-card shadow-md",
      icon: (
        <div className="flex flex-col items-center justify-center">
          <Crown className="h-4 w-4 text-amber-500 -mb-0.5" />
          <span className="text-sm font-extrabold">1</span>
        </div>
      ),
    };
  }
  if (rank === 2) {
    return {
      bg: "bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/40",
      card: "border-slate-400/30 bg-gradient-to-r from-slate-400/10 via-card to-card shadow-sm",
      icon: (
        <div className="flex flex-col items-center justify-center">
          <Medal className="h-4 w-4 text-slate-400 -mb-0.5" />
          <span className="text-sm font-extrabold">2</span>
        </div>
      ),
    };
  }
  if (rank === 3) {
    return {
      bg: "bg-amber-700/20 text-amber-800 dark:text-amber-300 border-amber-700/40",
      card: "border-amber-700/30 bg-gradient-to-r from-amber-700/10 via-card to-card shadow-sm",
      icon: (
        <div className="flex flex-col items-center justify-center">
          <Medal className="h-4 w-4 text-amber-700 -mb-0.5" />
          <span className="text-sm font-extrabold">3</span>
        </div>
      ),
    };
  }
  return {
    bg: "bg-primary/10 text-primary border-primary/20",
    card: "border-border/80 bg-card hover:border-primary/40",
    icon: <span className="text-xl font-bold">{rank}</span>,
  };
}

function LeaderboardPage() {
  const studentShell = useStudentShell("/app/leaderboard");
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>("overall");
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", activeCategory],
    queryFn: () =>
      getLeaderboard({
        category: activeCategory,
      }),
  });
  const rows = (leaderboardQuery.data ?? []).slice(0, 10);

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
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              Peringkat Nasional
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 text-foreground">
              Leaderboard Performa
            </h1>
            <p className="text-base text-muted-foreground mt-2 max-w-2xl">
              Pantau 10 besar untuk melihat posisi dan akurasi skor terbaik di setiap kategori kompetensi.
            </p>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border/20">
          {CATEGORY_OPTIONS.map((option) => {
            const isActive = activeCategory === option.id;
            return (
              <Button
                key={option.id}
                onClick={() => setActiveCategory(option.id)}
                size="sm"
                variant={isActive ? "primary" : "outline"}
                className={`rounded-full px-5 py-2 text-xs font-semibold transition-all ${
                  isActive ? "shadow-md shadow-primary/20" : "hover:bg-accent"
                }`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        {/* Content Section */}
        {leaderboardQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center text-muted-foreground border rounded-2xl bg-card/60 shadow-sm backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Peringkat sedang disiapkan.</p>
          </div>
        ) : leaderboardQuery.isError ? (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Leaderboard belum bisa dimuat</AlertTitle>
            <AlertDescription>Coba ganti kategori atau muat ulang.</AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <Alert className="border-border/80 bg-card/60">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Leaderboard masih kosong</AlertTitle>
            <AlertDescription>Belum ada peringkat di kategori ini.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-3.5 w-full">
            {rows.map((row) => {
              const rankStyle = getRankBadgeStyle(row.rank);

              return (
                <Card
                  key={`${row.userId}-${row.attemptId}`}
                  data-testid={`leaderboard-row-${row.userId}`}
                  className={`overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${rankStyle.card}`}
                >
                  <CardContent className="p-5">
                    <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${rankStyle.bg} shrink-0`}>
                          {rankStyle.icon}
                        </div>
                        <div>
                          <p className="text-lg font-extrabold tracking-tight text-foreground">{row.alias}</p>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            Waktu terbaik {formatDuration(row.timeUsedSeconds)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Badge 
                          variant="outline" 
                          className="font-mono text-xs font-bold px-3 py-1 bg-primary/5 text-primary border-primary/20"
                        >
                          <Award className="h-3.5 w-3.5 mr-1 inline-block" />
                          Skor {formatScore(row.score)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-semibold text-muted-foreground px-3 py-1">
                          {CATEGORY_OPTIONS.find((item) => item.id === row.category)?.label ?? "Kategori"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProductShell>
  );
}

export default LeaderboardPage;
