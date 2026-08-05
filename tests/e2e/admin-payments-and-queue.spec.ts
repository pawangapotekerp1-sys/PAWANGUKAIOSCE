import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();

const adminRuntimeReady = Boolean(adminEmail && adminPassword);
const adminRuntimeSkipReason =
  "Requires a reachable Vite app with Supabase env plus E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for an admin account.";

async function loginAsAdmin(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/auth/login");

    await expect(
      page.getByRole("heading", {
        name: /masuk untuk lanjut ke dashboard dan try out/i,
      }),
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(adminEmail ?? "");
    await page.getByLabel(/kata sandi/i).fill(adminPassword ?? "");
    await page.getByRole("button", { name: /masuk dengan email/i }).click();

    try {
      await page.waitForURL(/\/admin(?:\/)?(?:\?.*)?$/, {
        timeout: 30_000,
      });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }

  await expect(
    page.getByRole("heading", {
      name: /ringkasan operasional hari ini/i,
    }),
  ).toBeVisible();
}

async function expectAdminRuntime(page: Page) {
  test.skip(!adminRuntimeReady, adminRuntimeSkipReason);
  await loginAsAdmin(page);
}

async function resolvePaymentsState(page: Page) {
  if (
    await page
      .getByRole("heading", {
        name: /queue pembayaran belum berhasil dimuat/i,
      })
      .count()
  ) {
    return "error";
  }

  if (
    await page
      .getByRole("heading", {
        name: /antrean pembayaran masih kosong/i,
      })
      .count()
  ) {
    return "empty";
  }

  if (await page.getByRole("button", { name: /lihat bukti/i }).count()) {
    return "queue";
  }

  if (
    await page
      .getByRole("heading", {
        name: /memuat antrean pembayaran/i,
      })
      .count()
  ) {
    return "loading";
  }

  return "unknown";
}

test.describe("admin payments and queue scaffolding", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeEach(async ({ page }) => {
    await expectAdminRuntime(page);
  });

  test("redirects the legacy bank-soal admin routes back to the dashboard", async ({
    page,
  }) => {
    const legacyRoutes = [
      "/admin/review-queue?reviewQueueView=loading",
      "/admin/references?referenceView=loading",
    ];

    for (const legacyRoute of legacyRoutes) {
      await page.goto(legacyRoute);
      await page.waitForURL(/\/admin(?:\/)?$/);

      await expect(
        page.getByRole("heading", {
          name: /ringkasan operasional hari ini/i,
        }),
      ).toBeVisible();
    }

    await expect(page.getByRole("link", { name: /question bank/i })).toHaveAttribute(
      "href",
      "/admin/questions",
    );
    await expect(page.getByRole("link", { name: /review queue/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /references/i })).toHaveCount(0);
  });

  test("loads the payments review surface when the real admin runtime is available", async ({
    page,
  }) => {
    await page.goto("/admin/payments");

    await expect(
      page.getByRole("heading", {
        name: /verifikasi pembayaran/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /keluar/i })).toBeVisible();
    await expect(page.getByText(/^pending review$/i).first()).toBeVisible();
    await expect(page.getByText(/^siap ditindak$/i).first()).toBeVisible();

    await expect
      .poll(async () => {
        const state = await resolvePaymentsState(page);
        return state === "empty" || state === "queue";
      }, {
        message:
          "Payments page should settle into the real empty state or show at least one actionable queue item.",
      })
      .toBe(true);
  });
});
