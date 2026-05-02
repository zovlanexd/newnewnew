import { FluxDispatcher } from "@vendetta/metro/common";
import type { RootStorage } from "./types";
import { ensureRoot } from "./storageModel";
import { dispatchLocalMessageCreate } from "./dispatch";

/**
 * Discord removes client-only MESSAGE_CREATE rows when history syncs or a delete flows through.
 * Re-dispatch cached copies for IDs we own so they stick until the user clears cache.
 */
export function installPersistentLocalMessages(st: RootStorage): () => void {
  ensureRoot(st);
  const unsubs: Array<() => void> = [];
  const channelReplayTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const subscribe = (event: string, fn: (payload: unknown) => void): void => {
    FluxDispatcher.subscribe(event as never, fn as never);
    unsubs.push(() => {
      try {
        FluxDispatcher.unsubscribe?.(event as never, fn as never);
      } catch (_) {}
    });
  };

  const idsFromCache = (): Set<string> =>
    new Set(st.cached.map((m) => String((m as { id?: string }).id ?? "")).filter(Boolean));

  const findCached = (messageId: string): Record<string, unknown> | undefined =>
    st.cached.find((m) => String((m as { id?: string }).id ?? "") === messageId) as
      | Record<string, unknown>
      | undefined;

  const replayOne = (msg: Record<string, unknown>): void => {
    queueMicrotask(() => dispatchLocalMessageCreate(msg));
  };

  const replayChannelMessages = (channelId: string): void => {
    const cid = String(channelId);
    if (!cid) return;
    ensureRoot(st);
    for (const msg of st.cached) {
      if (String((msg as { channel_id?: string }).channel_id ?? "") !== cid) continue;
      replayOne(msg as Record<string, unknown>);
    }
  };

  const scheduleReplayChannel = (channelId: string): void => {
    const cid = String(channelId);
    if (!cid) return;
    queueMicrotask(() => replayChannelMessages(cid));
    const prev = channelReplayTimers.get(cid);
    if (prev) clearTimeout(prev);
    channelReplayTimers.set(
      cid,
      setTimeout(() => {
        channelReplayTimers.delete(cid);
        replayChannelMessages(cid);
      }, 280),
    );
  };

  const channelIdFromHistoryPayload = (payload: Record<string, unknown>): string => {
    const p = payload as {
      channelId?: string;
      channel?: { id?: string };
      messages?: Array<{ channel_id?: string }>;
    };
    return String(p.channelId ?? p.channel?.id ?? p.messages?.[0]?.channel_id ?? "");
  };

  /** CHANNEL_SELECT and similar often only expose id-style fields */
  const channelIdFromRoutePayload = (payload: Record<string, unknown>): string => {
    const p = payload as {
      channelId?: string;
      selectedChannelId?: string;
      channel?: { id?: string };
      id?: string;
    };
    return String(p.channelId ?? p.selectedChannelId ?? p.channel?.id ?? p.id ?? "");
  };

  const deletedIdsFromPayload = (payload: Record<string, unknown>): string[] => {
    const p = payload as { id?: string; messageId?: string; ids?: string[] };
    if (Array.isArray(p.ids) && p.ids.length) return p.ids.map(String);
    const single = p.id ?? p.messageId;
    return single ? [String(single)] : [];
  };

  subscribe("MESSAGE_DELETE", (payload) => {
    const ids = deletedIdsFromPayload(payload as Record<string, unknown>);
    const ours = idsFromCache();
    for (const mid of ids) {
      if (!ours.has(mid)) continue;
      const msg = findCached(mid);
      if (msg) replayOne(msg);
    }
  });

  subscribe("MESSAGE_DELETE_BULK", (payload) => {
    const p = payload as { ids?: string[] };
    const ids = Array.isArray(p.ids) ? p.ids.map(String) : [];
    const ours = idsFromCache();
    for (const mid of ids) {
      if (!ours.has(mid)) continue;
      const msg = findCached(mid);
      if (msg) replayOne(msg);
    }
  });

  const historyEvents = [
    "LOAD_MESSAGES_SUCCESS",
    "LOAD_MESSAGES_SUCCESS_CACHED",
    "LOAD_MESSAGES_AROUND_SUCCESS",
    "LOAD_MESSAGES_QUERY_SUCCESS",
  ];
  for (const ev of historyEvents) {
    subscribe(ev, (payload) => {
      const cid = channelIdFromHistoryPayload(payload as Record<string, unknown>);
      if (cid) scheduleReplayChannel(cid);
    });
  }

  subscribe("CHANNEL_SELECT", (payload) => {
    const cid =
      channelIdFromHistoryPayload(payload as Record<string, unknown>) ||
      channelIdFromRoutePayload(payload as Record<string, unknown>);
    if (cid) scheduleReplayChannel(cid);
  });

  return (): void => {
    for (const t of channelReplayTimers.values()) clearTimeout(t);
    channelReplayTimers.clear();
    for (const u of unsubs) {
      try {
        u();
      } catch (_) {}
    }
    unsubs.length = 0;
  };
}
