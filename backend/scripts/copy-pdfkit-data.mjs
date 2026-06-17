import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfkitPath = dirname(require.resolve("pdfkit/package.json"));
const distData = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "data");

// pdfkit v0.19 stores .afm files under js/data/
const src = join(pdfkitPath, "js", "data");
console.log("pdfkit path:", pdfkitPath);
console.log("src data dir:", src);
console.log("dist data dir:", distData);

if (!existsSync(src)) {
  console.error("pdfkit js/data directory not found at:", src);
  process.exit(1);
}

mkdirSync(distData, { recursive: true });

const files = readdirSync(src);
for (const f of files) {
  copyFileSync(join(src, f), join(distData, f));
}
console.log(`Copied ${files.length} font files from pdfkit/js/data to dist/data`);
