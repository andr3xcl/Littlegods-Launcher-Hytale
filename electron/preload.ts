import { ipcRenderer, contextBridge } from "electron";
import { version, build_date } from "../package.json";

const normalizeBuildDate = (raw: unknown): string => {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s) return s;
  
  return `ButterLauncher_${new Date().toISOString().split("T")[0]}`;
};




const listenerRegistry = new Map<
  string,
  Map<(...args: any[]) => any, (...args: any[]) => any>
>();

const getWrappedListener = (
  channel: string,
  listener: (...args: any[]) => any,
): ((...args: any[]) => any) => {
  let channelMap = listenerRegistry.get(channel);
  if (!channelMap) {
    channelMap = new Map();
    listenerRegistry.set(channel, channelMap);
  }

  const existing = channelMap.get(listener);
  if (existing) return existing;

  const wrapped = (event: any, ...args: any[]) => listener(event, ...args);
  channelMap.set(listener, wrapped);
  return wrapped;
};

const dropWrappedListener = (
  channel: string,
  listener: (...args: any[]) => any,
): ((...args: any[]) => any) => {
  const channelMap = listenerRegistry.get(channel);
  const wrapped = channelMap?.get(listener);
  if (wrapped) {
    channelMap!.delete(listener);
    if (channelMap!.size === 0) listenerRegistry.delete(channel);
    return wrapped;
  }
  return listener;
};

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    const wrapped = getWrappedListener(channel, listener as any);
    return ipcRenderer.on(channel, wrapped as any);
  },
  
  
  off(channel: string, listener?: (...args: any[]) => any) {
    if (typeof listener === "function") {
      const wrapped = dropWrappedListener(channel, listener as any);
      return ipcRenderer.off(channel, wrapped as any);
    }
    
    listenerRegistry.delete(channel);
    return ipcRenderer.removeAllListeners(channel);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  once(...args: Parameters<typeof ipcRenderer.once>) {
    const [channel, listener] = args;
    const wrapped = getWrappedListener(channel, listener as any);
    
    const wrappedOnce = (event: any, ...rest: any[]) => {
      try {
        (wrapped as any)(event, ...rest);
      } finally {
        dropWrappedListener(channel, listener as any);
      }
    };
    return ipcRenderer.once(channel, wrappedOnce as any);
  },
  removeListener(...args: Parameters<typeof ipcRenderer.removeListener>) {
    const [channel, listener] = args;
    const wrapped = dropWrappedListener(channel, listener as any);
    return ipcRenderer.removeListener(channel, wrapped as any);
  },
});

contextBridge.exposeInMainWorld("config", {
  getDefaultGameDirectory: () =>
    ipcRenderer.invoke("get-default-game-directory"),
  openFolder: (folderPath: string) =>
    ipcRenderer.invoke("open-folder", folderPath),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  getV5UUID: (username: string) => ipcRenderer.invoke("uuid:gen-v5", username),
  OS: process.platform,
  ARCH: process.arch,
  VERSION: version,
  BUILD_DATE: normalizeBuildDate(build_date),
});
