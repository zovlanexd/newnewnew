export type Preset = {
  name: string;
  channelId: string;
  userId: string;
  /** Multiple bodies for this channel/user; pick which to send in the editor */
  messages: string[];
  /** When true, use sentAtIso for message timestamp (and matching snowflake); otherwise now */
  customSentAtEnabled: boolean;
  /** ISO 8601, e.g. 2026-05-02T18:30:00.000Z — used only if customSentAtEnabled */
  sentAtIso: string;
  showEmbedPreview: boolean;
  embedImageUrl: string;
};

export type RootStorage = {
  rules: Preset[];
  cached: Record<string, unknown>[];
  autoReplayOnLoad: boolean;
  channelId?: string;
  userId?: string;
  message?: string;
  showEmbedPreview?: boolean;
  embedImageUrl?: string;
};
