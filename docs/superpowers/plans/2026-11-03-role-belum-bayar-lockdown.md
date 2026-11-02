# Role Khusus `belum_bayar` & Halaman Penguncian Akun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membatasi akses siswa yang belum menyelesaikan pembayaran/baru bayar DP dengan menambahkan role khusus `belum_bayar`, yang mengunci seluruh navigasi aplikasi dan menahan siswa di halaman khusus penonaktifan akun dengan opsi logout.

**Architecture:** Menambahkan nilai enum PostgreSQL `belum_bayar` pada tipe `public.app_role`. Di tingkat frontend, sistem otorisasi (`permissions.ts`) menetapkan `canAccessStudentApp = false` dan `resolveAuthenticatedHome = "/account-suspended"`. Route guard (`route-guards.tsx`) mengalihkan seluruh akses ke halaman mandiri `/account-suspended` (`account-suspended-page.tsx`), dan admin dashboard (`users-page.tsx`) menyediakan opsi dropdown manual untuk menetapkan role ini.

**Tech Stack:** React 19, TypeScript, React Router 7, Supabase Client, TanStack Query 5, Vitest, Testing Library.

## Global Constraints

- Pesan penonaktifan pada halaman penguncian wajib persis: `"Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran"`.
- Halaman `/account-suspended` tidak boleh memiliki navigasi atas, sidebar, atau footer navigasi dashboard siswa.
- Tidak ada tombol kontak WhatsApp eksternal (siswa sudah mengetahui kontak admin); tindakan yang disediakan cukup tombol "Keluar" (Logout).
- Siswa dengan role aktif (`pro`, `osce_pro`, `admin`, `mentor`) tidak boleh dapat mengakses halaman `/account-suspended` (otomatis dialihkan ke home masing-masing).
- Pengguna yang belum login (`anonymous`) dialihkan ke `/auth/login`.

---

### Task 1: Database Migration for `belum_bayar` Role

**Files:**
- Create: `supabase/migrations/20261103000000_add_belum_bayar_role.sql`

**Interfaces:**
- Produces: Enum value `'belum_bayar'` in Postgres enum `public.app_role`.

- [ ] **Step 1: Create the SQL migration file**

Tulis file migrasi di `supabase/migrations/20261103000000_add_belum_bayar_role.sql`:

```sql
-- Migration: Add belum_bayar to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'belum_bayar';
```

- [ ] **Step 2: Verify migration file exists and is valid SQL**

Run: `Get-Content supabase/migrations/20261103000000_add_belum_bayar_role.sql`
Expected: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'belum_bayar';`

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/20261103000000_add_belum_bayar_role.sql
git commit -m "feat(db): add belum_bayar value to app_role enum"
```

---

### Task 2: Core Permissions & Auth Type Logic

**Files:**
- Modify: `src/lib/auth/permissions.ts`
- Create: `src/lib/auth/permissions.test.ts`

**Interfaces:**
- Consumes: None
- Produces:
  - `UserRole`: `"pendaftar_baru" | "pro" | "mentor" | "admin" | "osce_pro" | "belum_bayar"`
  - `isUserRole(value: unknown): value is UserRole`
  - `canAccessStudentApp(access: AccessSnapshot): boolean` (returns `false` for `belum_bayar`)
  - `resolveAuthenticatedHome(access: AccessSnapshot): "/admin" | "/app" | "/subscription" | "/account-suspended"`

- [ ] **Step 1: Write the failing unit test for permissions**

Buat file `src/lib/auth/permissions.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import {
  canAccessStudentApp,
  isUserRole,
  resolveAuthenticatedHome,
  type AccessSnapshot,
} from "./permissions";

describe("permissions auth helpers for belum_bayar role", () => {
  test("recognizes belum_bayar as valid UserRole", () => {
    expect(isUserRole("belum_bayar")).toBe(true);
  });

  test("denies student app access for belum_bayar role", () => {
    const access: AccessSnapshot = {
      role: "belum_bayar",
      subscriptionState: "active",
    };
    expect(canAccessStudentApp(access)).toBe(false);
  });

  test("resolves authenticated home to /account-suspended for belum_bayar role", () => {
    const access: AccessSnapshot = {
      role: "belum_bayar",
      subscriptionState: "active",
    };
    expect(resolveAuthenticatedHome(access)).toBe("/account-suspended");
  });

  test("resolves authenticated home normally for other roles", () => {
    expect(
      resolveAuthenticatedHome({ role: "admin", subscriptionState: "active" }),
    ).toBe("/admin");
    expect(
      resolveAuthenticatedHome({ role: "pro", subscriptionState: "active" }),
    ).toBe("/app");
    expect(
      resolveAuthenticatedHome({ role: "pendaftar_baru", subscriptionState: "expired" }),
    ).toBe("/subscription");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project tooling src/lib/auth/permissions.test.ts`
Expected: FAIL with TypeScript/Runtime error because `"belum_bayar"` is not yet included in `UserRole` and `resolveAuthenticatedHome` does not return `"/account-suspended"`.

- [ ] **Step 3: Update `src/lib/auth/permissions.ts`**

Perbarui `src/lib/auth/permissions.ts`:

1. Perbarui `UserRole`:
```typescript
export type UserRole = "pendaftar_baru" | "pro" | "mentor" | "admin" | "osce_pro" | "belum_bayar";
```

2. Perbarui `isUserRole`:
```typescript
export function isUserRole(value: unknown): value is UserRole {
  return (
    value === "pendaftar_baru" ||
    value === "pro" ||
    value === "mentor" ||
    value === "admin" ||
    value === "osce_pro" ||
    value === "belum_bayar"
  );
}
```

3. Pastikan `canAccessStudentApp` tetap hanya mengizinkan role `admin`, `mentor`, `pro`, dan `osce_pro` (tidak mengizinkan `belum_bayar`):
```typescript
export function canAccessStudentApp(access: AccessSnapshot): boolean {
  if (access.role === "admin") {
    return true;
  }

  if (access.role === "mentor") {
    return true;
  }

  // Role is the source of truth for student access entitlement.
  // Subscription state is still used elsewhere for renewal and payment messaging.
  return access.role === "pro" || access.role === "osce_pro";
}
```

4. Perbarui `resolveAuthenticatedHome`:
```typescript
export function resolveAuthenticatedHome(
  access: AccessSnapshot,
): "/admin" | "/app" | "/subscription" | "/account-suspended" {
  if (access.role === "admin") {
    return "/admin";
  }

  if (access.role === "belum_bayar") {
    return "/account-suspended";
  }

  return canAccessStudentApp(access) ? "/app" : "/subscription";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project tooling src/lib/auth/permissions.test.ts`
Expected: PASS (4 tests passed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/permissions.ts src/lib/auth/permissions.test.ts
git commit -m "feat(auth): add belum_bayar role to permissions and route resolution"
```

---

### Task 3: Admin API and User Management Table

**Files:**
- Modify: `src/lib/api/admin-api.ts:24-80`
- Modify: `src/pages/admin/users-page.tsx:20-50, 160-220`
- Modify: `src/pages/admin/users-page.test.tsx`

**Interfaces:**
- Consumes: `UserRole` from `src/lib/auth/permissions.ts`
- Produces:
  - `ManagedUserRow["role"]`: includes `"belum_bayar"`
  - `resolveManagedUserFilterLabel`: maps `"belum_bayar"` to `"belum_bayar"`
  - `UsersPage`: dropdown role includes `"Belum Bayar"` with value `"belum_bayar"`

- [ ] **Step 1: Write the failing test for Admin Users Page**

Buka `src/pages/admin/users-page.test.tsx` dan tambahkan pengujian untuk role `belum_bayar`:

```typescript
test("displays Belum Bayar role option in user edit dropdown and filter", async () => {
  renderUsersPage();

  expect(await screen.findByText(/kelola pengguna/i, { selector: 'h1, h2, h3, h4, h5, h6, [data-slot="card-title"], [data-slot="alert-title"]' })).toBeInTheDocument();

  // Memastikan opsi "Belum Bayar" tersedia pada dropdown per-baris
  const roleSelects = screen.getAllByRole("combobox");
  expect(roleSelects.length).toBeGreaterThan(0);
  
  const options = Array.from(roleSelects[0].querySelectorAll("option")).map((opt) => opt.textContent);
  expect(options).toContain("Belum Bayar");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project tooling src/pages/admin/users-page.test.tsx` (atau project `src`)
Expected: FAIL with expected options to contain "Belum Bayar".

- [ ] **Step 3: Update `src/lib/api/admin-api.ts`**

Di `src/lib/api/admin-api.ts`:
1. Ubah tipe `ManagedUserRow`:
```typescript
type ManagedUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  leaderboard_alias: string | null;
  role: "pendaftar_baru" | "pro" | "mentor" | "admin" | "osce_pro" | "belum_bayar";
  created_at: string;
};
```

2. Di fungsi `resolveManagedUserFilterLabel`:
```typescript
function resolveManagedUserFilterLabel(role: ManagedUserRow["role"]): ManagedUser["filterLabel"] {
  if (role === "admin") {
    return "admin";
  }

  if (role === "pro" || role === "osce_pro") {
    return "user_aktif";
  }

  if (role === "mentor") {
    return "user_aktif";
  }

  return "belum_bayar";
}
```

- [ ] **Step 4: Update `src/pages/admin/users-page.tsx`**

1. Perbarui `resolveRoleLabel`:
```typescript
function resolveRoleLabel(role: ManagedRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "mentor") {
    return "Mentor";
  }

  if (role === "pro") {
    return "Pro";
  }

  if (role === "osce_pro") {
    return "OSCE Pro";
  }

  if (role === "belum_bayar") {
    return "Belum Bayar";
  }

  return "Peserta baru";
}
```

2. Di elemen `<select>` dropdown tabel peran dan modal pembuatan akun, tambahkan `<option value="belum_bayar">Belum Bayar</option>`:
```tsx
<option value="pendaftar_baru">Peserta baru</option>
<option value="pro">Pro</option>
<option value="osce_pro">OSCE Pro</option>
<option value="mentor">Mentor</option>
<option value="admin">Admin</option>
<option value="belum_bayar">Belum Bayar</option>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/users-page.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/admin-api.ts src/pages/admin/users-page.tsx src/pages/admin/users-page.test.tsx
git commit -m "feat(admin): support belum_bayar role selection in user management"
```

---

### Task 4: Standalone Account Suspended Page

**Files:**
- Create: `src/pages/account-suspended-page.tsx`
- Create: `src/pages/account-suspended-page.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `bootstrapProfile`, `logout` from `src/lib/api/auth-api`
- Produces: `AccountSuspendedPage` React component

- [ ] **Step 1: Write the failing test for `AccountSuspendedPage`**

Buat file `src/pages/account-suspended-page.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AccountSuspendedPage from "./account-suspended-page";

const mockLogout = vi.fn();
const mockUseSession = vi.fn();

vi.mock("../lib/auth/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../lib/api/auth-api", () => ({
  logout: () => mockLogout(),
  bootstrapProfile: vi.fn().mockResolvedValue({
    id: "user-123",
    email: "siswa@example.com",
    fullName: "Siswa Belum Lunas",
    role: "belum_bayar",
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockUseSession.mockReturnValue({
    status: "authenticated",
    user: {
      id: "user-123",
      email: "siswa@example.com",
      user_metadata: { full_name: "Siswa Belum Lunas" },
    },
  });
});

describe("AccountSuspendedPage", () => {
  test("renders the required suspended notice message verbatim", async () => {
    render(
      <MemoryRouter>
        <AccountSuspendedPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran",
      ),
    ).toBeInTheDocument();
  });

  test("calls logout when Keluar button is clicked", async () => {
    render(
      <MemoryRouter>
        <AccountSuspendedPage />
      </MemoryRouter>,
    );

    const logoutButton = await screen.findByRole("button", { name: /keluar/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/account-suspended-page.test.tsx`
Expected: FAIL because `account-suspended-page.tsx` does not exist yet.

- [ ] **Step 3: Implement `src/pages/account-suspended-page.tsx`**

Buat file `src/pages/account-suspended-page.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/account-suspended-page.test.tsx`
Expected: PASS (2 tests passed).

- [ ] **Step 5: Commit**

```bash
git add src/pages/account-suspended-page.tsx src/pages/account-suspended-page.test.tsx
git commit -m "feat(pages): implement standalone account suspended page"
```

---

### Task 5: Route Guards and App Router Integration

**Files:**
- Modify: `src/router/route-guards.tsx`
- Modify: `src/router/app-router.tsx`
- Modify: `src/router/app-router.test.tsx`

**Interfaces:**
- Consumes: `AccountSuspendedPage`, `resolveAuthenticatedHome`, `canAccessStudentApp`
- Produces: `SuspendedAccountRouteGuard`, `/account-suspended` route, redirection from protected routes when role is `belum_bayar`

- [ ] **Step 1: Write the failing tests in `app-router.test.tsx`**

Di `src/router/app-router.test.tsx`, tambahkan test cases:
1. Siswa dengan role `belum_bayar` saat mencoba membuka `/app` otomatis di-redirect ke `/account-suspended`.
2. Siswa dengan role `belum_bayar` yang membuka `/account-suspended` diizinkan melihat pesan "Akun anda nonaktif, silahkan hubungi admin untuk melunasi pembayaran".
3. Siswa dengan role `pro` yang membuka `/account-suspended` otomatis di-redirect ke `/app`.
4. User anonim yang membuka `/account-suspended` di-redirect ke `/auth/login`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/router/app-router.test.tsx -t "belum_bayar"`
Expected: FAIL because `SuspendedAccountRouteGuard` and `/account-suspended` route are not yet configured in router.

- [ ] **Step 3: Update `src/router/route-guards.tsx`**

1. Di `AppRouteGuard`:
```typescript
if (guardState.access.role === "belum_bayar") {
  return <Navigate replace to="/account-suspended" />;
}
```

2. Tambahkan `SuspendedAccountRouteGuard`:
```typescript
export function SuspendedAccountRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous" || guardState.status === "error") {
    if (guardState.status === "anonymous") {
      return <Navigate replace to="/auth/login" />;
    }

    return (
      <GuardErrorState
        message={guardState.message}
        title="Akses akun belum bisa diverifikasi"
      />
    );
  }

  // Jika akunnya BUKAN belum_bayar (misal sudah lunas/pro/admin), arahkan ke home aslinya
  if (guardState.access.role !== "belum_bayar") {
    return (
      <Navigate
        replace
        to={resolveAuthenticatedHome(guardState.access)}
      />
    );
  }

  return <Outlet />;
}
```

3. Pastikan `AuthenticatedRouteGuard` mengarahkan `belum_bayar` ke `/account-suspended` jika mengakses `/profile`:
```typescript
export function AuthenticatedRouteGuard() {
  const guardState = useGuardAccess();

  if (guardState.status === "loading") {
    return null;
  }

  if (guardState.status === "anonymous") {
    return <Navigate replace to="/auth/login" />;
  }

  if (guardState.status === "ready" && guardState.access.role === "belum_bayar") {
    return <Navigate replace to="/account-suspended" />;
  }

  return <Outlet />;
}
```

- [ ] **Step 4: Update `src/router/app-router.tsx`**

1. Import lazy `AccountSuspendedPage` dan `SuspendedAccountRouteGuard`:
```typescript
const AccountSuspendedPage = lazy(() => import("../pages/account-suspended-page"));
```
dan tambahkan `SuspendedAccountRouteGuard` ke daftar import dari `./route-guards`.

2. Tambahkan route di dalam `<Routes>`:
```tsx
<Route element={<SuspendedAccountRouteGuard />}>
  <Route path="/account-suspended" element={<AccountSuspendedPage />} />
</Route>
```

- [ ] **Step 5: Run tests to verify all pass**

Run: `npx vitest run src/router/app-router.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/router/route-guards.tsx src/router/app-router.tsx src/router/app-router.test.tsx
git commit -m "feat(routing): enforce lockdown on /account-suspended for belum_bayar role"
```
