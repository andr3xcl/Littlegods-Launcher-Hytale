const BASE_URL = "https://game-patches.hytale.com/patches";

const VERSION_DETAILS_CACHE_KEY = "versionDetailsCache:v1";
const VERSION_DETAILS_META_KEY = "versionDetailsMeta:v1";

const useSystemOS = () => {
  if (window.config.OS === "win32") return "windows";
  if (window.config.OS !== "darwin") return "linux";
  return window.config.OS;
};

const useSystemArch = (os: string) => {
  if (os === "darwin") return "arm64";
  return "amd64";
};

const buildPwrUrl = (
  os: string,
  arch: string,
  versionType: VersionType,
  buildIndex: number,
) => `${BASE_URL}/${os}/${arch}/${versionType}/0/${buildIndex}.pwr`;

const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseISODateOnly = (raw?: string): Date | null => {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return null;
  const y = Number(iso[1]);
  const m = Number(iso[2]);
  const d = Number(iso[3]);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const loadCachedVersionDetails = (): VersionsManifestRoot | null => {
  try {
    const raw = localStorage.getItem(VERSION_DETAILS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveCachedVersionDetails = (
  details: VersionsManifestRoot,
  meta?: any,
) => {
  try {
    localStorage.setItem(VERSION_DETAILS_CACHE_KEY, JSON.stringify(details));
    if (meta)
      localStorage.setItem(VERSION_DETAILS_META_KEY, JSON.stringify(meta));
  } catch {
    
  }
};

const fetchVersionDetailsIfOnline =
  async (): Promise<VersionsManifestRoot | null> => {
    const url = `${import.meta.env.VITE_REQUEST_VERSIONS_DETAILS_URL}`;
    try {
      const status = await window.ipcRenderer.invoke("fetch:head", url);
      if (status !== 200) return null;
      return (await window.ipcRenderer.invoke(
        "fetch:json",
        url,
      )) as VersionsManifestRoot;
    } catch {
      return null;
    }
  };

const headPwrExists = async (
  versionType: VersionType,
  buildIndex: number,
): Promise<boolean> => {
  const os = useSystemOS();
  const arch = useSystemArch(os);
  const url = buildPwrUrl(os, arch, versionType, buildIndex);
  try {
    const status = await window.ipcRenderer.invoke("fetch:head", url);
    return status === 200;
  } catch {
    return false;
  }
};

const probeBeyondLatest = async (
  versionType: VersionType,
  startFrom: number,
  maxExtra: number,
): Promise<number[]> => {
  const found: number[] = [];
  const batchSize = 5;
  let current = startFrom;

  while (found.length < maxExtra) {
    const batch = Array.from({ length: batchSize }, (_, i) => current + i);
    const results = await Promise.all(
      batch.map(async (id) => ({ id, ok: await headPwrExists(versionType, id) }))
    );

    let stopped = false;
    for (const res of results) {
      if (res.ok) {
        found.push(res.id);
        current = res.id + 1;
      } else {
        stopped = true;
        break;
      }
    }

    if (stopped || results.length < batchSize) break;
  }

  return found.slice(0, maxExtra);
};

const probeFromBuild1 = async (
  versionType: VersionType,
  maxScan: number,
): Promise<number[]> => {
  const found: number[] = [];
  for (let buildIndex = 1; buildIndex <= maxScan; buildIndex++) {
    const ok = await headPwrExists(versionType, buildIndex);
    if (!ok) break;
    found.push(buildIndex);
  }
  return found;
};
export const getGameVersions = async (versionType: VersionType = "release") => {
  
  const today = startOfToday();
  const details =
    (await fetchVersionDetailsIfOnline()) ?? loadCachedVersionDetails();

  if (details) {
    saveCachedVersionDetails(details, { fetchedAt: formatYMD(today) });
  }

  
  
  if (!details) {
    const os = useSystemOS();
    const arch = useSystemArch(os);

    const maxScan = 500; 
    const ids = await probeFromBuild1(versionType, maxScan);
    if (!ids.length) return [];

    const versions: GameVersion[] = ids.map((buildIndex) => ({
      url: buildPwrUrl(os, arch, versionType, buildIndex),
      type: versionType,
      build_index: buildIndex,
      build_name: `Build-${buildIndex}`,
      isLatest: false,
    }));

    const actualLatest = Math.max(...versions.map((v) => v.build_index));
    for (const v of versions) v.isLatest = v.build_index === actualLatest;

    versions.sort((a, b) => b.build_index - a.build_index);
    return versions;
  }

  parseISODateOnly(details.last_updated);
  const latestId =
    versionType === "release"
      ? details.latest_release_id
      : details.latest_prerelease_id;

  const namesMap =
    versionType === "release" ? details.versions : details.pre_releases;

  
  let ids = Object.keys(namesMap || {})
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  
  if (typeof latestId === "number" && latestId > 0 && !ids.includes(latestId)) {
    ids.push(latestId);
    ids.sort((a, b) => a - b);
  }

  
  const checks = await Promise.all(
    ids.map(async (id) => ({ id, ok: await headPwrExists(versionType, id) }))
  );
  const existingListed = checks.filter(c => c.ok).map(c => c.id);

  
  
  const shouldProbe = typeof latestId === "number" && latestId > 0;
  const maxExtra = 100; 
  const extras = shouldProbe
    ? await probeBeyondLatest(versionType, latestId + 1, maxExtra)
    : [];

  const finalIds = Array.from(new Set([...existingListed, ...extras])).sort(
    (a, b) => a - b,
  );

  const os = useSystemOS();
  const arch = useSystemArch(os);

  const versions: GameVersion[] = finalIds.map((buildIndex) => {
    const versionEntry = namesMap?.[buildIndex];
    const detailsEntry = versionEntry?.[os];
    const listedName = detailsEntry?.name;
    const build_name =
      typeof listedName === "string" && listedName.trim().length > 0
        ? listedName
        : `Build-${buildIndex}`;

    const patch_url =
      typeof (detailsEntry as any)?.url === "string"
        ? (detailsEntry as any).url
        : undefined;
    const original_url =
      typeof (detailsEntry as any)?.original === "string"
        ? (detailsEntry as any).original
        : undefined;
    const patch_hash =
      typeof (detailsEntry as any)?.hash === "string"
        ? (detailsEntry as any).hash
        : undefined;
    const proper_patch =
      typeof (detailsEntry as any)?.proper_patch === "boolean"
        ? (detailsEntry as any).proper_patch
        : undefined;
    const patch_note =
      typeof (detailsEntry as any)?.patch_note === "string"
        ? (detailsEntry as any).patch_note
        : undefined;
    
    const server_url =
      typeof (versionEntry as any)?.server_url === "string"
        ? (versionEntry as any).server_url
        : typeof (versionEntry as any)?.server === "string"
          ? (versionEntry as any).server
          : undefined;
    
    const unserver_url =
      typeof (versionEntry as any)?.unserver_url === "string"
        ? (versionEntry as any).unserver_url
        : typeof (versionEntry as any)?.unserver === "string"
          ? (versionEntry as any).unserver
          : undefined;

    const version: GameVersion = {
      url: buildPwrUrl(os, arch, versionType, buildIndex),
      type: versionType,
      build_index: buildIndex,
      build_name,
      isLatest: false,
      patch_url: patch_url && patch_hash ? patch_url : undefined,
      patch_hash: patch_url && patch_hash ? patch_hash : undefined,
      original_url: patch_url && patch_hash ? original_url : undefined,
      patch_note: patch_url && patch_hash ? patch_note : undefined,
      proper_patch: patch_url && patch_hash ? proper_patch : undefined,
      server_url: server_url,
      unserver_url: unserver_url,
    };
    return version;
  });

  
  if (versions.length) {
    const actualLatest = Math.max(...versions.map((v) => v.build_index));
    for (const v of versions) {
      v.isLatest = v.build_index === actualLatest;
    }
  }

  
  versions.sort((a, b) => b.build_index - a.build_index);
  return versions;
};

export const getInstalledGameVersions: () => GameVersion[] = () => {
  const versions = localStorage.getItem("installedVersions");
  if (!versions) return [];
  return JSON.parse(versions);
};

export const saveInstalledGameVersion = (version: GameVersion) => {
  const versions = getInstalledGameVersions();
  const next = versions.filter(
    (v) => !(v.build_index === version.build_index && v.type === version.type),
  );
  next.push(version);
  localStorage.setItem("installedVersions", JSON.stringify(next));
};
