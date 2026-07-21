import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { themes } from "./theme";

const CONFIG_PATH = join(homedir(), ".dexeditrc.json");

interface StoredConfig {
  theme?: string;
}

export function loadThemeName(): string {
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredConfig;
    if (parsed && typeof parsed.theme === "string" && themes.some((t) => t.name === parsed.theme)) {
      return parsed.theme;
    }
  } catch {
    // missing file / corrupt JSON / unreadable — fall back silently
  }
  return themes[0]!.name;
}

export function saveThemeName(name: string): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify({ theme: name }, null, 2), "utf8");
  } catch {
    // best-effort only; a failed write must not crash the app
  }
}
