import { useState } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import Button from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { useSession } from "../lib/auth/use-session";
import { logout } from "../lib/api/auth-api";

export default function AccountSuspendedPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/auth/login", { replace: true });
    } catch {
      setIsLoggingOut(false);
    }
  };

  const displayName = (user?.user_metadata?.full_name as string) || (user?.email?.split("@")[0]) || "Siswa";
  const email = user?.email || "";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <Card className="w-full max-w-md border-amber-200 shadow-lg dark:border-amber-900/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Akun Dinonaktifkan
          </CardTitle>
          <CardDescription className="text-base font-medium text-slate-700 dark:text-slate-300">
            Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg bg-slate-100 p-3.5 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <div className="flex justify-between py-1">
              <span className="font-medium text-slate-500">Nama Pengguna:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{displayName}</span>
            </div>
            {email && (
              <div className="flex justify-between border-t border-slate-200/80 py-1 dark:border-slate-800">
                <span className="font-medium text-slate-500">Email:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200/80 py-1 dark:border-slate-800">
              <span className="font-medium text-slate-500">Status Akses:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">Menunggu Pelunasan</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full text-slate-700 dark:text-slate-200"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Keluar dari Akun
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
