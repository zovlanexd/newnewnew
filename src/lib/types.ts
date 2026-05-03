export type Preset = {
  name: string;
  channelId: string;
  /** Target / other party user snowflake (author when messageFromSelf[i] is false) */
  userId: string;
  /** When set, used as author for variants with messageFromSelf[i] true; else UserStore current user */
  selfUserId: string;
  /** Multiple bodies for this channel/user; pick which to send in the editor */
  messages: string[];
  /** When true for index i, that variant is sent as you (selfUserId or current user), not userId */
  messageFromSelf: boolean[];
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
  /** Bumped when built-in demo copy should be merged in for blank presets (one-shot per version). */
  builtinContentVersion?: number;
  channelId?: string;
  userId?: string;
  message?: string;
  showEmbedPreview?: boolean;
  embedImageUrl?: string;
};
