import { ArrowRight, Info, Lock, Send, UserCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import Button from "../../components/ui/button";
import { loginWithPassword, requestPasswordReset } from "../../lib/api/auth-api";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldClassName = "h-12 bg-background border-border focus-visible:ring-primary";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await loginWithPassword({ email, password });
      navigate("/app/tryout-selection", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Masuk belum berhasil. Coba lagi sebentar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex w-full bg-background font-sans">
      {/* Left Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Badge variant="secondary" className="w-fit flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20">
              <UserCircle className="w-4 h-4" /> Masuk akun
            </Badge>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground font-display">
              Selamat Datang
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Silahkan masukan email dan kata sandi anda untuk lanjut
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-foreground font-medium">
                Email
              </Label>
              <Input
                id="login-email"
                name="email"
                placeholder="pawang@gmail.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground font-medium">
                Kata sandi
              </Label>
              <Input
                id="login-password"
                name="password"
                placeholder="Masukkan kata sandi"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClassName}
              />
              <div className="flex justify-end mt-2">
                <a
                  href="https://wa.me/6281313683288?text=Assalamualaikum%20A%20saya%20tidak%20bisa%20login%20di%20web%20pawangapt.%20Mohon%20bantuannya"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-primary hover:text-primary/80 hover:underline transition-all py-1.5 px-1"
                >
                  <Send className="w-4 h-4" />
                  Lupa password
                </a>
              </div>
            </div>

            <Button
              fullWidth
              leadingIcon={<Lock className="w-4 h-4" />}
              loading={isSubmitting}
              loadingLabel="Memproses masuk..."
              size="lg"
              trailingIcon={<ArrowRight className="w-4 h-4" />}
              type="submit"
              variant="primary"
              className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground border-transparent font-semibold shadow-sm"
            >
              Masuk dengan email
            </Button>
            
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </div>
      </div>

      {/* Right Side: Cyan Gradient */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary to-primary/80 items-center justify-center relative overflow-hidden">
        {/* Soft lighting effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_rgba(0,0,0,0.15),_transparent_50%)]" />
        
        {/* Elegant Abstract Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10 text-primary-foreground max-w-2xl p-12 text-center flex flex-col items-center">
          <div className="w-20 h-20 mb-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <svg
              className="w-12 h-12 text-white"
              viewBox="0 0 100 100"
              fill="currentColor"
              aria-label="Simbol Cawan Hygieia Apoteker"
            >
              {/* Chalice / Cawan Farmasi */}
              <path d="M 4 36 L 96 36 C 82 44 68 56 53 56 L 53 82 C 60 88 68 91 76 95 L 24 95 C 32 91 40 88 47 82 L 47 56 C 32 56 18 44 4 36 Z" />
              
              {/* Ular Hygieia (High S-Curve & Head Silhouette) */}
              <path d="M 52 22 L 46 14 C 44 11 48 7 53 7 C 60 7 67 12 64 21 C 60 30 42 28 36 21 C 30 13 36 2 52 2 C 73 2 80 14 75 25 C 70 34 60 38 52 38 C 42 38 38 43 43 52 C 48 61 68 58 72 67 C 76 76 68 86 52 86 C 40 86 33 79 33 72 C 33 64 45 64 49 68 C 52 71 49 75 45 75 C 43 75 42 73 44 71 C 45 70 47 70 47 71 C 47 72 46 72 45 72 C 44 72 44 71 45 70 C 46 69 51 68 53 72 C 55 77 50 81 44 81 C 36 81 37 70 45 66 C 53 62 65 62 61 51 C 57 40 47 40 53 31 C 59 23 65 20 65 14 C 65 10 60 8 55 8 C 51 8 49 10 50 12 L 52 22 Z" />
            </svg>
          </div>
          <h2 className="text-5xl font-bold mb-6 font-display tracking-tight text-white shadow-sm">Pawang Apoteker</h2>
          <p className="text-lg opacity-95 font-sans font-medium leading-relaxed text-white/90 whitespace-nowrap">
            Sistem pembelajaran terpadu untuk siswa PSPPA
          </p>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
