import { BoxRenderable, TextRenderable, TextAttributes, type RenderContext } from "@opentui/core";

export class ConfirmBox {
  readonly root: BoxRenderable;
  private messageText: TextRenderable;
  private hintText: TextRenderable;
  private resolver: ((value: boolean) => void) | null = null;

  constructor(ctx: RenderContext) {
    this.root = new BoxRenderable(ctx, {
      id: "confirm-box",
      position: "absolute",
      top: "40%",
      left: "15%",
      right: "15%",
      height: "auto",
      border: true,
      borderStyle: "rounded",
      borderColor: "#f38ba8",
      backgroundColor: "#1e1e2e",
      title: "Confirm",
      titleAlignment: "center",
      zIndex: 200,
      visible: false,
      flexDirection: "column",
      alignItems: "center",
      rowGap: 1,
      padding: 1,
    });

    this.messageText = new TextRenderable(ctx, {
      content: "",
      fg: "#cdd6f4",
    });

    this.hintText = new TextRenderable(ctx, {
      content: "Y: Yes    N / Esc: No",
      attributes: TextAttributes.DIM,
      fg: "#a6adc8",
    });

    this.root.add(this.messageText);
    this.root.add(this.hintText);
  }

  get visible(): boolean {
    return this.root.visible;
  }

  ask(message: string): Promise<boolean> {
    this.messageText.content = message;
    this.root.visible = true;
    this.root.requestRender();
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private finish(value: boolean): void {
    if (!this.resolver) return;
    this.root.visible = false;
    const resolve = this.resolver;
    this.resolver = null;
    resolve(value);
  }
}
