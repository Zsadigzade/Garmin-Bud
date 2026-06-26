import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageJsonPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version: string };

export const packageVersion = pkg.version;
