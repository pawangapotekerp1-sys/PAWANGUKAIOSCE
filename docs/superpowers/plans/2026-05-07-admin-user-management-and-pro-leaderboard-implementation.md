# Admin User Management And Pro Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin-managed account creation and role management, plus a pro-only top-10 leaderboard with user-managed aliases and password recovery support.

**Architecture:** Extend the existing Supabase-first app with two backend layers: SQL helpers for user listing, role changes, alias storage, and leaderboard ranking; and a privileged admin Edge Function for secure account creation and invite delivery. Keep frontend integration thin by adding focused API helpers, dedicated admin and pro pages, and minimal navigation updates around the current `AdminShell`, `ProductShell`, shared profile surface, and auth routes.

**Tech Stack:** React 19, React Router 7, TanStack Query, Supabase JS v2, Supabase Edge Functions, PostgreSQL SQL migrations/RPCs/views, Vitest, Testing Library

---

## File Structure

### Existing files to modify

- `E:\Projek TRY OYT\src\router\app-router.tsx`
  Responsibility: register admin users route, pro leaderboard route, and auth password reset route.
- `E:\Projek TRY OYT\src\mocks\admin-content.ts`
  Responsibility: add the `Pengguna` nav item and any admin copy helpers for the new page.
- `E:\Projek TRY OYT\src\mocks\student-dashboard.ts`
  Responsibility: add the `Leaderboard` nav item to the pro shell.
- `E:\Projek TRY OYT\src\pages\auth\login-page.tsx`
  Responsibility: add forgot-password UI entry point and request state handling.
- `E:\Projek TRY OYT\src\pages\profile-page.tsx`
  Responsibility: add the editable leaderboard alias field and success/error states.
- `E:\Projek TRY OYT\src\lib\api\auth-api.ts`
  Responsibility: add forgot-password and password-reset helpers while preserving login/bootstrap behavior.
- `E:\Projek TRY OYT\src\lib\api\profile-api.ts`
  Responsibility: read and update `leaderboard_alias` alongside existing profile fields.
- `E:\Projek TRY OYT\src\lib\api\admin-api.ts`
  Responsibility: add admin user listing, privileged account creation invocation, and role update helpers.
- `E:\Projek TRY OYT\src\lib\api\admin-api.test.ts`
  Responsibility: extend unit coverage for new admin user-management helpers.
- `E:\Projek TRY OYT\src\router\app-router.test.tsx`
  Responsibility: cover the new routes and navigation expectations.
- `E:\Projek TRY OYT\src\pages\profile-page.test.tsx`
  Responsibility: verify alias editing behavior.

### New frontend files to create

- `E:\Projek TRY OYT\src\lib\api\leaderboard-api.ts`
  Responsibility: fetch top-10 leaderboard rows by category.
- `E:\Projek TRY OYT\src\lib\api\leaderboard-api.test.ts`
  Responsibility: test category-based leaderboard data fetching and mapping.
- `E:\Projek TRY OYT\src\pages\admin\users-page.tsx`
  Responsibility: render admin user filters, create-user form, user list, and role change actions.
- `E:\Projek TRY OYT\src\pages\admin\users-page.test.tsx`
  Responsibility: test filter, create-user, and role-update interactions.
- `E:\Projek TRY OYT\src\pages\app\leaderboard-page.tsx`
  Responsibility: render category switching and the top-10 leaderboard list.
- `E:\Projek TRY OYT\src\pages\app\leaderboard-page.test.tsx`
  Responsibility: test loading, empty, populated, and tied-rank leaderboard states.
- `E:\Projek TRY OYT\src\pages\auth\reset-password-page.tsx`
  Responsibility: handle invite/recovery session landing and password submission.
- `E:\Projek TRY OYT\src\pages\auth\reset-password-page.test.tsx`
  Responsibility: test reset-password validation and submit behavior.

### New Supabase files to create

- `E:\Projek TRY OYT\supabase\migrations\20260507000016_admin_users_and_leaderboard_alias.sql`
  Responsibility: add `profiles.leaderboard_alias` plus SQL helpers for admin user listing and role updates.
- `E:\Projek TRY OYT\supabase\migrations\20260507000016_admin_users_and_leaderboard_alias.test.ts`
  Responsibility: assert the migration adds alias support and admin-safe SQL helpers.
- `E:\Projek TRY OYT\supabase\migrations\20260507000017_leaderboard_rankings.sql`
  Responsibility: add SQL helpers or RPCs for overall and per-block top-10 leaderboard ranking.
- `E:\Projek TRY OYT\supabase\migrations\20260507000017_leaderboard_rankings.test.ts`
  Responsibility: assert the ranking migration encodes participant filtering, top-10 limits, and ranking rules.
- `E:\Projek TRY OYT\supabase\functions\admin-manage-users\index.ts`
  Responsibility: implement the privileged admin account-creation and role-management entrypoint.
- `E:\Projek TRY OYT\supabase\functions\admin-manage-users\index.test.ts`
  Responsibility: test request validation, admin checks, and action routing for the privileged function.

## Chunk 1: Schema, SQL Helpers, And Privileged Admin Backend

### Task 1: Add alias storage and admin user SQL helpers

**Files:**
- Create: `E:\Projek TRY OYT\supabase\migrations\20260507000016_admin_users_and_leaderboard_alias.sql`
- Create: `E:\Projek TRY OYT\supabase\migrations\20260507000016_admin_users_and_leaderboard_alias.test.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
describe("20260507000016_admin_users_and_leaderboard_alias migration", () => {
  test("adds leaderboard_alias and admin user helpers", () => {
    expect(normalizedSql).toContain(
      "alter table public.profiles add column if not exists leaderboard_alias text",
    );
    expect(normalizedSql).toContain("create or replace function public.list_admin_users");
    expect(normalizedSql).toContain("create or replace function public.admin_update_user_role");
  });

  test("guards privileged helpers behind admin checks", () => {
    expect(normalizedSql).toContain("if not public.is_admin()");
    expect(normalizedSql).toContain("raise exception 'aksi ini hanya tersedia untuk admin.'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- supabase/migrations/20260507000016_admin_users_and_leaderboard_alias.test.ts`
Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the minimal migration**

```sql
alter table public.profiles
add column if not exists leaderboard_alias text;

create or replace function public.list_admin_users()
returns table (
  id uuid,
  email text,
  full_name text,
  leaderboard_alias text,
  role public.app_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Aksi ini hanya tersedia untuk admin.' using errcode = '42501';
  end if;

  return query
  select profiles.id, profiles.email, profiles.full_name, profiles.leaderboard_alias, profiles.role, profiles.created_at
  from public.profiles
  order by profiles.created_at desc;
end;
$$;
```

Also add `public.admin_update_user_role(target_user_id uuid, target_role public.app_role)` with:

- admin-only guard
- role update on `public.profiles`
- optional `audit_logs` insertion

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- supabase/migrations/20260507000016_admin_users_and_leaderboard_alias.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260507000016_admin_users_and_leaderboard_alias.sql supabase/migrations/20260507000016_admin_users_and_leaderboard_alias.test.ts
git commit -m "feat: add admin user helpers and leaderboard alias schema"
```

### Task 2: Add top-10 leaderboard SQL helpers

**Files:**
- Create: `E:\Projek TRY OYT\supabase\migrations\20260507000017_leaderboard_rankings.sql`
- Create: `E:\Projek TRY OYT\supabase\migrations\20260507000017_leaderboard_rankings.test.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
describe("20260507000017_leaderboard_rankings migration", () => {
  test("creates leaderboard ranking helpers with top 10 limit", () => {
    expect(normalizedSql).toContain("create or replace function public.get_leaderboard");
    expect(normalizedSql).toContain("dense_rank()");
    expect(normalizedSql).toContain("limit 10");
  });

  test("filters leaderboard participants to pro users only", () => {
    expect(normalizedSql).toContain("profiles.role = 'pro'");
  });

  test("includes block-specific score recomputation from attempt items", () => {
    expect(normalizedSql).toContain("from public.attempt_items");
    expect(normalizedSql).toContain("left join public.answers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- supabase/migrations/20260507000017_leaderboard_rankings.test.ts`
Expected: FAIL because the ranking migration does not exist yet.

- [ ] **Step 3: Write the minimal ranking migration**

```sql
create or replace function public.get_leaderboard(category text)
returns table (
  rank bigint,
  user_id uuid,
  alias text,
  score numeric,
  time_used_seconds integer,
  attempt_id uuid,
  submitted_at timestamptz,
  category text
)
language sql
security definer
set search_path = public
as $$
  -- overall branch: use attempt_results.score
  -- block branches: recompute correct/total from attempt_items + answers
$$;
```

Requirements for the real SQL:

- accept `overall`, `clinical_science`, `social_behavior_administrative_pharmacy`, `pharmaceutical_science`
- resolve alias with `coalesce(nullif(leaderboard_alias, ''), fallback)`
- keep only `profiles.role = 'pro'`
- use best score all-time per user
- break ties with smaller `time_used_seconds`
- use `dense_rank()` so exact ties share a rank
- return no more than 10 rows

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- supabase/migrations/20260507000017_leaderboard_rankings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260507000017_leaderboard_rankings.sql supabase/migrations/20260507000017_leaderboard_rankings.test.ts
git commit -m "feat: add leaderboard ranking sql helpers"
```

### Task 3: Add the privileged admin Edge Function

**Files:**
- Create: `E:\Projek TRY OYT\supabase\functions\admin-manage-users\index.ts`
- Create: `E:\Projek TRY OYT\supabase\functions\admin-manage-users\index.test.ts`

- [ ] **Step 1: Write the failing function tests**

```ts
test("rejects non-admin callers", async () => {
  const response = await handleRequest(makeRequest({
    action: "create_user",
    email: "baru@example.com",
    role: "pro",
  }), depsForNonAdmin);

  expect(response.status).toBe(403);
});

test("routes create_user requests through the admin auth API", async () => {
  await handleRequest(makeRequest({
    action: "create_user",
    email: "baru@example.com",
    fullName: "Peserta Baru",
    role: "pendaftar_baru",
  }), depsForAdmin);

  expect(inviteUserByEmail).toHaveBeenCalled();
  expect(updateProfileRole).toHaveBeenCalledWith(expect.objectContaining({
    email: "baru@example.com",
    role: "pendaftar_baru",
  }));
});

test("routes update_role requests through the SQL helper", async () => {
  await handleRequest(makeRequest({
    action: "update_role",
    userId: "user-2",
    role: "admin",
  }), depsForAdmin);

  expect(adminUpdateUserRole).toHaveBeenCalledWith("user-2", "admin");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- supabase/functions/admin-manage-users/index.test.ts`
Expected: FAIL because the function files do not exist yet.

- [ ] **Step 3: Write the minimal function implementation**

```ts
serve(async (request) => {
  const body = await request.json();

  if (body.action === "create_user") {
    // verify admin
    // invite user by email or create + recovery flow
    // update profile role and full_name
  }

  if (body.action === "update_role") {
    // verify admin
    // invoke admin_update_user_role
  }

  return json({ ok: true });
});
```

Implementation notes:

- prefer `inviteUserByEmail` if it cleanly supports the desired set-password email flow in this project setup
- if invite flow proves insufficient, use admin create-user plus recovery email dispatch as the fallback design path already documented in the spec
- keep request parsing and validation in small helpers so the tests stay focused

- [ ] **Step 4: Run the function tests**

Run: `npm test -- supabase/functions/admin-manage-users/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin-manage-users/index.ts supabase/functions/admin-manage-users/index.test.ts
git commit -m "feat: add privileged admin user management function"
```

## Chunk 2: Frontend API Layer, Auth Recovery, And Alias Editing

### Task 4: Extend the frontend admin API helpers

**Files:**
- Modify: `E:\Projek TRY OYT\src\lib\api\admin-api.ts`
- Modify: `E:\Projek TRY OYT\src\lib\api\admin-api.test.ts`

- [ ] **Step 1: Write the failing admin API tests**

```ts
test("lists admin-managed users from the SQL helper", async () => {
  await expect(listManagedUsers(client as never)).resolves.toEqual([
    expect.objectContaining({
      email: "pro@example.com",
      role: "pro",
      filterLabel: "user_aktif",
    }),
  ]);
});

test("creates a user through the privileged admin function", async () => {
  await createManagedUser({
    email: "baru@example.com",
    fullName: "Peserta Baru",
    role: "pendaftar_baru",
  }, client as never);

  expect(invoke).toHaveBeenCalledWith("admin-manage-users", {
    body: expect.objectContaining({
      action: "create_user",
      email: "baru@example.com",
    }),
  });
});

test("updates a managed user's role through the privileged admin function", async () => {
  await updateManagedUserRole({
    userId: "user-2",
    role: "admin",
  }, client as never);

  expect(invoke).toHaveBeenCalledWith("admin-manage-users", {
    body: expect.objectContaining({
      action: "update_role",
      userId: "user-2",
      role: "admin",
    }),
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api/admin-api.test.ts`
Expected: FAIL because the new helpers do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function listManagedUsers(client = getSupabaseBrowserClient()) {
  const { data, error } = await client.rpc("list_admin_users");
  if (error) throw new Error(error.message);
  return mapManagedUsers(data ?? []);
}

export async function createManagedUser(input, client = getSupabaseBrowserClient()) {
  return invokeAdminFunction(client, "admin-manage-users", {
    action: "create_user",
    ...input,
  });
}

export async function updateManagedUserRole(input, client = getSupabaseBrowserClient()) {
  return invokeAdminFunction(client, "admin-manage-users", {
    action: "update_role",
    ...input,
  });
}
```

- [ ] **Step 4: Run the admin API tests**

Run: `npm test -- src/lib/api/admin-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/admin-api.ts src/lib/api/admin-api.test.ts
git commit -m "feat: add admin user management api helpers"
```

### Task 5: Add forgot-password and reset-password helpers

**Files:**
- Modify: `E:\Projek TRY OYT\src\lib\api\auth-api.ts`
- Modify: `E:\Projek TRY OYT\src\pages\auth\login-page.tsx`
- Create: `E:\Projek TRY OYT\src\pages\auth\reset-password-page.tsx`
- Create: `E:\Projek TRY OYT\src\pages\auth\reset-password-page.test.tsx`
- Modify: `E:\Projek TRY OYT\src\router\app-router.tsx`

- [ ] **Step 1: Write the failing reset/auth tests**

```ts
test("requests a password reset email from login", async () => {
  render(<LoginPage />);
  await user.click(screen.getByRole("button", { name: /lupa password/i }));
  await user.type(screen.getByLabelText(/email/i), "user@example.com");
  await user.click(screen.getByRole("button", { name: /kirim link reset/i }));
  expect(mockRequestPasswordReset).toHaveBeenCalledWith({
    email: "user@example.com",
  });
});

test("submits a new password from the reset page", async () => {
  renderResetPasswordPage();
  await user.type(screen.getByLabelText(/password baru/i), "Baru12345!");
  await user.type(screen.getByLabelText(/konfirmasi password baru/i), "Baru12345!");
  await user.click(screen.getByRole("button", { name: /simpan password baru/i }));
  expect(mockCompletePasswordReset).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/auth/reset-password-page.test.tsx src/router/app-router.test.tsx`
Expected: FAIL because the auth helpers and route do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function requestPasswordReset({ email }, client = getSupabaseBrowserClient()) {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw new Error(normalizeAuthErrorMessage(error.message));
}

export async function updatePasswordAfterRecovery({ nextPassword }, client = getSupabaseBrowserClient()) {
  const { error } = await client.auth.updateUser({ password: nextPassword });
  if (error) throw new Error(normalizeAuthErrorMessage(error.message));
}
```

Update `LoginPage` to:

- expose a forgot-password action
- capture its own success/error state
- avoid breaking the current login flow

Add `/auth/reset-password` route and page with:

- new password
- confirm password
- submit button

- [ ] **Step 4: Run the targeted auth tests**

Run: `npm test -- src/pages/auth/reset-password-page.test.tsx src/router/app-router.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/auth-api.ts src/pages/auth/login-page.tsx src/pages/auth/reset-password-page.tsx src/pages/auth/reset-password-page.test.tsx src/router/app-router.tsx
git commit -m "feat: add password recovery flow"
```

### Task 6: Add leaderboard alias editing to the profile surface

**Files:**
- Modify: `E:\Projek TRY OYT\src\lib\api\profile-api.ts`
- Modify: `E:\Projek TRY OYT\src\pages\profile-page.tsx`
- Modify: `E:\Projek TRY OYT\src\pages\profile-page.test.tsx`

- [ ] **Step 1: Write the failing alias tests**

```ts
test("shows helper text when leaderboard alias is empty", async () => {
  renderProfilePage({ leaderboardAlias: null });
  expect(await screen.findByText(/alias otomatis/i)).toBeInTheDocument();
});

test("submits leaderboard alias updates from the profile page", async () => {
  renderProfilePage({ leaderboardAlias: null });
  await user.type(screen.getByLabelText(/alias leaderboard/i), "FarmasiNad");
  await user.click(screen.getByRole("button", { name: /simpan alias/i }));
  expect(mockUpdateLeaderboardAlias).toHaveBeenCalledWith({
    userId: "user-1",
    leaderboardAlias: "FarmasiNad",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/profile-page.test.tsx`
Expected: FAIL because alias fields and helpers do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function updateCurrentLeaderboardAlias(
  { userId, leaderboardAlias },
  client = getSupabaseBrowserClient(),
) {
  const { error } = await client
    .from("profiles")
    .update({ leaderboard_alias: leaderboardAlias })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
```

Update `ProfilePage` to:

- preload `leaderboardAlias`
- render a dedicated alias form section
- allow empty string if the user wants fallback alias behavior
- show helper copy when alias is blank

- [ ] **Step 4: Run the profile tests**

Run: `npm test -- src/pages/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/profile-api.ts src/pages/profile-page.tsx src/pages/profile-page.test.tsx
git commit -m "feat: add leaderboard alias profile controls"
```

## Chunk 3: Admin Users Surface

### Task 7: Add admin users route and page shell integration

**Files:**
- Modify: `E:\Projek TRY OYT\src\router\app-router.tsx`
- Modify: `E:\Projek TRY OYT\src\mocks\admin-content.ts`
- Modify: `E:\Projek TRY OYT\src\router\app-router.test.tsx`
- Create: `E:\Projek TRY OYT\src\pages\admin\users-page.tsx`
- Create: `E:\Projek TRY OYT\src\pages\admin\users-page.test.tsx`

- [ ] **Step 1: Write the failing route/navigation tests**

```ts
test("admin navigation links to /admin/users", async () => {
  setAuthenticatedSession("admin", "active");
  renderApp("/admin");
  expect(await screen.findByRole("link", { name: /pengguna/i })).toHaveAttribute("href", "/admin/users");
});

test("renders the users page for admin users", async () => {
  setAuthenticatedSession("admin", "active");
  renderApp("/admin/users");
  expect(await screen.findByRole("heading", { name: /kelola pengguna/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/router/app-router.test.tsx`
Expected: FAIL because the route and nav item do not exist yet.

- [ ] **Step 3: Write the minimal route and page scaffolding**

```tsx
<Route path="/admin/users" element={<UsersPage />} />
```

In `admin-content.ts` add:

```ts
{
  href: "/admin/users",
  label: "Pengguna",
  icon: UsersThree,
}
```

Create a minimal `UsersPage` wrapped in `AdminShell` with:

- page title
- short description
- placeholder section for filters and list

- [ ] **Step 4: Run the route/navigation tests**

Run: `npm test -- src/router/app-router.test.tsx src/pages/admin/users-page.test.tsx`
Expected: PASS for the new route and base render.

- [ ] **Step 5: Commit**

```bash
git add src/router/app-router.tsx src/mocks/admin-content.ts src/router/app-router.test.tsx src/pages/admin/users-page.tsx src/pages/admin/users-page.test.tsx
git commit -m "feat: add admin users route and navigation"
```

### Task 8: Build admin user listing, filters, create-user form, and role updates

**Files:**
- Modify: `E:\Projek TRY OYT\src\pages\admin\users-page.tsx`
- Modify: `E:\Projek TRY OYT\src\pages\admin\users-page.test.tsx`

- [ ] **Step 1: Write the failing interaction tests**

```ts
test("filters users into user aktif, belum bayar, and admin groups", async () => {
  renderUsersPageWithData();
  await user.click(screen.getByRole("button", { name: /user aktif/i }));
  expect(screen.getByText("pro@example.com")).toBeInTheDocument();
  expect(screen.queryByText("baru@example.com")).not.toBeInTheDocument();
});

test("creates a user and shows success feedback", async () => {
  renderUsersPageWithData();
  await user.click(screen.getByRole("button", { name: /tambah akun baru/i }));
  await user.type(screen.getByLabelText(/^email$/i), "baru@example.com");
  await user.type(screen.getByLabelText(/nama tampilan awal/i), "Peserta Baru");
  await user.selectOptions(screen.getByLabelText(/role awal/i), "pendaftar_baru");
  await user.click(screen.getByRole("button", { name: /buat akun/i }));
  expect(mockCreateManagedUser).toHaveBeenCalled();
  expect(await screen.findByText(/email set-password sudah dikirim/i)).toBeInTheDocument();
});

test("updates a user's role inline", async () => {
  renderUsersPageWithData();
  await user.selectOptions(screen.getByLabelText(/role-pro@example.com/i), "admin");
  await user.click(screen.getByRole("button", { name: /simpan role-pro@example.com/i }));
  expect(mockUpdateManagedUserRole).toHaveBeenCalledWith({
    userId: "user-2",
    role: "admin",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/admin/users-page.test.tsx`
Expected: FAIL because the page still only has placeholder content.

- [ ] **Step 3: Write the minimal implementation**

```tsx
const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "user_aktif", label: "User aktif" },
  { id: "belum_bayar", label: "Belum bayar" },
  { id: "admin", label: "Admin" },
];
```

Implementation requirements:

- load users from `listManagedUsers`
- derive summary counts by role
- filter client-side from the fetched dataset unless the RPC already returns a matching discriminator
- keep create-user form state separate from role-update row state
- refresh the list after successful create or role change

- [ ] **Step 4: Run the users page tests**

Run: `npm test -- src/pages/admin/users-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/users-page.tsx src/pages/admin/users-page.test.tsx
git commit -m "feat: build admin user management surface"
```

## Chunk 4: Pro Leaderboard Surface

### Task 9: Add leaderboard API helpers and route wiring

**Files:**
- Create: `E:\Projek TRY OYT\src\lib\api\leaderboard-api.ts`
- Create: `E:\Projek TRY OYT\src\lib\api\leaderboard-api.test.ts`
- Modify: `E:\Projek TRY OYT\src\router\app-router.tsx`
- Modify: `E:\Projek TRY OYT\src\mocks\student-dashboard.ts`
- Modify: `E:\Projek TRY OYT\src\router\app-router.test.tsx`
- Create: `E:\Projek TRY OYT\src\pages\app\leaderboard-page.tsx`
- Create: `E:\Projek TRY OYT\src\pages\app\leaderboard-page.test.tsx`

- [ ] **Step 1: Write the failing leaderboard API and routing tests**

```ts
test("requests leaderboard rows for the selected category", async () => {
  await getLeaderboard({
    category: "overall",
  }, client as never);

  expect(rpc).toHaveBeenCalledWith("get_leaderboard", {
    category: "overall",
  });
});

test("student navigation links to /app/leaderboard", async () => {
  setAuthenticatedSession("pro", "active");
  renderApp("/app");
  expect(await screen.findByRole("link", { name: /leaderboard/i })).toHaveAttribute("href", "/app/leaderboard");
});

test("renders the leaderboard route for pro users", async () => {
  setAuthenticatedSession("pro", "active");
  renderApp("/app/leaderboard");
  expect(await screen.findByRole("heading", { name: /leaderboard/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api/leaderboard-api.test.ts src/router/app-router.test.tsx`
Expected: FAIL because the helper, nav item, route, and page do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function getLeaderboard(
  { category },
  client = getSupabaseBrowserClient(),
) {
  const { data, error } = await client.rpc("get_leaderboard", { category });
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

Add in `student-dashboard.ts`:

```ts
{
  href: "/app/leaderboard",
  label: "Leaderboard",
  icon: Trophy,
}
```

Register the route and create a minimal `LeaderboardPage` wrapped in `ProductShell`.

- [ ] **Step 4: Run the targeted leaderboard route/API tests**

Run: `npm test -- src/lib/api/leaderboard-api.test.ts src/router/app-router.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/leaderboard-api.ts src/lib/api/leaderboard-api.test.ts src/router/app-router.tsx src/mocks/student-dashboard.ts src/router/app-router.test.tsx src/pages/app/leaderboard-page.tsx src/pages/app/leaderboard-page.test.tsx
git commit -m "feat: add leaderboard route and data helpers"
```

### Task 10: Build category switching and top-10 leaderboard rendering

**Files:**
- Modify: `E:\Projek TRY OYT\src\pages\app\leaderboard-page.tsx`
- Modify: `E:\Projek TRY OYT\src\pages\app\leaderboard-page.test.tsx`

- [ ] **Step 1: Write the failing leaderboard page tests**

```ts
test("switches categories and refetches leaderboard rows", async () => {
  renderLeaderboardPage();
  await user.click(screen.getByRole("button", { name: /clinical science/i }));
  expect(mockGetLeaderboard).toHaveBeenLastCalledWith({
    category: "clinical_science",
  });
});

test("renders shared ranks for exact ties", async () => {
  renderLeaderboardPageWithRows([
    { rank: 1, alias: "FarmasiNad", score: 90, timeUsedSeconds: 1200 },
    { rank: 1, alias: "Apoteker-AB12", score: 90, timeUsedSeconds: 1200 },
  ]);
  expect(await screen.findAllByText(/^1$/)).toHaveLength(2);
});

test("shows at most 10 rows from the query result", async () => {
  renderLeaderboardPageWithRows(makeRows(10));
  expect(await screen.findAllByTestId(/leaderboard-row-/)).toHaveLength(10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/app/leaderboard-page.test.tsx`
Expected: FAIL because the page still has only placeholder content.

- [ ] **Step 3: Write the minimal implementation**

```tsx
const CATEGORY_OPTIONS = [
  { id: "overall", label: "Overall" },
  { id: "clinical_science", label: "Clinical Science" },
  { id: "social_behavior_administrative_pharmacy", label: "Social, Behavioral & Administrative Pharmacy" },
  { id: "pharmaceutical_science", label: "Pharmaceutical Science" },
];
```

Implementation requirements:

- use query key `["leaderboard", category]`
- preserve top-10 rendering only
- show rank, alias, score, and time used
- keep state panel coverage for loading, empty, and error
- do not compute ranking in the browser

- [ ] **Step 4: Run the leaderboard page tests**

Run: `npm test -- src/pages/app/leaderboard-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/leaderboard-page.tsx src/pages/app/leaderboard-page.test.tsx
git commit -m "feat: build pro leaderboard page"
```

## Chunk 5: Verification And Regression Safety

### Task 11: Run focused verification for the new feature set

**Files:**
- Modify as needed: any files touched by earlier tasks

- [ ] **Step 1: Run the backend-focused tests**

Run: `npm test -- supabase/migrations/20260507000016_admin_users_and_leaderboard_alias.test.ts supabase/migrations/20260507000017_leaderboard_rankings.test.ts supabase/functions/admin-manage-users/index.test.ts`
Expected: PASS

- [ ] **Step 2: Run the frontend API and page tests**

Run: `npm test -- src/lib/api/admin-api.test.ts src/lib/api/leaderboard-api.test.ts src/pages/admin/users-page.test.tsx src/pages/app/leaderboard-page.test.tsx src/pages/auth/reset-password-page.test.tsx src/pages/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 3: Run the routing regression pass**

Run: `npm test -- src/router/app-router.test.tsx`
Expected: PASS, confirming the new admin, leaderboard, and auth routes integrate cleanly.

- [ ] **Step 4: Run the full suite if the focused passes are green**

Run: `npm test -- --run`
Expected: PASS, or a documented list of unrelated pre-existing failures if any already existed before this feature work.

- [ ] **Step 5: Commit the verification-safe final state**

```bash
git add .
git commit -m "test: verify admin user management and leaderboard flow"
```

## Execution Notes

- Prefer `@test-driven-development` throughout every task. Every production change in this plan should start with a failing targeted test.
- Keep backend privilege boundaries strict: browser code may invoke the new admin function, but never directly use service-role-only auth admin APIs.
- Do not let the admin create-user work accidentally expand into payment/subscription logic; role-based filters are the locked scope for this phase.
- For block leaderboard math, resist shortcuts that reuse `attempt_results.score`; the per-block recomputation is part of the product contract and must be verified by tests.
- If invite email behavior turns out to differ in local Supabase versus production, preserve the same frontend contract and swap the server-side implementation to the documented fallback path rather than changing the UI contract mid-stream.
