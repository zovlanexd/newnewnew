export type Preset = {
  name: string;
  channelId: string;
  userId: string;
  /** Multiple bodies for this channel/user; pick which to send in the editor */
  messages: string[];
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
