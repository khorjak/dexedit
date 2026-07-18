import { createCliRenderer } from "@opentui/core";
import { App } from "./app";

const fileArg = process.argv[2];

const renderer = await createCliRenderer({ exitOnCtrlC: false });
const app = new App(renderer);

if (fileArg) {
  await app.loadFile(fileArg);
}
