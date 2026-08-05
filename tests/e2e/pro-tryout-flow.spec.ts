import { expect, test, type Locator, type Page } from "@playwright/test";

const proEmail = process.env.E2E_PRO_EMAIL?.trim();
const proPassword = process.env.E2E_PRO_PASSWORD?.trim();

const runtimeReady = Boolean(proEmail && proPassword);
const skipReason =
  "Requires reachable Vite + Supabase runtime plus E2E_PRO_EMAIL and E2E_PRO_PASSWORD for a Pro user.";

async function isVisibleWithin(locator: Locator, timeout: number) {
  try {
    await locator.waitFor({
      state: "visible",
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

async function loginAsPro(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/auth/login");

    await expect(
      page.getByRole("heading", {
        name: /masuk untuk lanjut ke dashboard dan try out/i,
      }),
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(proEmail ?? "");
    await page.getByLabel(/kata sandi/i).fill(proPassword ?? "");
    await page.getByRole("button", { name: /masuk dengan email/i }).click();

    try {
      await page.waitForURL(/\/app(?:\/)?(?:\?.*)?$/, {
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

async function openTryoutSession(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/app/tryout");

    await expect(
      page.getByRole("heading", {
        name: /^katalog try out$/i,
      }),
    ).toBeVisible();

    const resumeLink = page.getByRole("link", { name: /lanjutkan try out/i });

    if (await isVisibleWithin(resumeLink, 10_000)) {
      await resumeLink.click();
    } else {
      const tryOutBesarCard = page
        .locator("article")
        .filter({
          has: page.getByRole("heading", {
            name: /^try out besar$/i,
          }),
        })
        .first();

      await expect(tryOutBesarCard).toBeVisible();
      await tryOutBesarCard.getByRole("link", { name: /mulai sesi/i }).click();
    }

    await expect(
      page.getByRole("heading", {
        name: /sesi try out berjalan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/timer sesi/i)).toBeVisible();

    const firstAnswer = page.getByRole("button", { name: /^A /i }).first();

    if (await isVisibleWithin(firstAnswer, 45_000)) {
      return firstAnswer;
    }
  }

  throw new Error("Sesi try out belum membuka pilihan jawaban setelah tiga percobaan.");
}

test.describe("pro tryout flow", () => {
  test("pro user can start a tryout, submit it, and open the review surface", async ({ page }) => {
    test.skip(!runtimeReady, skipReason);

    await loginAsPro(page);
    const firstAnswer = await openTryoutSession(page);

    await firstAnswer.click();
    await page.locator("aside").getByRole("button").last().click();
    await expect(
      page.getByRole("button", {
        name: /kirim hasil/i,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /kirim hasil/i }).click();

    await expect(page).toHaveURL(/\/app\/tryout\/result\?attempt=/);
    await expect(
      page.getByRole("heading", {
        name: /^hasil try out$/i,
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: /buka review pembahasan/i }).click();

    await expect(page).toHaveURL(/\/app\/review\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", {
        name: /review dan pembahasan/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/penjelasan/i).first()).toBeVisible();
  });
});
