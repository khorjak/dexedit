# dexEdit

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
bun run build   # produces dist/dexedit.exe
```

Then put it on your `PATH` so `dexedit [file]` works from anywhere, e.g.:

```powershell
mkdir $env:LOCALAPPDATA\dexedit -ErrorAction SilentlyContinue
copy dist\dexedit.exe $env:LOCALAPPDATA\dexedit\dexedit.exe
# add %LOCALAPPDATA%\dexedit to your PATH (System Properties > Environment Variables), then open a new terminal
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
| Arrows, `Home`/`End`, `Ctrl+Home`/`Ctrl+End`, `PageUp`/`PageDown`, `Shift+…` | Navigation & selection |

### File dialog (`Ctrl+O` / `Ctrl+Shift+S`)

- Type a path in the top field and press `Enter` to navigate into a directory or open/save a file.
- Use the list below to browse entries; `Enter` on a directory navigates in, `Enter` on a file opens it (Open mode) or fills the filename field (Save mode).
- `Tab` / `Shift+Tab` cycles focus between the path field, filename field (Save mode), and the list.
- `Esc` cancels.

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.
