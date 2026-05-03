import { findByStoreName } from "@vendetta/metro";
import type { Preset } from "./types";
import { ensureRule } from "./storageModel";

export function cloneForStorage(message: Record<string, unknown>): Record<string, unknown> | null {
  try {
    return JSON.parse(JSON.stringify(message)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const DISCORD_EPOCH_MS = 1420070400000;

/** Discord-style snowflake from UTC millis (defaults to now). */
export function genSnowflake(atMs?: number): string {
  const ms =
    typeof atMs === "number" && Number.isFinite(atMs) ? Math.floor(atMs) : Date.now();
  const ts = BigInt(ms - DISCORD_EPOCH_MS);
  if (ts < 0n) {
    const fallback = BigInt(Date.now() - DISCORD_EPOCH_MS);
    const rand = BigInt(Math.floor(Math.random() * 0xfff));
    return String((fallback << 22n) | rand);
  }
  const rand = BigInt(Math.floor(Math.random() * 0xfff));
  return String((ts << 22n) | rand);
}

export function resolveSentTimestampMs(rule: Preset, variantIndex: number): number {
  const perVariantEnabled = rule.variantCustomSentAtEnabled?.[variantIndex] ?? false;
  const perVariantIso = rule.variantSentAtIso?.[variantIndex]?.trim() ?? "";
  if (perVariantEnabled) {
    if (!perVariantIso.length) return Date.now();
    const parsed = Date.parse(perVariantIso);
    if (Number.isNaN(parsed)) {
      throw new Error("Invalid per-message sent time.");
    }
    return parsed;
  }

  if (!rule.customSentAtEnabled) return Date.now();
  const raw = rule.sentAtIso?.trim() ?? "";
  if (!raw.length) return Date.now();
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid sent time — use ISO 8601 (e.g. 2026-05-02T18:30:00.000Z).');
  }
  return parsed;
}

export function buildPayload(rule: Preset, variantIndex = 0): Record<string, unknown> {
  ensureRule(rule);
  const channelId = rule.channelId.trim();
  const userId = rule.userId.trim();
  if (!channelId || !userId) throw new Error("Set both channel ID and user ID.");

  const count = rule.messages.length;
  const idx = Math.max(0, Math.min(Math.floor(variantIndex), count - 1));

  const ChannelStore = findByStoreName("ChannelStore") as {
    getChannel?: (id: string) => { guild_id?: string | null } | undefined;
  };
  const UserStore = findByStoreName("UserStore") as {
    getUser?: (id: string) => Record<string, unknown> | undefined;
    getCurrentUser?: () => { id?: string } | undefined;
  };

  if (!ChannelStore?.getChannel) throw new Error("Channel store not found.");
  if (!UserStore?.getUser) throw new Error("User store not found.");

  const channel = ChannelStore.getChannel(channelId);
  const guildId = channel?.guild_id ?? null;

  const targetId = userId;
  const fromSelf = rule.messageFromSelf?.[idx] ?? false;
  let authorId = targetId;
  if (fromSelf) {
    const selfOverride = rule.selfUserId?.trim() ?? "";
    if (selfOverride.length) {
      authorId = selfOverride;
    } else {
      const me = UserStore.getCurrentUser?.();
      authorId = String(me?.id ?? "");
    }
    if (!authorId) {
      throw new Error("Could not resolve your user ID — set My user ID or stay logged in.");
    }
  }

  const cachedUser = UserStore.getUser(authorId);
  const author = cachedUser
    ? { ...cachedUser }
    : {
        id: authorId,
        username: "unknown-user",
        discriminator: "0",
        avatar: null,
        bot: false,
        global_name: "Unknown user",
      };

  const sentMs = resolveSentTimestampMs(rule, idx);
  const messageId = genSnowflake(sentMs);
  const timestampIso = new Date(sentMs).toISOString();
  const rawText = rule.messages[idx] ?? "";
  const text = rawText
    .replaceAll("{{targetId}}", targetId)
    .replaceAll("{{mentionTarget}}", `<@${targetId}>`)
    .replaceAll("{{myId}}", authorId);

  const embeds =
    rule.showEmbedPreview && text.trim().length > 0
      ? [
          {
            type: "rich",
            description: text,
            ...(rule.embedImageUrl?.trim()
              ? {
                  image: {
                    url: rule.embedImageUrl.trim(),
                    proxy_url: rule.embedImageUrl.trim(),
                    width: 400,
                    height: 300,
                  },
                }
              : {}),
          },
        ]
      : [];

  const mentionUsers: Record<string, unknown>[] = [];
  if (fromSelf && targetId && (text.includes(`<@${targetId}`) || text.includes(`<@!${targetId}`))) {
    const tu = UserStore.getUser(targetId);
    if (tu) mentionUsers.push({ ...tu });
  }

  const message = {
    id: messageId,
    type: 0,
    content: rule.showEmbedPreview ? "" : text,
    channel_id: channelId,
    guild_id: guildId,
    attachments: [],
    embeds,
    mentions: mentionUsers,
    mention_roles: [],
    mention_channels: [],
    mention_everyone: false,
    pinned: false,
    tts: false,
    nonce: messageId,
    blocked: false,
    ignored: false,
    flags: 0,
    reactions: [],
    author,
    timestamp: timestampIso,
    edited_timestamp: null,
    state: "SENT",
  };

  return {
    type: "MESSAGE_CREATE",
    channelId,
    guildId,
    message,
    optimistic: false,
    isPushNotification: false,
  };
}
