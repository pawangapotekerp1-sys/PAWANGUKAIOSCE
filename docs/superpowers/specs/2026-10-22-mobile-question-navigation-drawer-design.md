# Design Specification: Mobile Question Navigation Drawer

- **Date:** 2026-10-22
- **Topic:** Mobile Responsive Drawer for Question Navigation in Tryout & Review Pages
- **Status:** Approved by User

## 1. Overview & Problem Statement
On mobile/tablet screens, the question navigation panel (grid of 30-100 question buttons) was previously rendered directly beneath the question stem, answer options, and action buttons. This resulted in excessive vertical scrolling, poor ergonomics, and a cluttered layout.

The goal is to elevate mobile UX by:
1. Hiding the static inline question navigation card on smaller screen viewports.
2. Introducing a sleek, ergonomic floating trigger pill fixed at the bottom center of the viewport on mobile devices.
3. Presenting the question navigation as a slide-up **Bottom Sheet / Drawer** with smooth scrolling, clear status indicators (answered, doubtful, idle for tryout; correct, incorrect for review), and auto-closing immediately upon tapping a question number.

## 2. Component Design: `MobileQuestionNavDrawer`

- **File Path:** `src/components/tryout/mobile-question-nav-drawer.tsx`
- **Underlying Primitives:** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `src/components/ui/sheet.tsx` (`@base-ui/react/dialog`).

### 2.1 Interface & Props
```typescript
export interface MobileQuestionNavDrawerProps {
  currentIndex: number;
  totalQuestions: number;
  onSelectQuestion: (index: number) => void;
  renderGrid: (helpers: { close: () => void }) => React.ReactNode;
  legend?: React.ReactNode;
  breakpoint?: "md" | "xl"; // "md" for tryout session, "xl" for review page
  title?: string;
  disabled?: boolean;
}
```

### 2.2 Trigger (Floating Pill)
- **Position:** `fixed bottom-4 left-1/2 -translate-x-1/2 z-40`
- **Visibility:** Controlled via responsive breakpoint utility:
  - When `breakpoint="md"`: `md:hidden`
  - When `breakpoint="xl"`: `xl:hidden`
- **Visuals:** Rounded pill (`rounded-full`), semi-translucent backdrop with border and elevation shadow (`bg-card/95 backdrop-blur-md border border-border/80 shadow-lg`), active scale feedback on tap (`active:scale-95`).
- **Content:** Grid/list icon, active progress label (e.g. `Soal 1 / 30`), and an upward chevron indicating an expandable sheet.

### 2.3 Bottom Sheet Modal
- **Side:** `side="bottom"`
- **Styling:** Max height `max-h-[80vh]`, rounded top corners (`rounded-t-3xl border-t border-border/80 bg-card`), subtle drag indicator bar at top.
- **Header:** SheetTitle ("Navigasi Soal"), question count summary, and optional legend slot.
- **Scrollable Area:** `overflow-y-auto px-4 py-3`, containing the question buttons in a mobile-optimized 5-column grid (`grid grid-cols-5 gap-2.5`).
- **Auto-Close Behavior:** When user taps any question button:
  1. `onSelectQuestion(index)` is invoked.
  2. The drawer closes immediately (`setOpen(false)`).
  3. Window scrolls smoothly to the top of the question view.

## 3. Page Integrations

### 3.1 Tryout Session (`src/pages/app/tryout-session-page.tsx`)
- Desktop sidebar Card (`Navigasi Soal`) receives `hidden md:block`.
- Integrated `MobileQuestionNavDrawer` with `breakpoint="md"`.
- Renders `SessionQuestionNavButton` with answered, doubtful, and idle states.
- Drawer includes legend chips:
  - Hijau/Primer: Terjawab
  - Amber/Kuning: Ragu-ragu
  - Muted: Belum dijawab

### 3.2 Scheduled Tryout Session (`src/pages/app/scheduled-tryout-session-page.tsx`)
- Desktop sidebar Card receives `hidden md:block`.
- Integrated `MobileQuestionNavDrawer` with `breakpoint="md"`.
- Renders `SessionQuestionNavButton` with answered, doubtful, and idle states.

### 3.3 Review / Pembahasan Page (`src/pages/app/review-page.tsx`)
- Desktop sidebar Card receives `hidden xl:block`.
- Integrated `MobileQuestionNavDrawer` with `breakpoint="xl"`.
- Renders circular review buttons:
  - Hijau/Emerald: Jawaban Benar
  - Merah/Rose: Jawaban Salah
- Drawer includes legend chips for Benar and Salah.

## 4. Verification Plan
- Unit tests for `MobileQuestionNavDrawer` verifying trigger rendering, open/close state, selection callback, and responsive classes.
- Regression tests for `tryout-session-page.test.tsx`, `scheduled-tryout-session-page.test.tsx`, and `review-page.test.tsx`.
- Production build verification (`npm run build`).
