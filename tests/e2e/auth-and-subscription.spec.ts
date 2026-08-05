import { expect, test, type Browser, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();
const pendaftarEmail = process.env.E2E_PENDAFTAR_EMAIL?.trim();
const pendaftarPassword = process.env.E2E_PENDAFTAR_PASSWORD?.trim();

const runtimeReady = Boolean(
  adminEmail
    && adminPassword
    && pendaftarEmail
    && pendaftarPassword,
);
const skipReason =
  "Requires reachable Vite + Supabase runtime plus E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD and E2E_PENDAFTAR_EMAIL/E2E_PENDAFTAR_PASSWORD.";

const pendaftarSeedUserId = "33333333-3333-3333-3333-333333333333";

async function login(
  page: Page,
  credentials: { email: string; password: string },
  expectedUrl: RegExp,
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/auth/login");

    await expect(
      page.getByRole("heading", {
        name: /masuk untuk lanjut ke dashboard dan try out/i,
      }),
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(credentials.email);
    await page.getByLabel(/kata sandi/i).fill(credentials.password);
    await page.getByRole("button", { name: /masuk dengan email/i }).click();

    try {
      await page.waitForURL(expectedUrl, {
        timeout: 30_000,
      });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

async function logoutIfVisible(page: Page) {
  const logoutButton = page.getByRole("button", { name: /keluar/i });

  if (await logoutButton.count()) {
    await logoutButton.click();
  }
}

async function uploadPaymentProof(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "bukti-transfer-test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("dummy-proof"),
  });
  await page.getByRole("button", { name: /kirim bukti transfer/i }).click();
}

async function approveLatestPendaftarSubmission(browser: Browser) {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  await login(adminPage, {
    email: adminEmail!,
    password: adminPassword!,
  }, /\/admin(?:\/)?(?:\?.*)?$/);
  await adminPage.goto("/admin/payments");

  await expect(
    adminPage.getByRole("heading", {
      name: /verifikasi pembayaran/i,
    }),
  ).toBeVisible();

  const pendaftarRow = adminPage
    .locator("article")
    .filter({
      hasText: pendaftarSeedUserId,
    })
    .last();

  await expect(pendaftarRow).toBeVisible();
  await pendaftarRow.getByRole("button", { name: /^setujui$/i }).click();
  await expect(
    adminPage.getByText(/submission berhasil disetujui dan audit log sudah dicatat/i),
  ).toBeVisible();

  await adminContext.close();
}

test.describe("auth and subscription flow", () => {
  test.describe.configure({
    mode: "serial",
  });

  test("pendaftar baru reaches subscription, uploads proof, admin approves, and app access becomes available", async ({
    browser,
    page,
  }) => {
    test.skip(!runtimeReady, skipReason);

    await login(page, {
      email: pendaftarEmail!,
      password: pendaftarPassword!,
    }, /\/subscription(?:\?.*)?$/);

    await expect(
      page.getByRole("heading", {
        name: /konfirmasi akses belajar sebelum masuk dashboard/i,
      }),
    ).toBeVisible();

    await uploadPaymentProof(page);
    await expect(
      page.getByText(/berhasil dikirim dan sekarang menunggu review admin/i),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByText(/status saat ini: pending review/i),
    ).toBeVisible();

    await logoutIfVisible(page);
    await approveLatestPendaftarSubmission(browser);

    await login(page, {
      email: pendaftarEmail!,
      password: pendaftarPassword!,
    }, /\/app(?:\/)?(?:\?.*)?$/);

    await expect(page).toHaveURL(/\/app(?:\/)?(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", {
        name: /belum ada ringkasan belajar yang bisa ditampilkan/i,
      }),
    ).toBeVisible();
  });
});
