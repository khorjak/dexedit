import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import {
  BoxRenderable,
  TextRenderable,
  InputRenderable,
  SelectRenderable,
  InputRenderableEvents,
  SelectRenderableEvents,
  TextAttributes,
  type RenderContext,
  type SelectOption,
} from "@opentui/core";
import { listDir, formatSize } from "./fsUtils";

export type FileDialogMode = "open" | "save";

interface EntryValue {
  path: string;
  isDir: boolean;
}

export class FileDialog {
  readonly root: BoxRenderable;
  readonly pathInput: InputRenderable;
  readonly nameInput: InputRenderable;
  readonly list: SelectRenderable;
  private hintText: TextRenderable;
  private errorText: TextRenderable;

  private mode: FileDialogMode = "open";
  private dir: string = process.cwd();
  private resolver: ((value: string | null) => void) | null = null;
  private focusables: (InputRenderable | SelectRenderable)[] = [];
  private focusIdx = 0;

  constructor(ctx: RenderContext) {
    this.root = new BoxRenderable(ctx, {
      id: "file-dialog",
      position: "absolute",
      top: 2,
      left: 4,
      right: 4,
      bottom: 2,
      border: true,
      borderStyle: "rounded",
      borderColor: "#89b4fa",
      backgroundColor: "#1e1e2e",
      title: "Open File",
      titleAlignment: "center",
      zIndex: 100,
      visible: false,
      flexDirection: "column",
      padding: 1,
      rowGap: 1,
    });

    this.pathInput = new InputRenderable(ctx, {
      backgroundColor: "#313244",
      textColor: "#cdd6f4",
      focusedBackgroundColor: "#45475a",
      focusedTextColor: "#cdd6f4",
      placeholder: "directory path…",
    });

    this.nameInput = new InputRenderable(ctx, {
      backgroundColor: "#313244",
      textColor: "#cdd6f4",
      focusedBackgroundColor: "#45475a",
      focusedTextColor: "#cdd6f4",
      placeholder: "file name…",
      visible: false,
    });

    this.list = new SelectRenderable(ctx, {
      flexGrow: 1,
      backgroundColor: "#1e1e2e",
      textColor: "#cdd6f4",
      focusedBackgroundColor: "#1e1e2e",
      focusedTextColor: "#cdd6f4",
      selectedBackgroundColor: "#45475a",
      selectedTextColor: "#f5e0dc",
      descriptionColor: "#a6adc8",
      selectedDescriptionColor: "#bac2de",
      showDescription: true,
      wrapSelection: true,
    });

    this.errorText = new TextRenderable(ctx, {
      content: "",
      fg: "#f38ba8",
      height: 1,
    });

    this.hintText = new TextRenderable(ctx, {
      content: "Enter: open/select   Tab: switch focus   Backspace on empty path: up   Esc: cancel",
      attributes: TextAttributes.DIM,
      fg: "#a6adc8",
      height: 1,
    });

    this.root.add(this.pathInput);
    this.root.add(this.nameInput);
    this.root.add(this.list);
    this.root.add(this.errorText);
    this.root.add(this.hintText);

    this.pathInput.on(InputRenderableEvents.ENTER, (value: string) => this.handlePathEnter(value));
    this.nameInput.on(InputRenderableEvents.ENTER, (value: string) => this.handleSaveConfirm(value));
    this.list.on(SelectRenderableEvents.ITEM_SELECTED, (_index: number, option: SelectOption) =>
      this.handleEntryChosen(option),
    );
  }

  get visible(): boolean {
    return this.root.visible;
  }

  open(mode: FileDialogMode, startPath: string): Promise<string | null> {
    this.mode = mode;
    this.root.title = mode === "open" ? "Open File  (Ctrl+O)" : "Save As";
    this.nameInput.visible = mode === "save";
    this.errorText.content = "";

    let startDir = startPath;
    let defaultName = "untitled.txt";
    try {
      if (existsSync(startPath) && statSync(startPath).isFile()) {
        startDir = dirname(startPath);
        defaultName = basename(startPath);
      }
    } catch {
      // ignore, fall back to defaults
    }
    if (!existsSync(startDir)) startDir = process.cwd();

    this.dir = resolve(startDir);
    this.nameInput.value = defaultName;
    this.refreshList();
    this.pathInput.value = this.dir;

    this.focusables =
      mode === "save" ? [this.pathInput, this.nameInput, this.list] : [this.pathInput, this.list];
    this.focusIdx = 0;

    this.root.visible = true;
    this.focusCurrent();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  cancel(): void {
    this.finish(null);
  }

  cycleFocus(reverse: boolean): void {
    if (!this.visible || this.focusables.length === 0) return;
    this.blurCurrent();
    this.focusIdx = (this.focusIdx + (reverse ? -1 : 1) + this.focusables.length) % this.focusables.length;
    this.focusCurrent();
  }

  private focusCurrent(): void {
    this.focusables[this.focusIdx]?.focus();
  }

  private blurCurrent(): void {
    this.focusables[this.focusIdx]?.blur();
  }

  private finish(path: string | null): void {
    if (!this.resolver) return;
    this.blurCurrent();
    this.root.visible = false;
    const resolve = this.resolver;
    this.resolver = null;
    resolve(path);
  }

  private refreshList(): void {
    const entries = listDir(this.dir);
    const options: SelectOption[] = [];
    const parent = dirname(this.dir);
    if (parent !== this.dir) {
      options.push({
        name: "..",
        description: "(parent directory)",
        value: { path: parent, isDir: true } satisfies EntryValue,
      });
    }
    for (const entry of entries) {
      options.push({
        name: entry.isDir ? `${entry.name}/` : entry.name,
        description: entry.isDir ? "" : formatSize(entry.size),
        value: { path: entry.path, isDir: entry.isDir } satisfies EntryValue,
      });
    }
    this.list.options = options;
  }

  private navigateTo(dir: string): void {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      this.errorText.content = "Directory not found";
      return;
    }
    this.dir = resolve(dir);
    this.pathInput.value = this.dir;
    this.errorText.content = "";
    this.refreshList();
  }

  private handlePathEnter(value: string): void {
    const target = resolve(this.dir, value.trim() || ".");
    if (existsSync(target) && statSync(target).isDirectory()) {
      this.navigateTo(target);
      return;
    }
    if (this.mode === "open" && existsSync(target) && statSync(target).isFile()) {
      this.finish(target);
      return;
    }
    this.errorText.content = this.mode === "open" ? "File not found" : "Path not found";
  }

  private handleEntryChosen(option: SelectOption): void {
    const value = option.value as EntryValue;
    if (value.isDir) {
      this.navigateTo(value.path);
      return;
    }
    if (this.mode === "open") {
      this.finish(value.path);
    } else {
      this.nameInput.value = basename(value.path);
    }
  }

  private handleSaveConfirm(value: string): void {
    const name = value.trim();
    if (!name) {
      this.errorText.content = "Enter a file name";
      return;
    }
    this.finish(join(this.dir, name));
  }
}
