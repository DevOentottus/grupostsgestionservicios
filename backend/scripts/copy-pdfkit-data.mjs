import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distData = join(__dirname, "..", "dist", "data");

// pdfkit ships its .afm font files in node_modules/pdfkit/data/
const src = join(__dirname, "..", "node_modules", "pdfkit", "data");
if (!existsSync(src)) {
  console.error("pdfkit data directory not found at:", src);
  process.exit(1);
}

mkdirSync(distData, { recursive: true });

const files = readdirSync(src);
for (const f of files) {
  copyFileSync(join(src, f), join(distData, f));
}
console.log(`Copied ${files.length} font files from pdfkit/data to dist/data`);
