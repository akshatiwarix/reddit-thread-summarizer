import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

execSync("pnpm --filter @rts/extension zip", { cwd: root, stdio: "inherit" });

const outputDir = join(root, "apps", "extension", ".output");
const zips = readdirSync(outputDir)
  .filter((name) => name.endsWith(".zip"))
  .map((name) => ({ name, mtime: statSync(join(outputDir, name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

const newest = zips[0];
if (!newest) {
  console.error(`wxt zip did not write a zip in ${outputDir}`);
  process.exit(1);
}

const destDir = join(root, "release");
mkdirSync(destDir, { recursive: true });
const dest = join(destDir, "reddit-thread-summarizer-v1.0.0.zip");
copyFileSync(join(outputDir, newest.name), dest);
console.log(dest);
