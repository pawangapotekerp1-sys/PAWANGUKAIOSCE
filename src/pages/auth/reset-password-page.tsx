import { ArrowRight, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import Button from "../../components/ui/button";
import { updatePasswordAfterRecovery } from "../../lib/api/auth-api";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldClassName = "h-12 bg-background border-border focus-visible:ring-primary mt-2";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (nextPassword.length < 8) {
      setErrorMessage("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi belum cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePasswordAfterRecovery({
        nextPassword,
      });
      setSuccessMessage("Kata sandi baru tersimpan. Silakan masuk kembali.");
      setTimeout(() => {
        navigate("/auth/login", {
          replace: true,
        });
      }, 1000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kata sandi baru belum berhasil disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-4 pt-8 px-8">
          <Badge variant="secondary" className="w-fit flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20">
            <Lock className="w-4 h-4" /> Atur ulang kata sandi
          </Badge>
          <div>
            <CardTitle className="text-3xl font-bold leading-tight tracking-tight text-foreground font-display">
              Buat kata sandi baru
            </CardTitle>
            <CardDescription className="mt-2 text-base text-muted-foreground">
              Masukkan kata sandi baru untuk menyelesaikan aktivasi atau pemulihan akun.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label
                className="text-foreground font-medium"
                htmlFor="reset-password-next"
              >
                Kata sandi baru
              </Label>
              <Input
                className={fieldClassName}
                id="reset-password-next"
                name="nextPassword"
                placeholder="Masukkan kata sandi baru"
                type="password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
            </div>

            <div>
              <Label
                className="text-foreground font-medium"
                htmlFor="reset-password-confirm"
              >
                Konfirmasi kata sandi baru
              </Label>
              <Input
                className={fieldClassName}
                id="reset-password-confirm"
                name="confirmPassword"
                placeholder="Ulangi kata sandi baru"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <Button
              fullWidth
              leadingIcon={<Lock className="w-4 h-4" />}
              loading={isSubmitting}
              loadingLabel="Menyimpan kata sandi..."
              size="lg"
              trailingIcon={<ArrowRight className="w-4 h-4" />}
              type="submit"
              variant="primary"
              className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground border-transparent font-semibold shadow-sm mt-2"
            >
              Simpan kata sandi
            </Button>

            {errorMessage ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
            
            {successMessage ? (
              <Alert variant="default" className="border-green-500/30 bg-green-500/10 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default ResetPasswordPage;
