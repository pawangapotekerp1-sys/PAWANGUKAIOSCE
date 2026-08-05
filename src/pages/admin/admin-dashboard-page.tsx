import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import AdminShell from "../../components/layout/admin-shell";
import { getButtonStyleProps } from "../../components/ui/button";
import { getAdminDashboardOverview } from "../../lib/api/admin-api";
import { usePreviewRouteState } from "../../lib/preview-route-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Loader2, AlertCircle, LineChart, Users, Clock, Info } from "lucide-react";
import {
  adminShellMeta,
  createAdminNavItems,
} from "../../mocks/admin-content";

function AdminDashboardPage() {
  const queueView = usePreviewRouteState("queueView");
  const overviewQuery = useQuery({
    queryKey: ["admin-dashboard-overview"],
    enabled: queueView === "ready",
    queryFn: () => getAdminDashboardOverview(),
  });
  const overview = overviewQuery.data;

  return (
    <AdminShell
      title={adminShellMeta.summaryTitle}
      description={adminShellMeta.summaryDescription}
      navItems={createAdminNavItems("/admin")}
    >
      {queueView === "ready" && overviewQuery.isLoading ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <div>
             <h3 className="text-lg font-semibold text-foreground">Ringkasan admin sedang dimuat</h3>
             <p className="text-sm">Data ringkasan admin sedang disiapkan.</p>
           </div>
           <div className="mt-2">
              <Link
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                to="/admin/payments"
              >
                Lihat pembayaran
              </Link>
           </div>
        </div>
      ) : queueView === "ready" && overviewQuery.isError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ringkasan admin belum tersedia</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">Ringkasan pembayaran dan aktivitas belum bisa dimuat.</p>
            <Link
              {...getButtonStyleProps({
                variant: "primary",
              })}
              to="/admin/payments"
            >
              Lihat pembayaran
            </Link>
          </AlertDescription>
        </Alert>
      ) : queueView === "ready" && overview ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overview.metrics.map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-6">
                    <Badge variant="secondary" className="uppercase tracking-wider">
                      {item.label}
                    </Badge>
                    <p className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
                      {item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  <LineChart className="h-4 w-4" />
                  Sorotan hari ini
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/50 px-4 py-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Users className="h-5 w-5 text-blue-600" />
                      <p className="font-semibold">{overview.userPulse.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {overview.userPulse.detail}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <p className="font-semibold">{overview.reviewPulse.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {overview.reviewPulse.detail}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {overview.paymentQueuePreview.length === 0 ? (
            <Card className="mt-6 border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Info className="h-10 w-10 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Belum ada pembayaran yang perlu dicek</h3>
                <p className="text-sm text-muted-foreground mb-4">Belum ada pembayaran baru yang menunggu verifikasi.</p>
                <Link
                  {...getButtonStyleProps({
                    variant: "primary",
                  })}
                  to="/admin/payments"
                >
                  Lihat pembayaran
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold leading-tight text-foreground">
                    Pembayaran yang perlu dicek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overview.paymentQueuePreview.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-muted/50 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.packageName} - {item.submittedAt}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-background">
                            {item.statusLabel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : queueView === "loading" ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-12 text-center text-muted-foreground border rounded-xl bg-card shadow-sm">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
           <div>
             <h3 className="text-lg font-semibold text-foreground">Ringkasan admin sedang dimuat</h3>
             <p className="text-sm">Ringkasan admin sedang disiapkan.</p>
           </div>
           <div className="mt-2">
              <Link
                {...getButtonStyleProps({
                  variant: "primary",
                })}
                to="/admin/payments"
              >
                Lihat pembayaran
              </Link>
           </div>
        </div>
      ) : queueView === "empty" ? (
        <Card className="mt-6 border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-10 w-10 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Belum ada pembayaran yang perlu dicek</h3>
            <p className="text-sm text-muted-foreground mb-4">Belum ada pembayaran baru yang perlu dicek.</p>
            <Link
              {...getButtonStyleProps({
                variant: "primary",
              })}
              to="/admin/payments"
            >
              Lihat pembayaran
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ringkasan admin belum bisa dimuat</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">Ringkasan admin belum bisa dimuat. Buka halaman pembayaran untuk lanjut mengecek.</p>
            <Link
              {...getButtonStyleProps({
                variant: "primary",
              })}
              to="/admin/payments"
            >
              Lihat pembayaran
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </AdminShell>
  );
}

export default AdminDashboardPage;
