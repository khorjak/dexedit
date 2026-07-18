import {
  BoxRenderable,
  TextRenderable,
  InputRenderable,
  InputRenderableEvents,
  type RenderContext,
} from "@opentui/core";

/** Persistent find bar: stays open across repeated "find next" presses. */
export class FindBar {
  readonly root: BoxRenderable;
  readonly input: InputRenderable;
  private label: TextRenderable;

  constructor(ctx: RenderContext) {
    this.root = new BoxRenderable(ctx, {
      id: "find-bar",
      height: 1,
      flexDirection: "row",
      backgroundColor: "#181825",
      visible: false,
      columnGap: 1,
    });

    this.label = new TextRenderable(ctx, {
      content: "Find:",
      fg: "#94e2d5",
    });

    this.input = new InputRenderable(ctx, {
      flexGrow: 1,
      backgroundColor: "#181825",
      textColor: "#cdd6f4",
      focusedBackgroundColor: "#181825",
      focusedTextColor: "#cdd6f4",
      placeholder: "search text… (Enter/↓: next, ↑: previous, Esc: close)",
    });

    this.root.add(this.label);
    this.root.add(this.input);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  onInput(handler: (value: string) => void): void {
    this.input.on(InputRenderableEvents.INPUT, handler);
  }

  open(initialValue = ""): void {
    this.input.value = initialValue;
    this.root.visible = true;
    this.input.focus();
  }

  close(): void {
    this.input.blur();
    this.root.visible = false;
  }
}
