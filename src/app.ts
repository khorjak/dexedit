import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import {
  BoxRenderable,
  TextRenderable,
  TextareaRenderable,
  LineNumberRenderable,
  TextAttributes,
  type CliRenderer,
  type KeyEvent,
  type KeyBinding,
} from "@opentui/core";
import { FileDialog } from "./fileDialog";
import { ConfirmBox } from "./confirmBox";
import { FindBar } from "./findBar";
import { PromptBar } from "./promptBar";
import { themes, type Theme } from "./theme";
import { loadThemeName, saveThemeName } from "./themeConfig";

const EDITOR_KEY_BINDINGS: KeyBinding[] = [
  { name: "home", action: "line-home" },
  { name: "end", action: "line-end" },
  { name: "home", shift: true, action: "select-line-home" },
  { name: "end", shift: true, action: "select-line-end" },
  { name: "home", ctrl: true, action: "buffer-home" },
  { name: "end", ctrl: true, action: "buffer-end" },
  { name: "home", ctrl: true, shift: true, action: "select-buffer-home" },
  { name: "end", ctrl: true, shift: true, action: "select-buffer-end" },
  { name: "a", ctrl: true, action: "select-all" },
  { name: "z", ctrl: true, action: "undo" },
  { name: "y", ctrl: true, action: "redo" },
];

export class App {
  private readonly renderer: CliRenderer;
  private readonly root: BoxRenderable;
  private readonly titleText: TextRenderable;
  private readonly hotkeysText: TextRenderable;
  private readonly titleBar: BoxRenderable;
  private readonly textarea: TextareaRenderable;
  private readonly lineNumbers: LineNumberRenderable;
  private readonly statusLeft: TextRenderable;
  private readonly statusRight: TextRenderable;
  private readonly statusBar: BoxRenderable;
  private readonly fileDialog: FileDialog;
  private readonly confirmBox: ConfirmBox;
  private readonly findBar: FindBar;
  private readonly promptBar: PromptBar;

  private filePath: string | null = null;
  private modified = false;
  private savedText = "";
  private suppressChange = false;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private findAnchor = 0;
  private themeIndex: number;

  constructor(renderer: CliRenderer) {
    this.renderer = renderer;
    this.themeIndex = Math.max(
      0,
      themes.findIndex((t) => t.name === loadThemeName()),
    );

    this.root = new BoxRenderable(renderer, {
      flexGrow: 1,
      flexDirection: "column",
      backgroundColor: "#1e1e2e",
    });

    this.titleText = new TextRenderable(renderer, {
      content: " dexEdit",
      fg: "#11111b",
      attributes: TextAttributes.BOLD,
    });
    this.hotkeysText = new TextRenderable(renderer, {
      content: "^O Open  ^S Save  ^N New  ^F Find  ^G Goto  ^T Theme  ^Q Quit ",
      fg: "#11111b",
    });
    this.titleBar = new BoxRenderable(renderer, {
      height: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#89b4fa",
    });
    this.titleBar.add(this.titleText);
    this.titleBar.add(this.hotkeysText);

    this.textarea = new TextareaRenderable(renderer, {
      flexGrow: 1,
      backgroundColor: "#1e1e2e",
      textColor: "#cdd6f4",
      cursorColor: "#f5e0dc",
      selectionBg: "#45475a",
      wrapMode: "none",
      scrollMargin: 2,
      keyBindings: EDITOR_KEY_BINDINGS,
      onCursorChange: () => this.updateStatus(),
      onContentChange: () => this.handleContentChange(),
    });

    this.lineNumbers = new LineNumberRenderable(renderer, {
      target: this.textarea,
      flexGrow: 1,
      fg: "#6c7086",
      bg: "#181825",
      minWidth: 4,
      paddingRight: 1,
    });

    this.statusLeft = new TextRenderable(renderer, {
      content: "",
      height: 1,
      fg: "#11111b",
    });
    this.statusRight = new TextRenderable(renderer, {
      content: "",
      height: 1,
      fg: "#11111b",
    });
    this.statusBar = new BoxRenderable(renderer, {
      height: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#89b4fa",
      paddingLeft: 1,
      paddingRight: 1,
    });
    this.statusBar.add(this.statusLeft);
    this.statusBar.add(this.statusRight);

    this.fileDialog = new FileDialog(renderer);
    this.confirmBox = new ConfirmBox(renderer);
    this.findBar = new FindBar(renderer);
    this.promptBar = new PromptBar(renderer);
    this.findBar.onInput((value) => this.performFind(value, false, this.findAnchor));

    this.root.add(this.titleBar);
    this.root.add(this.lineNumbers);
    this.root.add(this.findBar.root);
    this.root.add(this.promptBar.root);
    this.root.add(this.statusBar);

    renderer.root.add(this.root);
    renderer.root.add(this.fileDialog.root);
    renderer.root.add(this.confirmBox.root);

    this.applyTheme(themes[this.themeIndex] ?? themes[0]!);

    renderer.keyInput.on("keypress", (key) => this.handleGlobalKey(key));

    this.textarea.focus();
    this.updateChrome();
  }

  async loadFile(path: string | null): Promise<void> {
    if (!path) {
      this.filePath = null;
      this.setContent("");
      this.updateChrome();
      return;
    }
    const abs = resolve(path);
    this.filePath = abs;
    try {
      if (existsSync(abs) && statSync(abs).isFile()) {
        const content = readFileSync(abs, "utf8");
        this.setContent(content);
        this.flash(`Opened ${abs}`);
      } else {
        this.setContent("");
        this.flash(`New file ${abs}`);
      }
    } catch (err) {
      this.setContent("");
      this.flash(`Error opening ${abs}: ${(err as Error).message}`);
    }
    this.updateChrome();
  }

  private setContent(text: string): void {
    this.suppressChange = true;
    this.textarea.setText(text);
    this.modified = false;
    // Compare against what the buffer actually normalizes to (e.g. it strips \r
    // from CRLF line endings), not the raw input string — otherwise a CRLF file
    // is permanently "modified" from the moment it loads, since plainText can
    // never equal the untouched disk bytes again no matter how much you undo.
    this.savedText = this.textarea.plainText;
    queueMicrotask(() => {
      this.suppressChange = false;
    });
  }

  private handleContentChange(): void {
    if (this.suppressChange) return;
    this.syncModifiedState();
  }

  /**
   * Recompute `modified` against the last-saved snapshot instead of latching to
   * true. Some mutations (notably undo/redo) don't reliably fire the native
   * "content-changed" event this used to depend on, the same way vertical cursor
   * moves don't fire "cursor-changed" — so this is also polled after every
   * keypress (see handleGlobalKey) rather than trusted to run only from there.
   */
  private syncModifiedState(): void {
    const dirty = this.textarea.plainText !== this.savedText;
    if (dirty !== this.modified) {
      this.modified = dirty;
      this.updateChrome();
    }
  }

  private focusEditor(): void {
    this.textarea.focus();
  }

  private updateChrome(): void {
    const name = this.filePath ? basename(this.filePath) : "Untitled";
    const dirty = this.modified ? " •" : "";
    this.titleText.content = ` dexEdit — ${name}${dirty}`;
    this.renderer.setTerminalTitle(`dexEdit — ${name}${dirty}`);
    this.updateStatus();
  }

  private updateStatus(): void {
    const cursor = this.textarea.logicalCursor;
    const lines = this.textarea.lineCount;
    this.statusLeft.content = ` Ln ${cursor.row + 1}, Col ${cursor.col + 1}  |  ${lines} lines  `;
    const path = this.filePath ?? "unsaved";
    const themeName = (themes[this.themeIndex] ?? themes[0]!).name;
    this.statusRight.content = `${this.modified ? "● modified" : "saved"}  |  ${themeName}  |  ${path} `;
  }

  private flash(message: string): void {
    this.statusLeft.content = ` ${message}`;
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.updateStatus();
      this.renderer.requestRender();
    }, 2500);
  }

  private applyTheme(theme: Theme): void {
    this.root.backgroundColor = theme.base;
    this.titleText.fg = theme.crust;
    this.hotkeysText.fg = theme.crust;
    this.titleBar.backgroundColor = theme.blue;
    this.textarea.backgroundColor = theme.base;
    this.textarea.textColor = theme.text;
    this.textarea.cursorColor = theme.rosewater;
    this.textarea.selectionBg = theme.surface1;
    this.lineNumbers.fg = theme.overlay0;
    this.lineNumbers.bg = theme.mantle;
    this.statusLeft.fg = theme.crust;
    this.statusRight.fg = theme.crust;
    this.statusBar.backgroundColor = theme.blue;
    this.fileDialog.applyTheme(theme);
    this.confirmBox.applyTheme(theme);
    this.findBar.applyTheme(theme);
    this.promptBar.applyTheme(theme);
    this.renderer.requestRender();
  }

  private cycleTheme(): void {
    this.themeIndex = (this.themeIndex + 1) % themes.length;
    const theme = themes[this.themeIndex] ?? themes[0]!;
    this.applyTheme(theme);
    saveThemeName(theme.name);
    this.flash(`Theme: ${theme.name}`);
  }

  // ---- commands ----

  private async newFile(): Promise<void> {
    if (this.modified) {
      const ok = await this.confirmBox.ask("Discard unsaved changes and start a new file?");
      if (!ok) return;
    }
    this.filePath = null;
    this.setContent("");
    this.updateChrome();
  }

  private async openDialog(): Promise<void> {
    this.textarea.blur();
    const chosen = await this.fileDialog.open("open", this.filePath ?? process.cwd());
    if (chosen) {
      if (this.modified) {
        const ok = await this.confirmBox.ask("Discard unsaved changes and open the selected file?");
        if (ok) await this.loadFile(chosen);
      } else {
        await this.loadFile(chosen);
      }
    }
    this.focusEditor();
  }

  private async save(): Promise<void> {
    if (!this.filePath) {
      await this.saveAs();
      return;
    }
    this.writeToDisk(this.filePath);
  }

  private async saveAs(): Promise<void> {
    this.textarea.blur();
    const target = await this.fileDialog.open("save", this.filePath ?? process.cwd());
    if (target) {
      if (existsSync(target)) {
        const ok = await this.confirmBox.ask(`Overwrite ${target}?`);
        if (ok) this.writeToDisk(target);
      } else {
        this.writeToDisk(target);
      }
    }
    this.focusEditor();
  }

  private writeToDisk(path: string): void {
    try {
      const text = this.textarea.plainText;
      writeFileSync(path, text, "utf8");
      this.filePath = path;
      this.modified = false;
      this.savedText = text;
      this.flash(`Saved ${path}`);
    } catch (err) {
      this.flash(`Error saving: ${(err as Error).message}`);
    }
    this.updateChrome();
  }

  private async quit(): Promise<void> {
    if (this.modified) {
      const ok = await this.confirmBox.ask("Unsaved changes will be lost. Quit anyway?");
      if (!ok) return;
    }
    this.renderer.destroy();
    process.exit(0);
  }

  private copy(): void {
    if (!this.textarea.hasSelection()) return;
    const text = this.textarea.getSelectedText();
    this.renderer.copyToClipboardOSC52(text);
    this.flash("Copied selection to clipboard");
  }

  private cut(): void {
    if (!this.textarea.hasSelection()) return;
    const text = this.textarea.getSelectedText();
    this.renderer.copyToClipboardOSC52(text);
    this.textarea.deleteSelection();
    this.flash("Cut selection to clipboard");
  }

  private openFind(): void {
    this.findAnchor = this.textarea.cursorOffset;
    this.textarea.blur();
    this.findBar.open();
  }

  private closeFind(): void {
    this.findBar.close();
    this.focusEditor();
  }

  private performFind(term: string, reverse: boolean, from: number): void {
    if (!term) return;
    const hay = this.textarea.plainText.toLowerCase();
    const needle = term.toLowerCase();
    let idx: number;
    if (reverse) {
      idx = hay.lastIndexOf(needle, Math.max(0, from - 1));
      if (idx === -1) idx = hay.lastIndexOf(needle);
    } else {
      idx = hay.indexOf(needle, from);
      if (idx === -1) idx = hay.indexOf(needle);
    }
    if (idx === -1) {
      this.flash(`Not found: ${term}`);
      return;
    }
    this.textarea.setSelection(idx, idx + term.length);
    this.textarea.cursorOffset = idx + term.length;
    this.findAnchor = reverse ? idx : idx + term.length;
  }

  private findNext(reverse: boolean): void {
    this.performFind(this.findBar.input.value, reverse, this.findAnchor);
  }

  private async openGoto(): Promise<void> {
    this.textarea.blur();
    const value = await this.promptBar.ask(`Go to line (1-${this.textarea.lineCount}):`);
    this.focusEditor();
    if (!value) return;
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) {
      this.flash("Invalid line number");
      return;
    }
    const line = Math.min(Math.max(n - 1, 0), Math.max(this.textarea.lineCount - 1, 0));
    this.textarea.gotoLine(line);
    this.updateStatus();
  }

  // ---- key routing ----

  private handleGlobalKey(key: KeyEvent): void {
    // Vertical cursor movement (EditorView.moveUpVisual/moveDownVisual) and undo/redo
    // don't reliably fire the EditBuffer "cursor-changed"/"content-changed" events that
    // onCursorChange/onContentChange rely on. Poll real cursor + modified state once this
    // key event has fully finished dispatching (i.e. after the focused Textarea's own
    // handleKeyPress has run) instead of trusting those events alone.
    queueMicrotask(() => {
      this.syncModifiedState();
      this.updateStatus();
    });

    if (this.fileDialog.visible) {
      if (key.name === "escape") {
        this.fileDialog.cancel();
        key.preventDefault();
      } else if (key.name === "tab") {
        this.fileDialog.cycleFocus(key.shift);
        key.preventDefault();
      }
      return;
    }

    if (this.confirmBox.visible) {
      if (key.name === "y") {
        this.confirmBox.confirm();
      } else {
        this.confirmBox.cancel();
      }
      key.preventDefault();
      return;
    }

    if (this.findBar.visible) {
      if (key.name === "escape") {
        this.closeFind();
        key.preventDefault();
      } else if (key.name === "return" || key.name === "down") {
        this.findNext(false);
        key.preventDefault();
      } else if (key.name === "up") {
        this.findNext(true);
        key.preventDefault();
      }
      return;
    }

    if (this.promptBar.visible) {
      if (key.name === "escape") {
        this.promptBar.cancel();
        this.focusEditor();
        key.preventDefault();
      }
      return;
    }

    if (key.name === "pageup" || key.name === "pagedown") {
      const height = Math.max(1, this.textarea.editorView.getViewport().height);
      const down = key.name === "pagedown";
      for (let i = 0; i < height; i++) {
        if (down) this.textarea.moveCursorDown({ select: key.shift });
        else this.textarea.moveCursorUp({ select: key.shift });
      }
      key.preventDefault();
      return;
    }

    if (key.ctrl && !key.meta) {
      switch (key.name) {
        case "o":
          this.openDialog();
          key.preventDefault();
          return;
        case "s":
          if (key.shift) this.saveAs();
          else this.save();
          key.preventDefault();
          return;
        case "n":
          this.newFile();
          key.preventDefault();
          return;
        case "q":
          this.quit();
          key.preventDefault();
          return;
        case "c":
          this.copy();
          key.preventDefault();
          return;
        case "x":
          this.cut();
          key.preventDefault();
          return;
        case "f":
          this.openFind();
          key.preventDefault();
          return;
        case "g":
          this.openGoto();
          key.preventDefault();
          return;
        case "t":
          this.cycleTheme();
          key.preventDefault();
          return;
      }
    }
  }
}
