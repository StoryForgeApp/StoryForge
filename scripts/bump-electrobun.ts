import { writeFile } from "fs/promises";
import { join } from "path";
import electrobunConfig from "../electrobun.config";

async function bumpElectrobunVersion() {
  const packageJsonPath = Bun.file(join(process.cwd(), "package.json"));

  // Read package.json to get the version
  const packageJson = await packageJsonPath.json();
  const version = packageJson.version;

  if (!version) {
    console.error("Error: Could not find version in package.json");
    process.exit(1);
  }

  if (!electrobunConfig.app.version) {
    console.error("Error: Could not find version field in electrobun.config.ts");
    process.exit(1);
  }

  electrobunConfig.app.version = version;

  // Write the updated config back
  await writeFile(
    join(process.cwd(), "electrobun.config.ts"),
    `import type { ElectrobunConfig } from "electrobun";

export default ${Bun.JSON5.stringify(electrobunConfig, null, 2)} satisfies ElectrobunConfig`,
  );

  console.log(`✅ Updated electrobun.config.ts version to ${version}`);
}

bumpElectrobunVersion().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
