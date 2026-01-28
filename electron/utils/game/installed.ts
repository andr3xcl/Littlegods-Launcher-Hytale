import fs from "fs";
import path from "path";
import {
  getLatestDir,
  getPreReleaseChannelDir,
  getReleaseChannelDir,
  migrateLegacyChannelInstallIfNeeded,
  resolveClientPath,
} from "./paths";
import { readInstallManifest } from "./manifest";

export type InstalledBuildInfo = {
  type: GameVersion["type"];
  build_index: number;
  build_name?: string;
  isLatest?: boolean;
};

const parseBuildIndex = (dirName: string): number | null => {
  const m = dirName.match(/^build-(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const listBuildDirs = (channelDir: string): number[] => {
  if (!fs.existsSync(channelDir)) return [];
  return fs
    .readdirSync(channelDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => parseBuildIndex(d.name))
    .filter((n): n is number => typeof n === "number")
    .sort((a, b) => a - b);
};

const hasClientExecutable = (installDir: string): boolean => {
  try {
    return fs.existsSync(resolveClientPath(installDir));
  } catch {
    return false;
  }
};

export const listInstalledVersions = (baseDir: string): InstalledBuildInfo[] => {
  try {
    migrateLegacyChannelInstallIfNeeded(baseDir, "release");
    migrateLegacyChannelInstallIfNeeded(baseDir, "pre-release");

    const out: InstalledBuildInfo[] = [];

    const releaseChannel = getReleaseChannelDir(baseDir);
    for (const idx of listBuildDirs(releaseChannel)) {
      const installDir = path.join(releaseChannel, `build-${idx}`);
      if (!hasClientExecutable(installDir)) continue;
      const manifest = readInstallManifest(installDir);
      out.push({
        type: "release",
        build_index: idx,
        build_name: manifest?.build_name,
      });
    }

    const preChannel = getPreReleaseChannelDir(baseDir);
    for (const idx of listBuildDirs(preChannel)) {
      const installDir = path.join(preChannel, `build-${idx}`);
      if (!hasClientExecutable(installDir)) continue;
      const manifest = readInstallManifest(installDir);
      out.push({
        type: "pre-release",
        build_index: idx,
        build_name: manifest?.build_name,
      });
    }

    const latestDir = getLatestDir(baseDir);
    if (fs.existsSync(latestDir)) {
      if (!hasClientExecutable(latestDir)) {
        
        
      } else {
      const manifest = readInstallManifest(latestDir);
      if (manifest?.build_index) {
        out.push({
          type: "release",
          build_index: manifest.build_index,
          build_name: manifest.build_name,
          isLatest: true,
        });
      }
      }
    }

    
    const seen = new Set<string>();
    const deduped: InstalledBuildInfo[] = [];
    for (const item of out) {
      const key = `${item.type}:${item.build_index}`;
      if (seen.has(key)) {
        
        const existingIndex = deduped.findIndex(
          (x) => x.type === item.type && x.build_index === item.build_index,
        );
        if (existingIndex !== -1 && item.isLatest) deduped[existingIndex] = item;
        continue;
      }
      seen.add(key);
      deduped.push(item);
    }

    return deduped;
  } catch {
    return [];
  }
};

export const deleteInstalledVersion = (
  baseDir: string,
  info: InstalledBuildInfo,
): void => {
  let installDir: string;

  if (info.isLatest) {
    installDir = getLatestDir(baseDir);
  } else if (info.type === "release") {
    installDir = path.join(
      getReleaseChannelDir(baseDir),
      `build-${info.build_index}`,
    );
  } else {
    installDir = path.join(
      getPreReleaseChannelDir(baseDir),
      `build-${info.build_index}`,
    );
  }

  if (!fs.existsSync(installDir)) return;

  fs.rmSync(installDir, { recursive: true, force: true });
};
