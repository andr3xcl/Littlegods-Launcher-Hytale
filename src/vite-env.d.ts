

interface ImportMetaEnv {
  readonly VITE_NEWS_URL?: string;
}

type VersionType = "release" | "pre-release";

type GameVersion = {
  url: string;
  type: VersionType;
  build_index: number;
  build_name: string;
  isLatest?: boolean;
  patch_url?: string;
  patch_hash?: string;
  original_url?: string;
  patch_note?: string;
  
  proper_patch?: boolean;
  installed?: boolean;
  server_url?: string;
  unserver_url?: string;
};

type VersionDetails = {
  name: string;
  url?: string;
  hash?: string;
  patch_note?: string;
  original?: string;
  proper_patch?: boolean;
};

type VersionManifest = {
  server_url?: string;
  unserver_url?: string;
  server?: string;
  unserver?: string;
  windows: VersionDetails;
  linux: VersionDetails;
  darwin: VersionDetails;
};

type VersionsManifestRoot = {
  last_updated: string;
  latest_release_id: number;
  latest_prerelease_id: number;
  versions: Record<string, VersionManifest>;
  pre_releases: Record<string, VersionManifest>;
};

type InstallProgress = {
  phase: string;
  percent: number;
  total?: number;
  current?: number;
};

type ModInfo = {
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
};
