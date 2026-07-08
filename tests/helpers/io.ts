import * as fs from "fs";
import * as path from "path";

const OUT_DIR = path.join(process.cwd(), "test-output");

export function writeFile(name: string, content: string) {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(OUT_DIR, name), content);
}
