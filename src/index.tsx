import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";
import type { RootStorage } from "./lib/types";
import { ensureRoot } from "./lib/storageModel";
import { disposeReplay, scheduleAutoReplay } from "./lib/replay";

function onLoad(): void {
  try {
    ensureRoot(storage as unknown as RootStorage);
    scheduleAutoReplay(storage as unknown as RootStorage);
  } catch (e) {
    logger.error("[LocalMessagePreview] onLoad", e);
  }
}

function onUnload(): void {
  disposeReplay();
}

type PluginApi = {
  onLoad: typeof onLoad;
  onUnload: typeof onUnload;
  settings: typeof Settings;
  default?: PluginApi;
};

const pluginApi: PluginApi = {
  onLoad,
  onUnload,
  settings: Settings,
};
pluginApi.default = pluginApi;

export default pluginApi;
