import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const MAX_REPOS = 100;
const MAX_SCAN_DEPTH = 3;
const commandOptions = { timeout: 8_000, maxBuffer: 256 * 1024 };

export function openCommandForPlatform(platform: NodeJS.Platform, path: string) {
  if (platform === "darwin") return { command: "open", args: [path] };
  if (platform === "win32") return { command: "explorer.exe", args: [path] };
  return { command: "xdg-open", args: [path] };
}

const worktreeSchema = z.object({
  path: z.string(), branch: z.string().nullable(), isMain: z.boolean(), isMissing: z.boolean(),
  isClean: z.boolean().nullable(), isMerged: z.boolean(), needsCleanup: z.boolean(),
});
const repoSchema = z.object({
  path: z.string(), name: z.string(), branch: z.string().nullable(), defaultBranch: z.string(),
  isClean: z.boolean(), changedFiles: z.number().int(), unmergedBranches: z.array(z.string()),
  worktrees: z.array(worktreeSchema), error: z.string().nullable(),
});
export const snapshotSchema = z.object({
  fetchedAt: z.string(), scanRoots: z.array(z.string()), repos: z.array(repoSchema),
  totals: z.object({ dirty: z.number().int(), cleanup: z.number().int(), unmerged: z.number().int() }),
});

export const rpcContract = defineRpcContract({
  snapshot: { input: z.null(), output: snapshotSchema },
  refresh: { input: z.null(), output: snapshotSchema },
  openPath: { input: z.object({ path: z.string().min(1) }), output: z.object({ ok: z.boolean(), message: z.string() }) },
  gitStatus: { input: z.object({ path: z.string().min(1) }), output: z.object({ ok: z.boolean(), output: z.string() }) },
  prune: { input: z.object({ repoPath: z.string() }), output: z.object({ ok: z.boolean(), message: z.string() }) },
  removeWorktree: { input: z.object({ repoPath: z.string(), worktreePath: z.string() }), output: z.object({ ok: z.boolean(), message: z.string() }) },
});

export default async function plugin(bb: BbPluginApi) {
  const settings = bb.settings.define({
    scanRoots: {
      type: "string", label: "Repository scan roots",
      description: "Comma-separated absolute directories. Searches up to three levels deep.",
      default: "/Users/shane/Code",
    },
  });

  async function git(cwd: string, args: string[]): Promise<string> {
    const result = await execFileAsync("git", ["-C", cwd, ...args], commandOptions);
    return result.stdout.trim();
  }

  async function findRepos(root: string, depth = 0): Promise<string[]> {
    if (depth > MAX_SCAN_DEPTH) return [];
    try { await git(root, ["rev-parse", "--show-toplevel"]); return [root]; } catch { /* continue scanning */ }
    if (depth === MAX_SCAN_DEPTH) return [];
    try {
      const entries = await readdir(root, { withFileTypes: true });
      const children = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules").slice(0, 200);
      return (await Promise.all(children.map((entry) => findRepos(`${root}/${entry.name}`, depth + 1)))).flat();
    } catch { return []; }
  }

  function parseWorktrees(raw: string) {
    return raw.split("\n\n").filter(Boolean).map((block) => {
      const lines = block.split("\n");
      const path = lines.find((line) => line.startsWith("worktree "))?.slice(9) ?? "";
      const branchRef = lines.find((line) => line.startsWith("branch "))?.slice(7) ?? null;
      return { path, branch: branchRef?.replace(/^refs\/heads\//, "") ?? null };
    }).filter((item) => item.path);
  }

  async function inspectRepo(repoPath: string) {
    try {
      const branch = await git(repoPath, ["branch", "--show-current"]).catch(() => "") || null;
      const defaultBranch = await git(repoPath, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
        .then((value) => value.replace(/^origin\//, ""))
        .catch(async () => {
          const branches = await git(repoPath, ["for-each-ref", "--format=%(refname:short)", "refs/heads"]);
          return branches.split("\n").find((name) => name === "main" || name === "master") ?? branch ?? "main";
        });
      const status = await git(repoPath, ["status", "--porcelain=v1"]);
      const unmergedBranches = await git(repoPath, ["branch", "--no-merged", defaultBranch])
        .then((value) => value.split("\n").map((line) => line.replace(/^\*?\s+/, "")).filter(Boolean)).catch(() => [] as string[]);
      const worktrees = parseWorktrees(await git(repoPath, ["worktree", "list", "--porcelain"]));
      const details = await Promise.all(worktrees.map(async (worktree) => {
        let isClean: boolean | null = null;
        let isMissing = false;
        try { isClean = (await git(worktree.path, ["status", "--porcelain=v1"])) === ""; } catch { isMissing = true; }
        const isMain = worktree.path === repoPath;
        const isMerged = Boolean(worktree.branch && !isMain && await git(repoPath, ["merge-base", "--is-ancestor", worktree.branch, defaultBranch]).then(() => true).catch(() => false));
        return { ...worktree, isMain, isMissing, isClean, isMerged, needsCleanup: !isMain && (isMissing || (isClean === true && isMerged)) };
      }));
      return { path: repoPath, name: repoPath.split("/").pop() ?? repoPath, branch, defaultBranch, isClean: status === "", changedFiles: status ? status.split("\n").length : 0, unmergedBranches, worktrees: details, error: null };
    } catch (error) {
      return { path: repoPath, name: repoPath.split("/").pop() ?? repoPath, branch: null, defaultBranch: "main", isClean: true, changedFiles: 0, unmergedBranches: [], worktrees: [], error: (error as Error).message };
    }
  }

  async function snapshot() {
    const config = await settings.get();
    const scanRoots = String(config.scanRoots ?? "").split(",").map((root) => root.trim()).filter(Boolean);
    const repoPaths = [...new Set((await Promise.all(scanRoots.map((root) => findRepos(root)))).flat())].slice(0, MAX_REPOS);
    const repos = await Promise.all(repoPaths.map(inspectRepo));
    return { fetchedAt: new Date().toISOString(), scanRoots, repos, totals: {
      dirty: repos.filter((repo) => !repo.isClean).length,
      cleanup: repos.flatMap((repo) => repo.worktrees).filter((worktree) => worktree.needsCleanup).length,
      unmerged: repos.reduce((total, repo) => total + repo.unmergedBranches.length, 0),
    } };
  }

  bb.rpc.register(rpcContract, {
    snapshot,
    refresh: snapshot,
    openPath: async ({ path }) => {
      try {
        const { command, args } = openCommandForPlatform(process.platform, path);
        await execFileAsync(command, args, commandOptions);
        return { ok: true, message: `Opened ${path}` };
      } catch (error) { return { ok: false, message: (error as Error).message }; }
    },
    gitStatus: async ({ path }) => {
      try { return { ok: true, output: await git(path, ["status", "--short", "--branch"]) }; }
      catch (error) { return { ok: false, output: (error as Error).message }; }
    },
    prune: async ({ repoPath }) => {
      try { await git(repoPath, ["worktree", "prune"]); return { ok: true, message: "Pruned stale worktree records" }; }
      catch (error) { return { ok: false, message: (error as Error).message }; }
    },
    removeWorktree: async ({ repoPath, worktreePath }) => {
      try {
        if (await git(worktreePath, ["status", "--porcelain=v1"]).catch(() => "missing")) return { ok: false, message: "Worktree is not clean or is missing" };
        await git(repoPath, ["worktree", "remove", worktreePath]);
        return { ok: true, message: "Worktree removed" };
      } catch (error) { return { ok: false, message: (error as Error).message }; }
    },
  });
}
