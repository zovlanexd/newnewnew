import { FluxDispatcher } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import type { RootStorage } from "./types";
import { ensureRoot } from "./storageModel";

let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
let connUnsub: (() => void) | null = null;
let autoReplayedThisSession = false;

function toastSafe(m: string) {
  try {
    showToast(m);
  } catch (_) {}
}

export function replayCached(st: RootStorage, withToast = true): void {
  try {
    ensureRoot(st);
    for (const msg of st.cached) {
      const cid = String((msg as { channel_id?: string }).channel_id || "");
      if (!cid) continue;
      FluxDispatcher.dispatch({
        type: "MESSAGE_CREATE",
        channelId: cid,
        message: msg,
        optimistic: false,
        isPushNotification: false,
      });
    }
    if (withToast) toastSafe("Replayed cached messages.");
  } catch (e) {
    if (withToast) toastSafe(String((e as Error)?.message || e));
  }
}

export function scheduleAutoReplay(st: RootStorage): void {
  autoReplayedThisSession = false;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  if (typeof connUnsub === "function") {
    connUnsub();
    connUnsub = null;
  }

  const run = (): void => {
    if (autoReplayedThisSession) return;
    ensureRoot(st);
    if (!st.autoReplayOnLoad || !st.cached?.length) return;
    autoReplayedThisSession = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    try {
      replayCached(st, false);
    } catch (_) {}
  };

  fallbackTimer = setTimeout(run, 6000);

  try {
    if (typeof FluxDispatcher.subscribe === "function") {
      const handler = (): void => {
        setTimeout(run, 2000);
      };
      FluxDispatcher.subscribe("CONNECTION_OPEN", handler);
      connUnsub = (): void => {
        try {
          FluxDispatcher.unsubscribe?.("CONNECTION_OPEN", handler);
        } catch (_) {}
      };
    }
  } catch (_) {}
}

export function disposeReplay(): void {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  if (typeof connUnsub === "function") {
    connUnsub();
    connUnsub = null;
  }
}
