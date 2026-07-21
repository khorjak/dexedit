# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

dexEdit: a terminal text editor built on [OpenTUI](https://github.com/sst/opentui) (`@opentui/core`), run with Bun. Single-window app, no build step — TypeScript is run directly by Bun and only typechecked (not compiled) via `tsc`.

## Commands

```bash
bun install                    # install deps
bun run src/index.ts [file]    # run (or: bun start -- [file])
bun run --watch src/index.ts   # dev, restarts on save (or: bun dev)
bunx tsc --noEmit              # typecheck (tsconfig has noEmit: true, strict: true)
bun run build                  # compile standalone dist/dexedit.exe (Windows x64)
bun run build:linux            # compile dist/dexedit-linux-x64
bun run build:macos-arm64      # compile dist/dexedit-macos-arm64
bun run build:macos-x64        # compile dist/dexedit-macos-x64
bun run build:all              # compile all of the above (bun build --compile, cross-target via --target)
```

There is no test suite and no lint config in this repo — don't assume `bun test` or a linter exists.

`process.argv[2]` is the optional startup file path (see `src/index.ts`). If it exists it's loaded; if not, dexEdit starts a new buffer pointed at that path so `Ctrl+S` saves there directly.

## Keeping docs in sync

Update `README.md` (user-facing usage/keybindings) and this file (architecture/dev commands) as part of the same change whenever code changes make them stale — new/changed commands, keybindings, files, or documented behavior. Don't treat it as a separate follow-up.

## Architecture

Everything lives flat in `src/`, one file per concern:

- `index.ts` — entry point: creates the renderer (`exitOnCtrlC: false`, since `Ctrl+C` is repurposed for copy), constructs `App`, loads the startup file if given.
- `app.ts` — the whole application. Owns the `TextareaRenderable` (main buffer), `LineNumberRenderable` gutter, title/status bars, and all four overlays (`FileDialog`, `ConfirmBox`, `FindBar`, `PromptBar`). All commands (open/save/find/goto/theme-cycle/etc.) are private methods here.
- `fileDialog.ts` — the Ctrl+O / Ctrl+Shift+S file browser modal (path input + filename input + directory `SelectRenderable` list).
- `confirmBox.ts` — Y/N modal for unsaved-changes prompts.
- `findBar.ts` / `promptBar.ts` — bottom-of-screen bars for find and goto-line. `FindBar` stays open across repeated "find next" presses; `PromptBar` is one-shot (single value, then closes).
- `fsUtils.ts` — plain directory-listing/formatting helpers used by `fileDialog.ts`.
- `theme.ts` — the `Theme` type (14 hex-string color roles) and the six built-in palettes: Catppuccin Mocha/Macchiato/Latte/Frappé, Dracula, Nord.
- `themeConfig.ts` — loads/saves the active theme name to `~/.dexeditrc.json`; falls back silently to the first theme (Mocha) on a missing/corrupt file or an unrecognized theme name.

### Global key routing

`App` registers exactly one listener: `renderer.keyInput.on("keypress", ...)` in `handleGlobalKey`. This is intentional and load-bearing, not incidental — OpenTUI's `InternalKeyHandler` runs listeners added via plain `.on()` *before* the focused widget's own `handleKeyPress` (see `emitWithPriority` in `@opentui/core`'s compiled `index-za1krqsf.js`), and a `key.preventDefault()` call there stops the event from ever reaching the focused renderable. So `handleGlobalKey` is the single place that:

1. Routes keys to whichever overlay is currently open (dialog / confirm / find / prompt), each gated by an early `return` so only one is "active" at a time.
2. Owns every `Ctrl+...` app-level shortcut (open/save/new/quit/copy/cut/find/goto), calling `preventDefault()` so the shortcut never falls through into the textarea as a literal keystroke.
3. Lets everything else (typing, arrows, standard editing keys) fall through untouched to whatever's focused.

When adding a new shortcut or overlay, it goes in this method, following the same early-return-per-overlay pattern.

### Focus discipline

OpenTUI does **not** auto-blur the previously-focused renderable when you call `.focus()` on a new one — if two widgets are both "focused" at once, both receive every keystroke. Every place that shifts focus in this codebase explicitly blurs the old widget first (e.g. `this.textarea.blur()` before opening a dialog, `.focus()` back on the textarea when a dialog/overlay resolves). Keep that pairing when adding new overlays or focus targets.

### Overlays are promise-based

`FileDialog.open()`, `ConfirmBox.ask()`, and `PromptBar.ask()` all return a `Promise` that resolves when the overlay closes (with the chosen path / boolean / typed value, or `null`/`false` on cancel). Callers in `app.ts` `await` them directly (e.g. `newFile`, `openDialog`, `saveAs`, `openGoto`) rather than using callbacks. `FindBar` is the exception — it has no single resolution point since it supports repeated "find next"/"find previous" while staying open, so it's driven by direct method calls (`open()`/`close()`) instead.

### Polling instead of trusting OpenTUI's change events

`onCursorChange` (fires on `EditBuffer`'s `"cursor-changed"` event) and `onContentChange` (`"content-changed"`) do **not** fire for every mutation. Specifically: vertical cursor movement goes through `EditorView.moveUpVisual`/`moveDownVisual`, which never touches `EditBuffer`'s cursor and so never fires `"cursor-changed"`; undo/redo similarly doesn't reliably fire `"content-changed"`. Relying on these events caused two real bugs (Ln/Col not updating on arrow up/down; the modified indicator staying stuck after undo).

The fix, and the pattern to follow for anything similar: `handleGlobalKey` schedules `queueMicrotask(() => { this.syncModifiedState(); this.updateStatus(); })` on *every* keypress. Because the microtask runs after the synchronous keypress-dispatch chain (global listener → focused widget's `handleKeyPress`) has fully completed, it reflects the true post-mutation state regardless of which internal code path made the change. `syncModifiedState()` itself recomputes `modified` by comparing `textarea.plainText` against a tracked `savedText` snapshot (updated on load/save) rather than latching a boolean to `true` on any change event — that's what makes undo-back-to-saved-state correctly clear the indicator.

One exception: `openGoto()` calls `this.updateStatus()` explicitly right after `gotoLine()`, because that mutation happens inside an `await`ed promise continuation (from `PromptBar`) where the ordering against the queued microtask isn't guaranteed.

### Reading OpenTUI's API

`@opentui/core` ships only compiled output + `.d.ts` files in `node_modules/@opentui/core` — no bundled docs, no source. The `.d.ts` files (e.g. `renderables/*.d.ts`, `edit-buffer.d.ts`, `editor-view.d.ts`, `Renderable.d.ts`, `renderer.d.ts`) are the primary reference for what's public. For *behavior* that isn't obvious from types alone (event ordering, default keybindings, what a setter actually triggers), grep the compiled chunks directly — `index.js`, `index-7z5n7k9m.js`, `index-za1krqsf.js` — they're deterministically-named esbuild output, not obfuscated, and searchable for the actual implementation (e.g. `defaultTextareaKeyBindings`, `mergeKeyBindings`, `emitWithPriority`).

Renderables are constructed as plain classes: `new SomeRenderable(ctx, options)` where `ctx` is the `CliRenderer` (which implements `RenderContext`), then composed with `.add()`. This codebase does not use the functional/JSX-style construct API (`Box()`, `Text()`, etc. from `renderables/composition/constructs.js`) that the `create-tui` scaffold ships by default — it was dropped in favor of direct class instantiation because the app needs fine-grained imperative control over focus and visibility that doesn't map cleanly onto that API.

### Colors

`TextRenderable`/`TextBufferRenderable`-family options use `fg`/`bg`. `BoxRenderable` and the `EditBuffer`-family (`TextareaRenderable`, `InputRenderable`) use `textColor`/`backgroundColor`. These are genuinely different option shapes per base class, not a typo — mixing them up is a compile error caught by `tsc`, not a runtime bug.

Colors come from a `Theme` object (`theme.ts`), not scattered literals. Each renderable is still constructed with a hardcoded Mocha hex value (so it type-checks and looks correct even before the first `applyTheme` call), but `App.applyTheme(theme)` — and a matching `applyTheme(theme)` on each overlay class (`FileDialog`, `ConfirmBox`, `FindBar`, `PromptBar`) — then overwrites every color property from the active `Theme`. This runs once at startup (after `themeConfig.loadThemeName()` resolves the persisted choice) and again on every `Ctrl+T` cycle. `titleBar` and `statusBar` in `app.ts` are `private readonly` instance fields (not constructor-local `const`s) specifically so `applyTheme` can reach them after construction. OpenTUI's renderable color properties (`textColor`, `backgroundColor`, `fg`, `bg`, `borderColor`, etc.) have real setters, so this repaints already-rendered widgets in place — no renderable is ever recreated to change theme.
