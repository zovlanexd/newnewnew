import { logger } from "@vendetta";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";
import type { RootStorage } from "./lib/types";
import { ensureRoot } from "./lib/storageModel";
import { disposeReplay, scheduleAutoReplay } from "./lib/replay";
import { installPersistentLocalMessages } from "./lib/persistent";

let disposePersistent: (() => void) | null = null;

function onLoad(): void {
  try {
    const st = storage as unknown as RootStorage;
    ensureRoot(st);
    disposePersistent?.();
    disposePersistent = installPersistentLocalMessages(st);
    scheduleAutoReplay(st);
  } catch (e) {
    logger.error("[LocalMessagePreview] onLoad", e);
  }
}

function onUnload(): void {
  disposePersistent?.();
  disposePersistent = null;
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
