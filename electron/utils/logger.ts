import fs from "node:fs";
import path from "node:path";
import { LOGS_DIRECTORY } from "./const";

if (!fs.existsSync(LOGS_DIRECTORY)) {
  fs.mkdirSync(LOGS_DIRECTORY, { recursive: true });
}


function getUniqueLogPath(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; 
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); 

  const baseName = `${dateStr}_${timeStr}`;
  let session = 1;

  let logPath = path.join(LOGS_DIRECTORY, `${baseName}_session-${session}.log`);

  
  while (fs.existsSync(logPath)) {
    session++;
    logPath = path.join(LOGS_DIRECTORY, `${baseName}_session-${session}.log`);
  }

  return logPath;
}

const logFile = getUniqueLogPath();


function formatMessage(level: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      return typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
    })
    .join(" ");
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

const writeToLog = (msg: string) => {
  try {
    fs.appendFileSync(logFile, msg + "\n");
  } catch (err) {
    
    console.error("Failed to write to log file:", err);
  }
};

export const logger = {
  info: (...args: any[]) => {
    const msg = formatMessage("info", ...args);
    console.log(`\x1b[34m${msg}\x1b[0m`);
    writeToLog(msg);
  },
  warn: (...args: any[]) => {
    const msg = formatMessage("warn", ...args);
    console.warn(`\x1b[33m${msg}\x1b[0m`);
    writeToLog(msg);
  },
  error: (...args: any[]) => {
    const msg = formatMessage("error", ...args);
    console.error(`\x1b[31m${msg}\x1b[0m`);
    writeToLog(msg);
  },
  getLogPath: () => logFile,
};
