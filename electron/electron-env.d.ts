

declare namespace NodeJS {
  interface ProcessEnv {
    
    APP_ROOT: string;
    
    VITE_PUBLIC: string;
  }
}


interface Window {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    off: (channel: string, listener?: (event: any, ...args: any[]) => void) => void;
    once: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
  config: {
    OS: NodeJS.Platform;
    ARCH: NodeJS.Architecture;
    getDefaultGameDirectory: () => Promise<string>;
    openFolder: (
      folderPath: string,
    ) => Promise<{ ok: boolean; error: string | null }>;
    openExternal: (
      url: string,
    ) => Promise<{ ok: boolean; error: string | null }>;
    getV5UUID: (username: string) => Promise<string>;
    VERSION: string;
    BUILD_DATE: string;
  };
}

interface ModInfo {
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
