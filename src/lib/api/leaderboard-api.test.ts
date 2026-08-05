import { describe, expect, test, vi } from "vitest";
import { getLeaderboard } from "./leaderboard-api";

describe("leaderboard-api", () => {
  test("requests leaderboard rows for the selected category", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });
    const client = {
      rpc,
    };

    await getLeaderboard(
      {
        category: "overall",
      },
      client as never,
    );

    expect(rpc).toHaveBeenCalledWith("get_leaderboard", {
      target_category: "overall",
    });
  });
});
