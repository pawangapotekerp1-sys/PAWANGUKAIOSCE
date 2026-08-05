# Modern SaaS Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely rebuild the structural layout of `ProductShell` from a traditional edge-attached sidebar to a Modern SaaS Floating Layout (detached sidebar, framed main content canvas) without altering the internal Tryout logic.

**Architecture:** We will replace the root grid container in `ProductShell` with a flex-based layout wrapped in a padded canvas (`bg-clinical-surface lg:p-6`). The sidebar will become a fixed-width `aside` with `backdrop-blur-md` and glassmorphism, and the main content will be housed in a large white flex-1 container with a `rounded-[2rem]` border.

**Tech Stack:** React, Tailwind CSS v4, Lucide React.

## Global Constraints

- Must preserve exact `ProductShellProps` interface so all pages consuming it do not break.
- Must preserve the `updateSidebarCollapsed` localStorage logic.
- Must use `clinical-*` CSS variables defined in `src/index.css`.

---

## User Review Required

> [!IMPORTANT]
> Merombak struktur root aplikasi berisiko menyebabkan *layout shift* pada halaman-halaman yang tidak kita prediksi (karena area kerjanya kini dibungkus dalam *padding* tambahan). Saya telah mengakalinya agar kontainer utama bersifat `flex-1 min-w-0` sehingga tidak merusak tabel atau grid di dalamnya, namun kita perlu waspada jika ada halaman yang mengasumsikan layar penuh tanpa margin.

---

### Task 1: Rebuild the Shell Container & Sidebar

**Files:**
- Modify: `src/components/layout/product-shell.tsx`

**Interfaces:**
- Consumes: Existing `ProductShellProps`.
- Produces: A new DOM structure for the layout.

- [ ] **Step 1: Replace the root grid with the floating flex layout**

```tsx
// Inside ProductShell return statement, replace the entire return with:
return (
  <div className="flex min-h-[100dvh] w-full bg-clinical-surface text-clinical-text-primary lg:p-6 lg:gap-6">
    <aside
      className={cn(
        "relative hidden lg:flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-clinical-border shadow-sm transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-[260px]"
      )}
      data-sidebar-state={isSidebarCollapsed ? "collapsed" : "expanded"}
    >
      {/* Sidebar Header */}
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        {!isSidebarCollapsed && (
          <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-clinical-text-primary">
            {brand}
          </p>
        )}
      </div>

      {/* Navigation mapping will go here in next step */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <nav className="flex flex-col gap-1">
           {/* placeholder for nav */}
        </nav>
      </div>
      
      {/* Footer / Logout */}
      <div className="p-4 border-t border-clinical-border/50">
         <Button
            className="w-full justify-center"
            variant="outline"
            onClick={() => void logout()}
          >
            {isSidebarCollapsed ? <LogOut className="h-4 w-4" /> : "Logout"}
          </Button>
      </div>

      {/* Collapse Toggle */}
      <Button
        aria-label={isSidebarCollapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
        className="absolute top-10 -right-4 z-10 h-8 w-8 rounded-full border border-clinical-border bg-white text-clinical-text-secondary shadow-sm hover:text-clinical-text-primary"
        onClick={() => updateSidebarCollapsed(!isSidebarCollapsed)}
        size="icon"
        variant="ghost"
      >
        {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </aside>

    <main className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-none lg:rounded-[2rem] bg-white border-0 lg:border border-clinical-border shadow-sm lg:h-[calc(100vh-3rem)]">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  </div>
);
```
*(Make sure to import `LogOut` from `lucide-react`, and `cn` from `@/lib/utils`)*

- [ ] **Step 2: Re-implement the Navigation Mapping with Clinical Tokens**

```tsx
// Inside the <nav> element in the sidebar:
{navItems.map((item) => (
  <div key={item.href}>
    <Link
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
        item.active
          ? "bg-clinical-accent/10 text-clinical-accent-dark font-semibold"
          : "text-clinical-text-secondary hover:bg-clinical-surface hover:text-clinical-text-primary font-medium",
        isSidebarCollapsed && "justify-center px-0"
      )}
      to={item.href}
      title={isSidebarCollapsed ? item.label : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!isSidebarCollapsed && item.label}
    </Link>
    {!isSidebarCollapsed && item.active && item.children?.length ? (
      <div className="mt-1 ml-9 grid gap-1 border-l border-clinical-border/50 pl-4">
        {item.children.map((child) => (
          <Link
            key={child.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              child.active
                ? "font-semibold text-clinical-accent-dark"
                : "text-clinical-text-secondary hover:text-clinical-text-primary"
            )}
            to={child.href}
          >
            {child.label}
          </Link>
        ))}
      </div>
    ) : null}
  </div>
))}
```

- [ ] **Step 3: Run build to verify syntax**
Run: `npm run build`
Expected: Passes without errors.

- [ ] **Step 4: Commit changes**
Run: `git commit -am "feat(ui): rebuild product shell into modern saas layout"`
