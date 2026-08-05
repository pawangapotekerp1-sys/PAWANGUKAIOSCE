# Task 1: Update Post-Login Redirect

## Requirements
Update the login redirect logic in `src/pages/auth/login-page.tsx`.
Currently, on successful login via `loginWithPassword`, the app calls `navigate("/app", { replace: true });`.
Change this to `navigate("/app/tryout-selection", { replace: true });`.

Also update any related tests in `src/pages/auth/login-page.test.tsx` (if they assert the redirect destination).

## Context
The user requested that upon successful login, users are automatically directed to the try out selection page instead of the general dashboard.

## Global Constraints
- Do not introduce placeholders or "TODO" comments.
- Verify tests pass cleanly.
