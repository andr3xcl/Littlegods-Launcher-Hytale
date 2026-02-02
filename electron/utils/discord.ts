import { Client, type SetActivity } from "@kostya-main/discord-rpc";
import { logger } from "./logger";

const dateElapsed = Date.now();

const clientId = "YOUR_DISCORD_CLIENT_ID";
const client = new Client({ clientId });

let rpcActivity: SetActivity = {
  startTimestamp: dateElapsed,
  details: "Littlegods Hytale",
  largeImageKey: "littlegods",
  largeImageText: "Littlegods Hytale",
  buttons: [
    {
      label: "Play Littlegods Hytale",
      url: "https://littlegods.launcher",
    },
  ],
};

export const setChoosingVersionActivity = () => {
  setActivity({
    startTimestamp: dateElapsed,
    details: "Littlegods Hytale",
    state: undefined,
    
    smallImageKey: undefined,
    smallImageText: undefined,
  });
};

export const setPlayingActivity = (version: GameVersion) => {
  const build =
    version.build_name || `Build-${version.build_index} ${version.type}`;
  setActivity({
    startTimestamp: Date.now(),
    details: "Playing Hytale No-Premium",
    state: build,
    
    smallImageKey: "hytale",
    smallImageText: "Hytale",
  });
};

export const setActivity = (activity?: SetActivity) => {
  rpcActivity = {
    ...rpcActivity,
    ...activity,
  };

  client.user?.setActivity(rpcActivity).catch((err: any) => {
    logger.error("Discord RPC error:", err);
  });
};

export const connectRPC = async () => {
  client
    .login()
    .then(() => {
      logger.info("Discord RPC connected");
      setChoosingVersionActivity();
    })
    .catch((err: any) => {
      logger.error("Discord RPC error:", err);
    });
};

export const clearActivity = async () => {
  logger.info("Clearing Discord RPC activity");

  try {
    await client.user?.clearActivity();
  } catch (err: any) {
    logger.error("An error occurred while clearing Discord RPC activity", err);
  }
};

export const disconnectRPC = async () => {
  logger.info("Disconnecting Discord RPC");
  await clearActivity();

  
  try {
    (client as any).destroy?.();
  } catch (err: any) {
    logger.error("An error occurred while disconnecting Discord RPC", err);
  }
};


client.on("ready", () => {
  setChoosingVersionActivity();
});
