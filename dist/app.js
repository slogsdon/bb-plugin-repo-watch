// bb-plugin-runtime-shim:react
var runtime = globalThis.__bbPluginRuntime;
if (runtime == null || runtime.react == null) {
  throw new Error('Cannot load "react": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod = runtime.react;
var {
  Activity,
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  act,
  cache,
  cacheSignal,
  captureOwnerStack,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  unstable_useCacheRefresh,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version
} = mod;

// bb-plugin-runtime-shim:@get-bb/plugin-sdk/app
var runtime2 = globalThis.__bbPluginRuntime;
if (runtime2 == null || runtime2.pluginSdkApp == null) {
  throw new Error('Cannot load "@get-bb/plugin-sdk/app": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod2 = runtime2.pluginSdkApp;
var {
  Markdown,
  ThreadChat,
  definePluginApp,
  experimental_NewThreadComposer,
  experimental_useSidebarThreadActions,
  experimental_useSidebarThreadPullRequest,
  experimental_useSidebarThreadSplit,
  experimental_useSidebarThreads,
  useBbContext,
  useBbNavigate,
  useComposer,
  useComposerView,
  useRealtime,
  useRealtimeConnectionState,
  useRpc,
  useSettings
} = mod2;

// bb-plugin-runtime-shim:react/jsx-runtime
var runtime3 = globalThis.__bbPluginRuntime;
if (runtime3 == null || runtime3.jsxRuntime == null) {
  throw new Error('Cannot load "react/jsx-runtime": this bundle must be loaded by the BB app, which provides the shared plugin runtime (globalThis.__bbPluginRuntime).');
}
var mod3 = runtime3.jsxRuntime;
var {
  Fragment: Fragment2,
  jsx,
  jsxs
} = mod3;

// app.tsx
function RepoWatch() {
  const rpc = useRpc();
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [statusOutput, setStatusOutput] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    setBusy(true);
    setError(null);
    void rpc.call("refresh").then((value) => setSnapshot(value)).catch((err) => setError(err.message)).finally(() => setBusy(false));
  }, [rpc]);
  useEffect(() => {
    void rpc.call("snapshot").then((value) => setSnapshot(value)).catch((err) => setError(err.message));
  }, [rpc]);
  const remove = (repoPath, worktreePath) => {
    if (!window.confirm(`Remove clean worktree ${worktreePath}?`)) return;
    void rpc.call("removeWorktree", { repoPath, worktreePath }).then((result) => {
      if (!result.ok) setError(result.message);
      else refresh();
    });
  };
  const prune = (repoPath) => {
    void rpc.call("prune", { repoPath }).then((result) => {
      if (!result.ok) setError(result.message);
      else refresh();
    });
  };
  const openPath = (path) => {
    void rpc.call("openPath", { path }).then((result) => {
      if (!result.ok) setError(result.message);
    });
  };
  const showGitStatus = (path) => {
    setStatusOutput(null);
    void rpc.call("gitStatus", { path }).then((result) => {
      if (result.ok) setStatusOutput(result.output || "Working tree clean");
      else setError(result.output);
    });
  };
  return /* @__PURE__ */ jsxs("main", { className: "h-full space-y-5 overflow-y-auto p-6", children: [
    /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: "Repo Watch" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Local repositories and worktrees needing attention." })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "rounded-md border px-3 py-2 text-sm", onClick: refresh, disabled: busy, children: busy ? "Scanning\u2026" : "Scan now" })
    ] }),
    error ? /* @__PURE__ */ jsx("p", { className: "rounded-md border border-destructive p-3 text-sm text-destructive", children: error }) : null,
    statusOutput !== null ? /* @__PURE__ */ jsx("pre", { role: "status", className: "overflow-x-auto rounded-md border bg-muted p-3 text-xs", children: statusOutput }) : null,
    /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-3", children: [["Dirty repos", snapshot?.totals.dirty ?? "\u2014"], ["Cleanup candidates", snapshot?.totals.cleanup ?? "\u2014"], ["Unmerged branches", snapshot?.totals.unmerged ?? "\u2014"]].map(([label, value]) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold", children: value }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: label })
    ] }, label)) }),
    /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
      "Roots: ",
      snapshot?.scanRoots.join(", ") ?? "loading",
      snapshot ? ` \xB7 Updated ${new Date(snapshot.fetchedAt).toLocaleTimeString()}` : ""
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children: snapshot?.repos.map((repo) => /* @__PURE__ */ jsxs("section", { className: "rounded-lg border p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-medium", children: repo.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            repo.path,
            " \xB7 ",
            repo.branch ?? "detached",
            " \xB7 base ",
            repo.defaultBranch
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: repo.isClean ? "text-xs text-muted-foreground" : "text-xs font-medium text-destructive", children: repo.isClean ? "clean" : `${repo.changedFiles} changed` })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsx("button", { className: "rounded-md border px-2 py-1 text-xs", onClick: () => openPath(repo.path), children: "Open repo" }),
        /* @__PURE__ */ jsxs("button", { className: "rounded-md border px-2 py-1 text-xs", onClick: () => showGitStatus(repo.path), children: [
          "Show git status for ",
          repo.name
        ] })
      ] }),
      repo.error ? /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-destructive", children: repo.error }) : null,
      repo.unmergedBranches.length ? /* @__PURE__ */ jsxs("p", { className: "mt-3 text-sm", children: [
        "Unmerged: ",
        repo.unmergedBranches.join(", ")
      ] }) : null,
      /* @__PURE__ */ jsx("div", { className: "mt-3 space-y-2", children: repo.worktrees.map((worktree) => /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3 text-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: "min-w-0 break-all", children: [
          worktree.path,
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: worktree.isMissing ? "missing" : worktree.isMain ? "main worktree" : worktree.needsCleanup ? "merged and clean" : worktree.branch ?? "detached" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx("button", { className: "text-xs underline", onClick: () => openPath(worktree.path), children: "Open worktree" }),
          /* @__PURE__ */ jsx("button", { className: "text-xs underline", onClick: () => showGitStatus(worktree.path), children: "Status" }),
          worktree.needsCleanup ? worktree.isMissing ? /* @__PURE__ */ jsx("button", { className: "text-xs underline", onClick: () => prune(repo.path), children: "Prune" }) : /* @__PURE__ */ jsx("button", { className: "text-xs underline", onClick: () => remove(repo.path, worktree.path), children: "Remove" }) : null
        ] })
      ] }, worktree.path)) })
    ] }, repo.path)) })
  ] });
}
var app_default = definePluginApp((app) => {
  app.slots.navPanel({ id: "repo-watch", title: "Repo Watch", icon: "GitBranch", path: "repos", component: RepoWatch });
});
export {
  app_default as default
};
