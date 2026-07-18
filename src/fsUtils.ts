import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export function listDir(dir: string): DirEntry[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }

  const entries: DirEntry[] = [];
  for (const name of names) {
    const full = join(dir, name);
    let isDir = false;
    let size: number | undefined;
    try {
      const st = statSync(full);
      isDir = st.isDirectory();
      size = st.isFile() ? st.size : undefined;
    } catch {
      continue;
    }
    entries.push({ name, path: full, isDir, size });
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return entries;
}

export function formatSize(size?: number): string {
  if (size === undefined) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
