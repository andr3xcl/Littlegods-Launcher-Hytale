import fs from "fs";
import path from "path";


const packageJson = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package.json")),
);
packageJson.build_date =
  "LittlegodsLauncher_" + new Date().toISOString().split("T")[0];

console.log("Setting build date to: " + packageJson.build_date);

fs.writeFileSync(
  path.join(process.cwd(), "package.json"),
  JSON.stringify(packageJson, null, 2),
);
