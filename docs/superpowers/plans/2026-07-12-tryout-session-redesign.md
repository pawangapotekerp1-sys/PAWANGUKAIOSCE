# Tryout Session Page Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task.

**Goal:** Overhaul the Try Out Session Page (`src/pages/app/tryout-session-page.tsx`) to match the Modern SaaS layout using `shadcn/ui` primitives, eliminating all remaining legacy `var(--color-*)` usages.

**Architecture:** 
The file is ~800 lines long, but the top 500 lines are purely React Hooks and state management logic. **We will NOT touch the state logic.** We will only modify the imports at the top and the `return ( ... )` JSX block at the bottom.

## Global Constraints

- Do not modify any `useEffect`, `useMutation`, `useQuery`, or standard functions (e.g., `goToQuestion`, `triggerSubmit`).
- Must completely remove `#f2e8c9` (cream), `var(--color-gold)`, `var(--color-outline)` and other legacy variables from the JSX.
- Replace `SurfacePanel` and `StatePanel` with Shadcn `Card`.
- Replace `MetricPill` with Shadcn `Badge`.
- Replace Phosphor icons (`ArrowLeft`, `ArrowRight`, `ClockCountdown`) with `lucide-react` icons (`ArrowLeft`, `ArrowRight`, `Timer`).
- Must pass `npm run build` after changes.

---

### Task 1: Rewrite the JSX block of Tryout Session Page

**Files:**
- Modify: `src/pages/app/tryout-session-page.tsx`

- [ ] **Step 1: Replace Imports**

Change line 2 from:
```tsx
import { ArrowLeft, ArrowRight, ClockCountdown } from "@phosphor-icons/react";
```
To:
```tsx
import { ArrowLeft, ArrowRight, Timer } from "lucide-react";
```

Change UI component imports (lines 18-22):
Remove `MetricPill`, `StatePanel`, `SurfacePanel`. Add `Card`, `Badge`.
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
```

- [ ] **Step 2: Replace JSX Return Block**

Replace everything from `return (` (around line 491) to the end of the file with the following Shadcn implementation:

```tsx
  return (
    <ProductShell
      brand={productShellMeta.brand}
      tierLabel={studentShell.tierLabel}
      navItems={studentShell.navItems}
    >
      <section id="tryout">
        <SectionHeading
          title="Sesi try out berjalan"
          description="Pilih nomor soal untuk berpindah dan kirim hasil saat selesai."
          eyebrow="Sesi aktif"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                aria-pressed={isQuestionNavHidden}
                onClick={() => {
                  startTransition(() => {
                    setIsQuestionNavHidden((current) => !current);
                  });
                }}
                size="sm"
                variant="outline"
              >
                {isQuestionNavHidden ? "Tampilkan navigasi soal" : "Sembunyikan navigasi soal"}
              </Button>
              <Badge variant={timerTone === "danger" ? "destructive" : "secondary"} className="text-sm py-1.5 px-3 flex items-center gap-1.5">
                <Timer className="w-4 h-4" />
                {timerLabel}
              </Badge>
            </div>
          }
        />

        {questionView === "ready" && createAttemptMutation.isPending ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Sesi try out sedang dimuat</CardTitle>
                <CardDescription>Sesi baru sedang disiapkan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && createAttemptMutation.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Sesi try out belum berhasil dibuka</CardTitle>
                <CardDescription>{createAttemptErrorMessage}</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && !attemptId && !templateId ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle>Belum ada sesi aktif</CardTitle>
                <CardDescription>Pilih sesi dari katalog untuk mulai.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Pilih sesi dari katalog
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionQuery.isLoading ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Soal try out sedang dimuat</CardTitle>
                <CardDescription>Soal sedang disiapkan.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "secondary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionQuery.isError ? (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Soal try out belum bisa dimuat</CardTitle>
                <CardDescription>Buka katalog lalu coba lagi.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Buka katalog lagi
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "ready" && sessionData?.view === "ready" && currentQuestion ? (
          <div className={["mt-6 grid gap-6", isQuestionNavHidden ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[18rem_minmax(0,1fr)]"].join(" ")}>
            {!isQuestionNavHidden ? (
              <Card className="shadow-sm h-fit">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardDescription className="font-semibold uppercase tracking-wider text-primary text-xs">
                    Navigasi Soal
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-4 gap-3">
                    {questions.map((question, index) => (
                      <SessionQuestionNavButton
                        key={question.id}
                        disabled={isQuestionNavigationDisabled}
                        number={index + 1}
                        onClick={() => goToQuestion(index)}
                        state={
                          index === currentIndex
                            ? "current"
                            : question.selectedOptionKey && question.isDoubtful
                              ? "doubtful"
                              : question.selectedOptionKey
                                ? "answered"
                                : "idle"
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="shadow-sm">
              {sessionAttempt?.status === "paused" && resumeMutation.isError ? (
                <div className="m-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-4" role="alert">
                  <p className="text-sm font-semibold text-destructive">{resumeErrorMessage}</p>
                  <Button
                    className="mt-3"
                    loading={resumeMutation.isPending}
                    loadingLabel="Mencoba lanjutkan sesi..."
                    onClick={() => {
                      resumeMutation.reset();
                      resumeRequestedAttemptIdRef.current = attemptId;
                      resumeMutation.mutate();
                    }}
                    variant="default"
                  >
                    Coba lanjutkan sesi
                  </Button>
                </div>
              ) : null}

              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {currentQuestion.blockLabel}
                    </Badge>
                    <CardTitle className="mt-4 text-2xl font-bold leading-tight">
                      Soal {currentIndex + 1} <span className="text-muted-foreground font-normal text-lg">dari {questions.length}</span>
                    </CardTitle>
                  </div>
                  <Badge variant={sessionData.attempt?.status === "submitted" ? "default" : "secondary"}>
                    {sessionData.attempt?.status === "submitted" ? "Sudah submit" : "Belum submit"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-base leading-relaxed">{currentQuestion.stem}</p>

                {currentQuestion.questionImageUrl ? (
                  <div className="mt-6 overflow-hidden rounded-xl border bg-muted/30 p-2">
                    <img
                      alt={`Gambar soal ${currentIndex + 1}`}
                      className="max-h-[26rem] w-full rounded-lg object-contain"
                      src={currentQuestion.questionImageUrl}
                    />
                  </div>
                ) : null}

                <div className="mt-8 grid gap-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = currentQuestion.selectedOptionKey === option.key;
                    return (
                      <SessionAnswerOptionButton
                        key={option.key}
                        disabled={isAttemptInteractionDisabled || isQuestionMutationPending}
                        onClick={() => selectAnswer(option.key)}
                        optionKey={option.key}
                        optionText={option.text}
                        selected={isSelected}
                      />
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-start">
                  <Button
                    className={
                      currentQuestion.isDoubtful
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:border-amber-500/60 hover:text-amber-700"
                        : "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 text-muted-foreground"
                    }
                    disabled={!hasSelectedAnswer || isAttemptInteractionDisabled || isQuestionMutationPending}
                    onClick={toggleDoubtful}
                    variant="outline"
                  >
                    {currentQuestion.isDoubtful ? "Batal ragu-ragu" : "Tandai ragu-ragu"}
                  </Button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t bg-muted/10 py-4 mt-4 rounded-b-xl">
                <Button
                  disabled={currentIndex === 0 || isQuestionNavigationDisabled}
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Sebelumnya
                </Button>

                {isLastQuestion ? (
                  <Button
                    disabled={isAttemptInteractionDisabled || isQuestionMutationPending}
                    loading={submitMutation.isPending}
                    loadingLabel="Mengirim hasil..."
                    onClick={() => { void triggerSubmit(); }}
                    variant="default"
                  >
                    Kirim hasil
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    disabled={isQuestionNavigationDisabled}
                    onClick={() => goToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
                    variant="default"
                  >
                    Selanjutnya
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardFooter>

              {submitError ? (
                <div className="px-6 pb-6">
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
                    {submitError}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        ) : questionView === "loading" ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-center">
                <CardTitle>Soal try out sedang dimuat</CardTitle>
                <CardDescription>Soal sedang disiapkan.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "secondary" })} to="/app/tryout">
                Kembali ke katalog try out
              </Link>
            </CardHeader>
          </Card>
        ) : questionView === "empty" ? (
          <Card className="mt-8 border-dashed shadow-sm bg-muted/30">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle>Belum ada soal untuk sesi ini</CardTitle>
                <CardDescription>Pilih sesi lain atau kembali nanti.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Pilih sesi lain
              </Link>
            </CardHeader>
          </Card>
        ) : (
          <Card className="mt-8 border-destructive/50 bg-destructive/5 shadow-sm">
            <CardHeader className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="text-center">
                <CardTitle className="text-destructive">Soal try out belum bisa dimuat</CardTitle>
                <CardDescription>Buka katalog lalu coba lagi.</CardDescription>
              </div>
              <Link {...getButtonStyleProps({ variant: "primary" })} to="/app/tryout">
                Buka katalog lagi
              </Link>
            </CardHeader>
          </Card>
        )}
      </section>
    </ProductShell>
  );
}

export default TryoutSessionPage;
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm run build`
Expected: PASS (builds successfully)

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/tryout-session-page.tsx
git commit -m "feat(ui): refactor tryout session page with shadcn components"
```
