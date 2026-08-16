import { describe, expect, it } from "vitest";
import { createFakePluginHost } from "@get-bb/plugin-sdk/testing";
import plugin, { openCommandForPlatform } from "./server";

describe("repo-watch RPCs", () => {
  it("returns git status output for a selected path", async () => {
    const { bb, harness } = createFakePluginHost({ pluginId: "repo-watch" });
    await plugin(bb);

    const result = await harness.behavior.callRpc("gitStatus", { path: process.cwd() });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("## ");
  });

  it("uses the native opener for the current platform", () => {
    expect(openCommandForPlatform("darwin", "/worktree")).toEqual({ command: "open", args: ["/worktree"] });
    expect(openCommandForPlatform("linux", "/worktree")).toEqual({ command: "xdg-open", args: ["/worktree"] });
    expect(openCommandForPlatform("win32", "C:\\worktree")).toEqual({ command: "explorer.exe", args: ["C:\\worktree"] });
  });
});
