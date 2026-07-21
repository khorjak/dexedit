# dexEdit

[![GitHub](https://img.shields.io/github/stars/khorjak/dexedit?style=flat)](https://github.com/khorjak/dexedit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Terminal text editor built on [OpenTUI](https://git.new/create-tui).

## Install

```bash
bun install
```

## Run

```bash
bun run src/index.ts [file]
# or
bun start -- [file]
```

`file` is optional. If given and it exists, it's opened; if it doesn't exist, dexEdit starts a new buffer pointed at that path (saved there on `Ctrl+S`). If omitted, dexEdit starts with an empty, unsaved buffer.

## Install as a `dexedit` command

Build a standalone executable — no Bun/Node install required to run it:

```bash
bun run build              # Windows x64, produces dist/dexedit.exe
bun run build:linux        # Linux x64, produces dist/dexedit-linux-x64
bun run build:macos-arm64  # macOS Apple Silicon, produces dist/dexedit-macos-arm64
bun run build:macos-x64    # macOS Intel, produces dist/dexedit-macos-x64
bun run build:all          # all of the above
```

Cross-compiling (e.g. building the Linux/macOS binaries from Windows) is supported by Bun's `--target` flag — no matching OS required to build.

Then put it on your `PATH` so `dexedit [file]` works from anywhere, e.g. on Windows:

```powershell
mkdir $env:LOCALAPPDATA\dexedit -ErrorAction SilentlyContinue
copy dist\dexedit.exe $env:LOCALAPPDATA\dexedit\dexedit.exe
# add %LOCALAPPDATA%\dexedit to your PATH (System Properties > Environment Variables), then open a new terminal
```

Or on Linux/macOS:

```bash
mkdir -p ~/.local/bin
cp dist/dexedit-linux-x64 ~/.local/bin/dexedit   # or the macOS binary for your arch
chmod +x ~/.local/bin/dexedit
# ensure ~/.local/bin is on your PATH
```

## Keybindings

| Key | Action |
| --- | --- |
| `Ctrl+O` | Open file (file browser dialog) |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As (file browser dialog) |
| `Ctrl+N` | New file |
| `Ctrl+Q` | Quit |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+A` | Select all |
| `Ctrl+C` / `Ctrl+X` | Copy / Cut selection |
| `Ctrl+F` | Find (Enter/↓ next, ↑ previous, Esc close) |
| `Ctrl+G` | Go to line |
| `Ctrl+T` | Cycle color theme |
| Arrows, `Home`/`End`, `Ctrl+Home`/`Ctrl+End`, `PageUp`/`PageDown`, `Shift+…` | Navigation & selection |

### File dialog (`Ctrl+O` / `Ctrl+Shift+S`)

- Type a path in the top field and press `Enter` to navigate into a directory or open/save a file.
- Use the list below to browse entries; `Enter` on a directory navigates in, `Enter` on a file opens it (Open mode) or fills the filename field (Save mode).
- `Tab` / `Shift+Tab` cycles focus between the path field, filename field (Save mode), and the list.
- `Esc` cancels.

## Themes

`Ctrl+T` cycles through six built-in themes, in order: Catppuccin Mocha (default) → Catppuccin Macchiato → Catppuccin Latte → Catppuccin Frappé → Dracula → Nord. The active theme name is shown in the status bar. The chosen theme is saved to `~/.dexeditrc.json` and restored on the next launch; if that file is missing or corrupt, dexEdit silently falls back to Catppuccin Mocha.

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
