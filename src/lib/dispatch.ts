import { FluxDispatcher } from "@vendetta/metro/common";

/** Dispatch a synthetic MESSAGE_CREATE for a message object already shaped like API payload. */
export function dispatchLocalMessageCreate(message: Record<string, unknown>): void {
  const channelId = String(message.channel_id ?? "");
  if (!channelId) return;
  const guildId = message.guild_id as string | null | undefined;
  FluxDispatcher.dispatch({
    type: "MESSAGE_CREATE",
    channelId,
    ...(guildId != null ? { guildId } : {}),
    message,
    optimistic: false,
    isPushNotification: false,
  } as never);
}
