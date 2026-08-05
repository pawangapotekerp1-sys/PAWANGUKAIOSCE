import { describe, expect, it } from "vitest";
import { createProductNavItems, productNavItems } from "./student-dashboard";

describe("productNavItems", () => {
  it("should contain single Try Out item pointing to /app/tryout-selection", () => {
    const tryoutItems = productNavItems.filter((item) =>
      item.href.includes("tryout")
    );
    expect(tryoutItems).toHaveLength(1);
    expect(tryoutItems[0]).toEqual({
      href: "/app/tryout-selection",
      label: "Try Out",
      icon: expect.anything(),
    });
  });

  it("should not contain old tryout or scheduled-tryout routes", () => {
    const hrefs = productNavItems.map((item) => item.href);
    expect(hrefs).not.toContain("/app/tryout");
    expect(hrefs).not.toContain("/app/scheduled-tryout");
  });

  it("should construct active navigation correctly with new tryout-selection route", () => {
    const navItems = createProductNavItems("/app/tryout-selection", "pro");
    const activeItem = navItems.find((item) => item.active);
    expect(activeItem?.href).toBe("/app/tryout-selection");
  });
});
