# Design Specification: Interactive 3D Flashcard Deck & Recapitulation Redesign

- **Date:** 2026-10-24
- **Topic:** Redesign of Flashcard Viewer, Recall Dock Controls, Status Badges, Micro-Animations, and End-of-Deck Recapitulation
- **Status:** Approved by User

## 1. Overview & Problem Statement
The previous Flashcard interface (`FlashCardViewer`, `FlashCardRecallControls`, and `FlashCardDeckPage`) was static, plain, and separated card navigation from recall rating ("Mudah", "Sedang", "Sulit") without visual feedback, status badges, or an end-of-session summary.

The goal is to transform the Flashcard experience to match the layout and interaction flow of the 3 reference images while grounding the color palette and typography in the web application's **Clinical Cyan & Slate** design system (`shadcn/ui` + `framer-motion`):
1. **Top Navigation Bar:** A pill-shaped `< Kembali` button (`rounded-full`) returning to `/app/flash-cards`, paired with compact subtopic context.
2. **Interactive 3D Flip Card (`FlashCardViewer`):**
   - **Header Row inside Card:** Card counter (`1/50`) on the left, dynamic status badge (`Belum dijawab` in amber/yellow, `Benar` in emerald/green, `Salah` in rose/red) centered at the top, and a `DropdownMenu` (`⋮`) on the right for quick session actions (Shuffle, Reset session, View Recap).
   - **Front Surface (Prompt/Pertanyaan):** Airy clinical sky-cyan pastel surface (`from-cyan-50 via-sky-50 to-cyan-100/80`, border `border-cyan-200/80`) with bold dark clinical slate typography (`#0f172a` / `#0f2e2f`) and bottom centered trigger `👁 Lihat jawaban`.
   - **Back Surface (Jawaban):** High-contrast deep clinical cyan-teal gradient (`from-[#0891b2] via-[#0e7490] to-[#164e63]`, matching the web's primary `#06b6d4` / `#0891b2` accent tone) with `JAWABAN` eyebrow, crisp white answer text, optional clinical note/explanation toggle if present, and bottom centered trigger `👁 Lihat pertanyaan`.
3. **Bottom Control Dock:**
   - 4 centered circular/pill controls below the card:
     - Previous button (`<`)
     - Wrong / Salah button (`✕ [wrongCount]`) with rose accent
     - Correct / Benar button (`[correctCount] ✓`) with emerald accent
     - Next button (`>`)
4. **Micro-Animations (`framer-motion`):**
   - Smooth 3D `rotateY` card flip animation.
   - Tactile feedback when selecting **Benar (✓)** (emerald ring glow + scale pop + badge spring transition) or **Salah (✕)** (horizontal shake + rose ring pulse + badge spring transition).
   - Auto-advance to the next card after `~400ms`, or automatically transition to the Recapitulation screen when the final card is answered.
5. **End-of-Session Recapitulation (`FlashCardRecapCard`):**
   - Displays overall mastery percentage, total counts for **Benar**, **Salah**, and **Belum dijawab**, a per-card status review list, and action buttons: **Ulangi Kartu Salah**, **Ulangi Semua Kartu**, and **Kembali ke Daftar Materi**.
   - Every new deck visit starts a fresh study session (`Belum dijawab` from 0) while still persisting each answer to `student_flashcard_progress` (`Benar` → `"easy"`, `Salah` → `"hard"`).

## 2. Color System & Visual Tokens (Aligned with Web Tone)
- **Web Primary Accent:** `--color-clinical-accent` (`#06b6d4` / `cyan-500`), `--color-clinical-accent-dark` (`#0891b2` / `cyan-600`).
- **Front Card Surface:** `bg-gradient-to-br from-[#e0f7fa] via-[#ebf9fc] to-[#d0f0f7]` with `border-cyan-200/90` and `shadow-[0_20px_50px_rgba(8,145,178,0.10)]`.
- **Front Card Typography:** Question text in `#0f172a` (`text-slate-900`), counter in `text-cyan-900/60`, footer action `Lihat jawaban` in `text-cyan-800 hover:text-cyan-950`.
- **Back Card Surface:** `bg-gradient-to-br from-[#0e7490] via-[#155e75] to-[#083344]` (`cyan-700` → `cyan-800` → `cyan-950`) with `border-cyan-400/30` and `shadow-[0_24px_60px_rgba(8,51,68,0.28)]`.
- **Back Card Typography:** Eyebrow `JAWABAN` in `text-cyan-200/90`, answer text in `#ffffff`, footer action `Lihat pertanyaan` in `text-cyan-100/90 hover:text-white`.
- **Status Pill Badges (Top Center of Card):**
  - `unanswered` ("Belum dijawab"): `bg-amber-400 text-amber-950 border-amber-500/20 shadow-xs`
  - `correct` ("Benar"): `bg-emerald-500 text-white border-emerald-600/20 shadow-xs`
  - `wrong` ("Salah"): `bg-rose-500 text-white border-rose-600/20 shadow-xs`

## 3. Component Architecture

### 3.1 `FlashCardViewer` (`src/components/flash-cards/flash-card-viewer.tsx`)
Handles the interactive 3D card, top header bar inside the card, bottom control dock (`<`, `✕ count`, `count ✓`, `>`), keyboard shortcuts (`Space`/`Enter` to flip, `ArrowLeft`/`ArrowRight` to navigate), and transition to the Recapitulation screen.

Props:
```typescript
export type FlashCardAnswerStatus = "unanswered" | "correct" | "wrong";

export type FlashCardViewerCard = {
  id: string;
  frontText: string;
  backText: string;
  sortOrder: number;
  savedDifficulty: "easy" | "medium" | "hard" | null;
  lastReviewedAt: string | null;
};

export type FlashCardViewerProps = {
  cards: FlashCardViewerCard[];
  subtopicTitle?: string;
  subtopicSummary?: string;
  backHref?: string;
  isSaving?: boolean;
  onCardChange?: (card: FlashCardViewerCard) => void;
  onRateCard?: (card: FlashCardViewerCard, status: "correct" | "wrong") => void | Promise<void>;
};
```

### 3.2 `FlashCardDeckPage` (`src/pages/app/flash-card-deck-page.tsx`)
Loads the published flashcard deck via `getPublishedFlashCardDeck`, renders `FlashCardViewer`, and persists student ratings via `saveStudentFlashCardDifficulty` (`"correct"` → `"easy"`, `"wrong"` → `"hard"`).

## 4. Verification Plan
- Unit tests for `FlashCardViewer` verifying:
  - Initial `Belum dijawab` badge and `1/N` counter rendering.
  - Flipping between front (`Lihat jawaban`) and back (`Lihat pertanyaan`).
  - Selecting **Benar (✓)** updates the top badge to `Benar`, increments the correct counter, invokes `onRateCard`, and advances to the next card.
  - Selecting **Salah (✕)** updates the top badge to `Salah`, increments the wrong counter, invokes `onRateCard`, and advances to the next card.
  - Displaying the **Rekapitulasi Hasil Total** screen when all cards are answered or when navigating past the last card, plus filtering wrong cards via **Ulangi Kartu Salah** or resetting via **Ulangi Semua Kartu**.
- Page integration tests in `FlashCardDeckPage.test.tsx`.
- Full test suite and production build (`npm run build`) verification.
