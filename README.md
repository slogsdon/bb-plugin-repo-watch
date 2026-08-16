# Repo Watch

Repo Watch adds a BB navigation screen for local git repositories. It scans configured roots and highlights:

- repositories with uncommitted changes;
- local branches not merged into the detected default branch;
- missing worktrees and clean worktrees whose branches are already merged.

The scan roots are configured in BB settings as a comma-separated list of absolute directories. The default is `/Users/shane/Code`.

Cleanup actions are guarded: removing a worktree requires a clean worktree and an explicit confirmation in the UI; stale worktree metadata is pruned with `git worktree prune`.

## Install

```sh
bb plugin install https://github.com/slogsdon/bb-plugin-repo-watch
# or, from a checkout:
bb plugin install path:path/to/bb-plugin-repo-watch
```

A **Repo Watch** navigation screen is added immediately; no configuration
is required to start scanning the default root.

## Configuration

Scan roots are a comma-separated list of absolute directories. The default
root is `/Users/shane/Code`:

```sh
bb plugin config repo-watch set scanRoots "/Users/shane/Code,/Users/shane/work"
```

Each root is scanned for uncommitted changes, branches not merged into the
detected default branch, and missing or merged worktrees.

## Development

```sh
npm install
npm run typecheck
npm run build
bb plugin install .
bb plugin dev .
```
