# Universal Profile Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one authenticated `/profile` experience for `pendaftar_baru`, `pro`, and `admin` accounts with display-name updates, password changes, avatar uploads, and logout access across all shells.

**Architecture:** Add a new authenticated-only route for `/profile`, keep profile data logic centralized in a dedicated profile API module, and extend Supabase schema/storage with `profiles.avatar_url` plus a new avatar bucket. Reuse the current session/auth flow, preserve existing role guards for `/app` and `/admin`, and attach lightweight role-aware wrappers around one shared `ProfilePage`.

**Tech Stack:** React 19, React Router 7, TanStack Query, Supabase JS v2, Vitest, Testing Library, Supabase SQL migrations

---

## File Structure

### Existing files to modify

- `E:\Projek TRY OYT\src\lib\auth\permissions.ts`
  Responsibility: expand the shared `AppProfile` type to include avatar data.
- `E:\Projek TRY OYT\src\lib\api\auth-api.ts`
  Responsibility: keep login/logout/bootstrap behavior intact while narrowing this module back to auth-only concerns or sharing normalization helpers with the new profile API.
- `E:\Projek TRY OYT\src\router\app-router.tsx`
  Responsibility: register the new `/profile` route and mount it behind an authenticated-only guard.
- `E:\Projek TRY OYT\src\router\route-guards.tsx`
  Responsibility: add a generic authenticated guard that allows any signed-in user to reach `/profile`.
- `E:\Projek TRY OYT\src\components\layout\product-shell.tsx`
  Responsibility: expose profile/logout shortcuts for `pro` users.
- `E:\Projek TRY OYT\src\components\layout\admin-shell.tsx`
  Responsibility: expose profile/logout shortcuts for `admin` users.
- `E:\Projek TRY OYT\src\pages\subscription-page.tsx`
  Responsibility: expose `/profile` and logout actions for authenticated `pendaftar_baru` users.
- `E:\Projek TRY OYT\src\mocks\student-dashboard.ts`
  Responsibility: add a profile nav item to the student shell navigation model.
- `E:\Projek TRY OYT\src\mocks\admin-content.ts`
  Responsibility: add a profile nav item to the admin shell navigation model.
- `E:\Projek TRY OYT\src\router\app-router.test.tsx`
  Responsibility: assert `/profile` access across roles and shell routing behavior.

### New frontend files to create

- `E:\Projek TRY OYT\src\lib\api\profile-api.ts`
  Responsibility: fetch the current profile, update display name, update password, upload avatar, and clean up replaced avatar objects.
- `E:\Projek TRY OYT\src\lib\api\profile-api.test.ts`
  Responsibility: unit-test profile data helpers with mocked Supabase clients.
- `E:\Projek TRY OYT\src\pages\profile-page.tsx`
  Responsibility: render the shared `/profile` experience and orchestrate independent mutations for name, password, avatar, and logout.
- `E:\Projek TRY OYT\src\pages\profile-page.test.tsx`
  Responsibility: verify profile-page rendering, validation, mutation states, and logout interactions.

### New Supabase files to create

- `E:\Projek TRY OYT\supabase\migrations\20260506000015_profile_avatar_management.sql`
  Responsibility: add `profiles.avatar_url`, create the avatar bucket, and define storage policies for self-owned avatar objects.
- `E:\Projek TRY OYT\supabase\migrations\20260506000015_profile_avatar_management.test.ts`
  Responsibility: assert the new migration contains the expected schema changes and storage rules.

## Chunk 1: Schema And Profile Data Contracts

### Task 1: Add avatar schema support and migration coverage

**Files:**
- Create: `E:\Projek TRY OYT\supabase\migrations\20260506000015_profile_avatar_management.sql`
- Create: `E:\Projek TRY OYT\supabase\migrations\20260506000015_profile_avatar_management.test.ts`

- [ ] **Step 1: Write the failing migration test**

```ts
describe("20260506000015_profile_avatar_management migration", () => {
  test("adds avatar_url to profiles and provisions avatar storage policies", () => {
    expect(normalizedSql).toContain("alter table public.profiles add column if not exists avatar_url text");
    expect(normalizedSql).toContain("insert into storage.buckets");
    expect(normalizedSql).toContain("'profile-avatars'");
    expect(normalizedSql).toContain('create policy "profile_avatars_insert_own"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- supabase/migrations/20260506000015_profile_avatar_management.test.ts`
Expected: FAIL because the migration file does not exist yet or required SQL fragments are missing.

- [ ] **Step 3: Write the minimal migration**

```sql
alter table public.profiles
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

Add matching `select`, `insert`, and `delete` policies on `storage.objects` using `(storage.foldername(name))[1] = auth.uid()::text`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- supabase/migrations/20260506000015_profile_avatar_management.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260506000015_profile_avatar_management.sql supabase/migrations/20260506000015_profile_avatar_management.test.ts
git commit -m "feat: add profile avatar storage schema"
```

### Task 2: Expand the shared profile contract

**Files:**
- Modify: `E:\Projek TRY OYT\src\lib\auth\permissions.ts`
- Test: `E:\Projek TRY OYT\src\lib\api\profile-api.test.ts`

- [ ] **Step 1: Write the failing profile contract test**

```ts
test("maps avatar_url from profile rows into the app profile shape", async () => {
  await expect(getCurrentProfile(client as never)).resolves.toMatchObject({
    avatarUrl: "user-1/avatar.webp",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api/profile-api.test.ts`
Expected: FAIL because the new API file and `avatarUrl` mapping do not exist yet.

- [ ] **Step 3: Add the minimal type expansion**

```ts
export type AppProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};
```

- [ ] **Step 4: Run the targeted test again after Task 3 creates the API file**

Run: `npm test -- src/lib/api/profile-api.test.ts`
Expected: still FAIL for missing API behavior until Task 3 is implemented.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/permissions.ts
git commit -m "refactor: extend profile contract with avatar support"
```

## Chunk 2: Profile API And Authenticated Routing

### Task 3: Add the dedicated profile API module

**Files:**
- Create: `E:\Projek TRY OYT\src\lib\api\profile-api.ts`
- Create: `E:\Projek TRY OYT\src\lib\api\profile-api.test.ts`
- Modify: `E:\Projek TRY OYT\src\lib\api\auth-api.ts`

- [ ] **Step 1: Write failing tests for profile reads, name updates, password changes, and avatar uploads**

```ts
test("updates display name in auth metadata and profiles", async () => {
  await updateCurrentProfileName({ fullName: "Nadira Apoteker" }, client as never);
  expect(updateUser).toHaveBeenCalledWith({
    data: { full_name: "Nadira Apoteker" },
  });
  expect(updateEq).toHaveBeenCalledWith("id", "user-1");
});

test("updates password with current_password", async () => {
  await updateCurrentUserPassword({
    currentPassword: "old-pass",
    nextPassword: "new-pass-123",
  }, client as never);
  expect(updateUser).toHaveBeenCalledWith({
    current_password: "old-pass",
    password: "new-pass-123",
  });
});

test("uploads avatar into the current user's folder and persists avatar_url", async () => {
  await uploadCurrentUserAvatar({ userId: "user-1", file }, client as never);
  expect(upload).toHaveBeenCalledWith(
    "user-1/avatar.webp",
    file,
    expect.objectContaining({ upsert: true }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/api/profile-api.test.ts`
Expected: FAIL because `profile-api.ts` is missing and no helper functions exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function getCurrentProfile(client = getSupabaseBrowserClient()) {
  const { data, error } = await client
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return mapProfileRow(data as ProfileRow);
}
```

Add focused helpers for:

- `updateCurrentProfileName()`
- `updateCurrentUserPassword()`
- `uploadCurrentUserAvatar()`
- `removeProfileAvatarObject()` if cleanup is extracted

Keep auth-message normalization in one place so login and password-change errors share consistent copy.

- [ ] **Step 4: Run the profile API test suite**

Run: `npm test -- src/lib/api/profile-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/profile-api.ts src/lib/api/profile-api.test.ts src/lib/api/auth-api.ts src/lib/auth/permissions.ts
git commit -m "feat: add profile data helpers"
```

### Task 4: Add an authenticated-only route guard and `/profile` route coverage

**Files:**
- Modify: `E:\Projek TRY OYT\src\router\route-guards.tsx`
- Modify: `E:\Projek TRY OYT\src\router\app-router.tsx`
- Modify: `E:\Projek TRY OYT\src\router\app-router.test.tsx`
- Create: `E:\Projek TRY OYT\src\pages\profile-page.tsx` (temporary stub)

- [ ] **Step 1: Write the failing router tests**

```ts
test("renders the profile page for authenticated pendaftar_baru users", async () => {
  setAuthenticatedSession("pendaftar_baru", "pending_review");
  renderApp("/profile");
  expect(await screen.findByRole("heading", { name: /profil akun/i })).toBeInTheDocument();
});

test("redirects anonymous users away from /profile to login", () => {
  renderApp("/profile");
  expect(screen.getByRole("heading", {
    name: /masuk untuk lanjut ke dashboard dan try out/i,
  })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/router/app-router.test.tsx`
Expected: FAIL because `/profile` is not registered and no authenticated-only guard exists.

- [ ] **Step 3: Implement the minimal guard and route**

```tsx
export function AuthenticatedRouteGuard() {
  const { status } = useSession();

  if (status === "loading") return null;
  if (status === "anonymous") return <Navigate replace to="/auth/login" />;
  return <Outlet />;
}
```

Register:

```tsx
<Route element={<AuthenticatedRouteGuard />}>
  <Route path="/profile" element={<ProfilePage />} />
</Route>
```

Create a temporary `ProfilePage` stub with a single `<h1>Profil akun</h1>` until the full page exists.

- [ ] **Step 4: Run the router tests again**

Run: `npm test -- src/router/app-router.test.tsx`
Expected: PASS for the new profile-route cases and no regressions in existing role redirects.

- [ ] **Step 5: Commit**

```bash
git add src/router/route-guards.tsx src/router/app-router.tsx src/router/app-router.test.tsx src/pages/profile-page.tsx
git commit -m "feat: add authenticated profile route"
```

## Chunk 3: Profile Page UI And Shell Integration

### Task 5: Build the shared `/profile` page with independent form states

**Files:**
- Modify: `E:\Projek TRY OYT\src\pages\profile-page.tsx`
- Create: `E:\Projek TRY OYT\src\pages\profile-page.test.tsx`

- [ ] **Step 1: Write failing page tests for name, password, avatar, and logout**

```ts
test("submits a valid display name change", async () => {
  renderProfilePage();
  await user.type(screen.getByLabelText(/nama tampilan/i), "Nadira Apoteker");
  await user.click(screen.getByRole("button", { name: /simpan nama/i }));
  expect(mockUpdateCurrentProfileName).toHaveBeenCalledWith({ fullName: "Nadira Apoteker" });
});

test("blocks password submit when confirmation does not match", async () => {
  renderProfilePage();
  await user.type(screen.getByLabelText(/konfirmasi password baru/i), "beda");
  await user.click(screen.getByRole("button", { name: /ganti password/i }));
  expect(screen.getByRole("alert")).toHaveTextContent(/konfirmasi password belum cocok/i);
});

test("calls logout from the profile page", async () => {
  renderProfilePage();
  await user.click(screen.getByRole("button", { name: /logout sekarang/i }));
  expect(mockLogout).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/profile-page.test.tsx`
Expected: FAIL because the page still contains only the stub heading.

- [ ] **Step 3: Write the minimal page implementation**

```tsx
function ProfilePage() {
  const { user } = useSession();
  const [name, setName] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  return (
    <ProfileShell>
      <h1>Profil akun</h1>
      <form>{/* nama */}</form>
      <form>{/* password */}</form>
      <section>{/* avatar */}</section>
      <button onClick={() => void logout()}>Logout sekarang</button>
    </ProfileShell>
  );
}
```

Requirements for the real implementation:

- fetch and populate the current profile on mount
- show read-only email and role
- validate trimmed display name
- validate password confirmation before mutation
- validate image MIME type and size before upload
- keep mutation states isolated per section

- [ ] **Step 4: Run the page test suite**

Run: `npm test -- src/pages/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/profile-page.tsx src/pages/profile-page.test.tsx
git commit -m "feat: build universal profile page"
```

### Task 6: Wire profile and logout shortcuts into each shell

**Files:**
- Modify: `E:\Projek TRY OYT\src\components\layout\product-shell.tsx`
- Modify: `E:\Projek TRY OYT\src\components\layout\admin-shell.tsx`
- Modify: `E:\Projek TRY OYT\src\pages\subscription-page.tsx`
- Modify: `E:\Projek TRY OYT\src\mocks\student-dashboard.ts`
- Modify: `E:\Projek TRY OYT\src\mocks\admin-content.ts`
- Modify: `E:\Projek TRY OYT\src\router\app-router.test.tsx`
- Modify: `E:\Projek TRY OYT\src\pages\profile-page.test.tsx`

- [ ] **Step 1: Write the failing shortcut tests**

```ts
test("student shell navigation links to /profile", async () => {
  setAuthenticatedSession("pro", "active");
  renderApp("/app");
  expect(await screen.findByRole("link", { name: /profil/i })).toHaveAttribute("href", "/profile");
});

test("subscription surface shows a profile shortcut for authenticated users", async () => {
  setAuthenticatedSession("pendaftar_baru", "pending_review");
  renderApp("/subscription");
  expect(await screen.findByRole("link", { name: /profil/i })).toHaveAttribute("href", "/profile");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/router/app-router.test.tsx`
Expected: FAIL because no profile shortcuts exist yet.

- [ ] **Step 3: Add the minimal shell wiring**

```ts
export const productNavItems: ProductNavItem[] = [
  // existing app links
  { href: "/profile", label: "Profil", icon: UserRound },
];
```

In shells:

- render a `Link` to `/profile`
- render a logout button that calls `logout()`
- keep visual styles aligned with the existing shell components

In `SubscriptionPage`, add a profile CTA only when `user` exists so anonymous users still see login-first actions.

- [ ] **Step 4: Run tests for router and profile page coverage**

Run: `npm test -- src/router/app-router.test.tsx src/pages/profile-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/product-shell.tsx src/components/layout/admin-shell.tsx src/pages/subscription-page.tsx src/mocks/student-dashboard.ts src/mocks/admin-content.ts src/router/app-router.test.tsx src/pages/profile-page.test.tsx
git commit -m "feat: add profile and logout shortcuts"
```

## Chunk 4: Verification And Regression Safety

### Task 7: Run focused verification and tighten any failing assumptions

**Files:**
- Modify as needed: any files touched by the previous tasks

- [ ] **Step 1: Run the focused test suites**

Run: `npm test -- src/lib/api/profile-api.test.ts src/pages/profile-page.test.tsx src/router/app-router.test.tsx supabase/migrations/20260506000015_profile_avatar_management.test.ts`
Expected: PASS across all new profile-focused coverage.

- [ ] **Step 2: Run a broader auth-and-routing regression pass**

Run: `npm test -- src/lib/auth/session-provider.test.tsx src/pages/subscription-page.test.tsx src/router/app-router.test.tsx`
Expected: PASS, confirming the new authenticated-only route does not break session hydration or subscription flows.

- [ ] **Step 3: Run the full test suite if the focused passes are green**

Run: `npm test -- --run`
Expected: PASS, or a small list of unrelated pre-existing failures that must be documented before completion.

- [ ] **Step 4: Fix any regressions uncovered by verification**

If a regression appears, repeat the TDD loop:

```ts
test("regression name here", () => {
  expect(/* restored behavior */).toBe(/* expected */);
});
```

Then rerun the smallest failing command first, followed by the broader verification command that previously failed.

- [ ] **Step 5: Commit the verification-safe final state**

```bash
git add .
git commit -m "test: verify universal profile management flow"
```

## Execution Notes

- Prefer `@test-driven-development` throughout every task. Do not write production code for a task until the associated failing test exists and has been observed failing for the expected reason.
- Prefer small commits after every task, even if the local workspace is not yet a working git repository. If git is unavailable, keep the task boundaries intact so commits can be replayed later.
- Keep `profile-api.ts` focused on profile concerns. Do not turn `auth-api.ts` into a mixed auth/profile module again.
- Do not broaden profile scope into email changes, avatar cropping, or admin user-management features during implementation.
