# Interactive 3D Flashcard Deck & Recapitulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Flashcard study experience with a 3D flip card, top status badges (`Belum dijawab`, `Benar`, `Salah`), tactile bottom dock controls (`<`, `✕ count`, `count ✓`, `>`), micro-animations, and an end-of-deck Recapitulation screen using `shadcn/ui` and `framer-motion` aligned with the web's Clinical Cyan/Teal & Slate palette.

**Architecture:** `FlashCardViewer` manages the active study deck, 3D card flip state, per-card answer statuses (`unanswered` | `correct` | `wrong`), tactile animations, options dropdown (`⋮`), and the inline Recapitulation view when all cards are completed or when the user finishes the deck. `FlashCardDeckPage` integrates `FlashCardViewer` with the `< Kembali` navigation header and persists ratings to Supabase (`saveStudentFlashCardDifficulty`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `shadcn/ui` (`Card`, `Badge`, `Button`, `DropdownMenu`), `framer-motion`, `lucide-react`, Vitest, React Testing Library.

## Global Constraints
- Colors must match the web's Clinical Cyan/Teal (`#06b6d4` / `#0891b2` / `#0e7490`) & Slate (`#0f172a` / `#f1f5f9`) palette.
- Top center of the card must display status badges: `Belum dijawab` (amber), `Benar` (emerald), or `Salah` (rose).
- Clicking `Benar (✓)` or `Salah (✕)` triggers tactile animation, updates the card status badge and live counters, saves progress (`"easy"` for Benar, `"hard"` for Salah), and auto-advances after `~400ms` (or opens the Recapitulation screen on the final card).
- End-of-session Recapitulation screen displays total mastery score, counts for Benar / Salah / Belum dijawab, per-card breakdown, and buttons to retry wrong cards or retry all cards.

---

### Task 1: Redesign `FlashCardViewer` with 3D Flip, Status Badges, Bottom Dock & Recapitulation

**Files:**
- Modify: `src/components/flash-cards/flash-card-viewer.tsx`
- Test: `src/components/flash-cards/flash-card-viewer.test.tsx`

- [x] **Step 1: Write unit tests for the redesigned `FlashCardViewer`**
- [x] **Step 2: Implement the 3D flip card, status badges, bottom dock, and recapitulation view in `src/components/flash-cards/flash-card-viewer.tsx`**
- [x] **Step 3: Run `npx vitest run src/components/flash-cards/flash-card-viewer.test.tsx`**

---

### Task 2: Integrate Redesigned `FlashCardViewer` in `FlashCardDeckPage`

**Files:**
- Modify: `src/pages/app/flash-card-deck-page.tsx`
- Test: `src/pages/app/flash-card-deck-page.test.tsx`

- [x] **Step 1: Update `FlashCardDeckPage` to render the `< Kembali` pill navigation, subtopic header, and `FlashCardViewer` with `onRateCard` persistence**
- [x] **Step 2: Update and run tests in `src/pages/app/flash-card-deck-page.test.tsx`**
- [x] **Step 3: Run full verification (`npx vitest run` for flashcard tests and `npm run build`)**
