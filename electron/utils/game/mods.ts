import fs from "fs";
import path from "path";
import { BrowserWindow } from "electron";
import { logger } from "../logger";

export interface ModInfo {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    fileName: string;
    fileSize?: number;
    downloadUrl?: string;
    thumbnailUrl?: string;
    enabled: boolean;
    curseForgeId?: number;
    curseForgeFileId?: number;
}


export const getModsPath = (baseDir: string) => path.join(baseDir, "UserData", "Mods");
export const getDisabledModsPath = (baseDir: string) => path.join(baseDir, "UserData", "DisabledMods");

const getModMetadataPath = (baseDir: string) => path.join(baseDir, "UserData", ".mod-metadata.json");

const loadModMetadata = (baseDir: string): Record<string, ModInfo> => {
    const metadataPath = getModMetadataPath(baseDir);
    if (!fs.existsSync(metadataPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    } catch {
        return {};
    }
};

const saveModMetadata = (baseDir: string, metadata: Record<string, ModInfo>) => {
    const metadataPath = getModMetadataPath(baseDir);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
};

export const listInstalledMods = (baseDir: string): ModInfo[] => {
    const modsPath = getModsPath(baseDir);
    const disabledPath = getDisabledModsPath(baseDir);

    logger.info(`[Mods] Listing installed mods from: ${modsPath}`);

    if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });
    if (!fs.existsSync(disabledPath)) fs.mkdirSync(disabledPath, { recursive: true });

    const metadata = loadModMetadata(baseDir);
    const mods: ModInfo[] = [];

    const readDir = (dir: string, enabled: boolean) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith(".jar") || file.endsWith(".zip")) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);

                
                const savedMod = metadata[file];
                if (savedMod) {
                    mods.push({ ...savedMod, enabled, fileSize: stats.size });
                } else {
                    
                    let name = file.replace(/\.(jar|zip)$/i, "");
                    name = name.replace(/-v?\d+\.[\d\.]+.*$/i, "");
                    name = name.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

                    mods.push({
                        id: file,
                        name: name || file,
                        version: "Unknown",
                        author: "Local",
                        description: "Installed mod",
                        fileName: file,
                        fileSize: stats.size,
                        enabled,
                    });
                }
            }
        }
    };

    readDir(modsPath, true);
    readDir(disabledPath, false);

    logger.info(`[Mods] Found ${mods.length} installed mods`);
    return mods;
};

export const downloadMod = async (
    baseDir: string,
    mod: ModInfo,
    win: BrowserWindow,
): Promise<{ success: boolean; error?: string }> => {
    logger.info(`[Mods] Starting download for: ${mod.name} (ID: ${mod.id})`);
    logger.info(`[Mods] Base directory: ${baseDir}`);

    const modsPath = getModsPath(baseDir);
    logger.info(`[Mods] Target mods path: ${modsPath}`);

    if (!fs.existsSync(modsPath)) {
        logger.info(`[Mods] Creating mods directory: ${modsPath}`);
        fs.mkdirSync(modsPath, { recursive: true });
    }

    const fileName = mod.fileName || `mod-${mod.curseForgeId}.jar`;
    const filePath = path.join(modsPath, fileName);
    logger.info(`[Mods] Target file path: ${filePath}`);

    try {
        let downloadUrl = mod.downloadUrl;

        if (!downloadUrl && mod.curseForgeId && mod.curseForgeFileId) {
            logger.info(`[Mods] Fetching download URL from CurseForge API...`);
            const apiKey = "YOUR_FORGE_API_KEY";
            const res = await fetch(`https://api.curseforge.com/v1/mods/${mod.curseForgeId}/files/${mod.curseForgeFileId}`, {
                headers: {
                    "x-api-key": apiKey,
                    "Accept": "application/json"
                }
            });
            const data = await res.json();
            downloadUrl = data.data?.downloadUrl;
            logger.info(`[Mods] Retrieved download URL: ${downloadUrl}`);
        }

        if (!downloadUrl) throw new Error("Could not determine download URL");

        logger.info(`[Mods] Downloading from: ${downloadUrl}`);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download (HTTP ${response.status}): ${response.statusText}`);
        }

        const total = parseInt(response.headers.get("content-length") || "0");
        logger.info(`[Mods] File size: ${total} bytes`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get response reader");

        const chunks: Uint8Array[] = [];
        let received = 0;

        logger.info(`[Mods] Starting to read chunks...`);
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                logger.info(`[Mods] Finished reading all chunks`);
                break;
            }

            chunks.push(value);
            received += value.length;

            if (total > 0) {
                const percent = (received / total) * 100;
                win.webContents.send("mod-download-progress", {
                    modId: mod.id,
                    percent: percent,
                });

                if (percent % 25 === 0 || percent > 99) {
                    logger.info(`[Mods] Download progress: ${percent.toFixed(1)}%`);
                }
            }
        }

        logger.info(`[Mods] Writing ${chunks.length} chunks to file...`);
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        logger.info(`[Mods] File written successfully: ${filePath}`);

        
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            logger.info(`[Mods] Verified file exists with size: ${stats.size} bytes`);
        } else {
            throw new Error("File was not created successfully");
        }

        
        const metadata = loadModMetadata(baseDir);
        metadata[fileName] = {
            id: mod.id,
            name: mod.name,
            version: mod.version,
            author: mod.author,
            description: mod.description,
            fileName: fileName,
            thumbnailUrl: mod.thumbnailUrl,
            enabled: true,
            curseForgeId: mod.curseForgeId,
            curseForgeFileId: mod.curseForgeFileId,
        };
        saveModMetadata(baseDir, metadata);
        logger.info(`[Mods] Saved metadata for ${fileName}`);

        return { success: true };
    } catch (err) {
        logger.error(`[Mods] Error downloading mod:`, err);
        return { success: false, error: String(err) };
    }
};

export const toggleMod = (baseDir: string, fileName: string, enabled: boolean): { success: boolean; error?: string } => {
    const modsPath = getModsPath(baseDir);
    const disabledPath = getDisabledModsPath(baseDir);

    const fromDir = enabled ? disabledPath : modsPath;
    const toDir = enabled ? modsPath : disabledPath;

    const fromPath = path.join(fromDir, fileName);
    const toPath = path.join(toDir, fileName);

    try {
        if (!fs.existsSync(fromPath)) return { success: false, error: "Mod file not found" };
        fs.renameSync(fromPath, toPath);
        return { success: true };
    } catch (err) {
        logger.error("Error toggling mod:", err);
        return { success: false, error: String(err) };
    }
};

export const uninstallMod = (baseDir: string, fileName: string): { success: boolean; error?: string } => {
    const modsPath = path.join(getModsPath(baseDir), fileName);
    const disabledPath = path.join(getDisabledModsPath(baseDir), fileName);

    try {
        if (fs.existsSync(modsPath)) fs.unlinkSync(modsPath);
        if (fs.existsSync(disabledPath)) fs.unlinkSync(disabledPath);

        
        const metadata = loadModMetadata(baseDir);
        delete metadata[fileName];
        saveModMetadata(baseDir, metadata);
        logger.info(`[Mods] Removed ${fileName} from metadata`);

        return { success: true };
    } catch (err) {
        logger.error("Error uninstalling mod:", err);
        return { success: false, error: String(err) };
    }
};
