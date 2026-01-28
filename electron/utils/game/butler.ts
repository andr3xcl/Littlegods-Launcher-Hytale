import { META_DIRECTORY } from "../const";
import path from "node:path";
import fs from "node:fs";
import extract from "extract-zip";
import { logger } from "../logger";

export const installButler = async () => {
  logger.info("Checking for Butler tool...");
  const butlerPath = path.join(META_DIRECTORY, "tools", "butler");
  const zipPath = path.join(butlerPath, "butler.zip");
  const binPath = path.join(
    butlerPath,
    process.platform === "win32" ? "butler.exe" : "butler",
  );

  try {
    if (!fs.existsSync(butlerPath)) {
      fs.mkdirSync(butlerPath, { recursive: true });
    }

    
    if (fs.existsSync(binPath)) {
      logger.info(`Butler already installed at ${binPath}`);
      return binPath;
    }

    logger.info(`Butler not found, installing to ${butlerPath}...`);

    
    const url: Record<string, string> = {
      win32:
        "https://broth.itch.zone/butler/windows-amd64/LATEST/archive/default",
      linux:
        "https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default",
      darwin:
        "https://broth.itch.zone/butler/darwin-amd64/LATEST/archive/default",
    };
    if (!url[process.platform]) {
      throw new Error(`Unsupported platform for butler: ${process.platform}`);
    }

    const downloadUrl = url[process.platform];
    logger.info(`Downloading Butler from ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Butler: ${response.statusText}`);
    }

    const zipData = await response.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(zipData));
    logger.info(`Butler zip saved to ${zipPath}`);

    logger.info(`Extracting Butler to ${butlerPath}...`);
    await extract(zipPath, { dir: butlerPath });
    logger.info("Butler extraction complete.");

    
    if (process.platform !== "win32") {
      logger.info(`Setting executable bit for Butler at ${binPath}`);
      fs.chmodSync(binPath, 0o755);
    }

    fs.unlinkSync(zipPath);
    logger.info("Cleaned up Butler zip archve.");
  } catch (error) {
    logger.error("Failed to install Butler:", error);
    return null;
  }

  return binPath;
};
