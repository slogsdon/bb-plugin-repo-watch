import { useCallback, useEffect, useState } from "react";
import { definePluginApp, useRpc } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "./server";

type Worktree = { path: string; branch: string | null; isMain: boolean; isMissing: boolean; isClean: boolean | null; isMerged: boolean; needsCleanup: boolean };
type Repo = { path: string; name: string; branch: string | null; defaultBranch: string; isClean: boolean; changedFiles: number; unmergedBranches: string[]; worktrees: Worktree[]; error: string | null };
type Snapshot = { fetchedAt: string; scanRoots: string[]; repos: Repo[]; totals: { dirty: number; cleanup: number; unmerged: number } };

function RepoWatch() {
  const rpc = useRpc<typeof rpcContract>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    setBusy(true); setError(null);
    void rpc.call("refresh").then((value) => setSnapshot(value as Snapshot)).catch((err: Error) => setError(err.message)).finally(() => setBusy(false));
  }, [rpc]);
  useEffect(() => { void rpc.call("snapshot").then((value) => setSnapshot(value as Snapshot)).catch((err: Error) => setError(err.message)); }, [rpc]);
  const remove = (repoPath: string, worktreePath: string) => {
    if (!window.confirm(`Remove clean worktree ${worktreePath}?`)) return;
    void rpc.call("removeWorktree", { repoPath, worktreePath }).then((result) => { if (!result.ok) setError(result.message); else refresh(); });
  };
  const prune = (repoPath: string) => { void rpc.call("prune", { repoPath }).then((result) => { if (!result.ok) setError(result.message); else refresh(); }); };
  return <main className="space-y-5 p-6">
    <header className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Repo Watch</h1><p className="text-sm text-muted-foreground">Local repositories and worktrees needing attention.</p></div><button className="rounded-md border px-3 py-2 text-sm" onClick={refresh} disabled={busy}>{busy ? "Scanning…" : "Scan now"}</button></header>
    {error ? <p className="rounded-md border border-destructive p-3 text-sm text-destructive">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-3">{[["Dirty repos", snapshot?.totals.dirty ?? "—"], ["Cleanup candidates", snapshot?.totals.cleanup ?? "—"], ["Unmerged branches", snapshot?.totals.unmerged ?? "—"]].map(([label, value]) => <div className="rounded-lg border p-4" key={label}><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div>
    <p className="text-xs text-muted-foreground">Roots: {snapshot?.scanRoots.join(", ") ?? "loading"}{snapshot ? ` · Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}` : ""}</p>
    <div className="space-y-3">{snapshot?.repos.map((repo) => <section className="rounded-lg border p-4" key={repo.path}><div className="flex items-start justify-between gap-3"><div><h2 className="font-medium">{repo.name}</h2><p className="text-xs text-muted-foreground">{repo.path} · {repo.branch ?? "detached"} · base {repo.defaultBranch}</p></div><span className={repo.isClean ? "text-xs text-muted-foreground" : "text-xs font-medium text-destructive"}>{repo.isClean ? "clean" : `${repo.changedFiles} changed`}</span></div>{repo.error ? <p className="mt-3 text-sm text-destructive">{repo.error}</p> : null}{repo.unmergedBranches.length ? <p className="mt-3 text-sm">Unmerged: {repo.unmergedBranches.join(", ")}</p> : null}<div className="mt-3 space-y-2">{repo.worktrees.filter((worktree) => worktree.needsCleanup).map((worktree) => <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3 text-sm" key={worktree.path}><span>{worktree.path} <span className="text-xs text-muted-foreground">{worktree.isMissing ? "missing" : "merged and clean"}</span></span>{worktree.isMissing ? <button className="text-xs underline" onClick={() => prune(repo.path)}>Prune</button> : <button className="text-xs underline" onClick={() => remove(repo.path, worktree.path)}>Remove</button>}</div>)}</div></section>)}</div>
  </main>;
}

export default definePluginApp((app) => {
  app.slots.navPanel({ id: "repo-watch", title: "Repo Watch", icon: "GitBranch", path: "repos", component: RepoWatch });
});
