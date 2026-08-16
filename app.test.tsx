// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";

const snapshot = {
  fetchedAt: "2026-08-16T00:00:00.000Z",
  scanRoots: ["/work"],
  repos: [{
    path: "/work/repo",
    name: "repo",
    branch: "main",
    defaultBranch: "main",
    isClean: true,
    changedFiles: 0,
    unmergedBranches: [],
    error: null,
    worktrees: [
      {
        path: "/work/repo",
        branch: "main",
        isMain: true,
        isMissing: false,
        isClean: true,
        isMerged: false,
        needsCleanup: false,
      },
      {
        path: "/work/repo-feature",
        branch: "feature",
        isMain: false,
        isMissing: false,
        isClean: false,
        isMerged: false,
        needsCleanup: false,
      },
    ],
  }],
  totals: { dirty: 0, cleanup: 0, unmerged: 0 },
};

describe("Repo Watch panel", () => {
  it("renders an independently scrollable panel and actions for each path", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const openPath = vi.fn(() => ({ ok: true, message: "Opened" }));
    const gitStatus = vi.fn(() => ({ ok: true, output: "## main" }));
    const slot = renderSlot(app.navPanels[0]!, { subPath: "" }, {
      rpc: { snapshot: () => snapshot, refresh: () => snapshot, openPath, gitStatus },
    });

    await slot.findByText("repo");

    expect(screen.getByRole("main").className).toContain("overflow-y-auto");
    fireEvent.click(screen.getByRole("button", { name: "Open repo" }));
    fireEvent.click(screen.getByRole("button", { name: "Show git status for repo" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Open worktree" })[1]!);

    expect(openPath).toHaveBeenCalledWith({ path: "/work/repo" });
    expect(openPath).toHaveBeenCalledWith({ path: "/work/repo-feature" });
    expect(gitStatus).toHaveBeenCalledWith({ path: "/work/repo" });
    expect((await slot.findByRole("status")).textContent).toBe("## main");
  });
});
