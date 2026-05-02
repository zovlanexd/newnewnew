export type Preset = {
  name: string;
  channelId: string;
  userId: string;
  message: string;
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
