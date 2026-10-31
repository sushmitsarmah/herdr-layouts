# Catalog of existing Herdr layouts and mods

What was published when this repo was made (31 Oct 2026), from
[herdr.dev/layouts](https://herdr.dev/layouts/), [herdr.dev/mods](https://herdr.dev/mods/),
[herdrdev/herdr-layout-examples](https://github.com/herdrdev/herdr-layout-examples)
(commit `ed4eda7`) and the defaults shipped in
[herdrdev/herdr-app](https://github.com/herdrdev/herdr-app) (`defaults/`, herdr-app 0.1.10).

The gallery has two filters, **Examples** (by `herdrdev`) and **Community** (repos tagged
`herdr-layout` / `herdr-mod`, found by herdr.dev's crawler). The Community list was empty.
Each entry offers a one-line install prompt for an agent: “Read
~/.config/herdr-app/AGENTS.md, then add this layout: herdr.dev/layouts/herdrdev/<name>”.

## Layouts on herdr.dev (examples, by herdrdev)

| Layout | What it is | Its mods |
| --- | --- | --- |
| [Board](https://github.com/herdrdev/herdr-layout-examples/tree/main/board) | Agents as cards in four columns: Needs you, Working, Done and Idle. Click a card and its tab's live terminals fill the workspace below. | `board` |
| [Call](https://github.com/herdrdev/herdr-layout-examples/tree/main/call) | A pretend team call with live terminals as shared screens. Agents in other tabs sit in the gallery; working ones speak, and blocked ones raise a hand. | `call` |
| [Chat](https://github.com/herdrdev/herdr-layout-examples/tree/main/chat) | Spaces look like channels and agents look like teammates posting updates. Open an agent's thread to see its tab's real terminals on the right. | `chat` |
| [Code](https://github.com/herdrdev/herdr-layout-examples/tree/main/code) | A familiar dark editor around your terminals. The explorer lists real files, but the code view is a fixed, read-only slice of one CSS file. | `vsc` |
| [Mission](https://github.com/herdrdev/herdr-layout-examples/tree/main/mission) | A green mission-control screen. The active tab's terminals are command feeds; agents in other tabs form a two-row status array below. | `mission` |
| [Pasture](https://github.com/herdrdev/herdr-layout-examples/tree/main/pasture) | Your agents as a herd of sheep. Working sheep wander, idle ones graze, finished ones sleep, and one that needs you jumps with a bubble. Click a sheep and its terminals open in the workshed below. | `pasture` |
| [Threads](https://github.com/herdrdev/herdr-layout-examples/tree/main/threads) | Every tab becomes a thread in a project inbox. Pin, snooze or settle work, send follow-ups below the live terminal, and read files or diffs on the right. | `t4-*` (several) |

## Mods on herdr.dev (examples, by herdrdev)

| Mod | What it is |
| --- | --- |
| [Tmux prefix](https://github.com/herdrdev/herdr-layout-examples/tree/main/tmux-prefix) | Ctrl+B, then a key: tmux-style shortcuts for tabs, panes and spaces, with a popup hint. Ships a `keys.json` snippet. |

## Shipped with the app (`herdr-app/defaults/`)

Layouts: `main` (the default Herdr window), `terminals`, `win98`.

Mods: `agents`, `changes`, `confirm`, `files`, `help`, `machine-add`, `menu`, `new-menu`,
`pane`, `peek`, `picker`, `prompt`, `spaces`, `tabs`, `terminals-bar`, `terminals-pane`,
`toast`, `win98`, `workspace-chrome`, `workspace-status`, `worktree`. Frames (app dialogs
built the same way): `feedback`, `palette`, `settings`, `welcome`, `whatsnew`.

The new items in this repo use names that clash with none of these.
