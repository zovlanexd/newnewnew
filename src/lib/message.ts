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

export function genSnowflake(): string {
  const ts = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 0xfffff));
  return String((ts << 22n) + rand);
}

export function buildPayload(rule: Preset): Record<string, unknown> {
  ensureRule(rule);
  const channelId = rule.channelId.trim();
  const userId = rule.userId.trim();
  if (!channelId || !userId) throw new Error("Set both channel ID and user ID.");

  const ChannelStore = findByStoreName("ChannelStore") as {
    getChannel?: (id: string) => { guild_id?: string | null } | undefined;
  };
  const UserStore = findByStoreName("UserStore") as {
    getUser?: (id: string) => Record<string, unknown> | undefined;
  };

  if (!ChannelStore?.getChannel) throw new Error("Channel store not found.");
  if (!UserStore?.getUser) throw new Error("User store not found.");

  const channel = ChannelStore.getChannel(channelId);
  const guildId = channel?.guild_id ?? null;
  const cachedUser = UserStore.getUser(userId);
  const author = cachedUser
    ? { ...cachedUser }
    : {
        id: userId,
        username: "unknown-user",
        discriminator: "0",
        avatar: null,
        bot: false,
        global_name: "Unknown user",
      };

  const messageId = genSnowflake();
  const now = new Date().toISOString();
  const text = rule.message ?? "";

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

  const message = {
    id: messageId,
    type: 0,
    content: rule.showEmbedPreview ? "" : text,
    channel_id: channelId,
    guild_id: guildId,
    attachments: [],
    embeds,
    mentions: [],
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
    timestamp: now,
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
