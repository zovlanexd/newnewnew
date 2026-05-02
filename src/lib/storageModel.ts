import type { Preset, RootStorage } from "./types";

export function defaultPreset(name: string): Preset {
  return {
    name: name || "New preset",
    channelId: "",
    userId: "",
    message: "",
    showEmbedPreview: false,
    embedImageUrl: "",
  };
}

export function ensureRule(r: Preset): void {
  if (typeof r.name !== "string") r.name = "Preset";
  if (typeof r.channelId !== "string") r.channelId = "";
  if (typeof r.userId !== "string") r.userId = "";
  if (typeof r.message !== "string") r.message = "";
  if (typeof r.showEmbedPreview !== "boolean") r.showEmbedPreview = false;
  if (typeof r.embedImageUrl !== "string") r.embedImageUrl = "";
}

export function ensureRoot(st: RootStorage): void {
  if (!Array.isArray(st.rules)) {
    st.rules = [];
  }
  if (!Array.isArray(st.cached)) {
    st.cached = [];
  }
  if (typeof st.autoReplayOnLoad !== "boolean") {
    st.autoReplayOnLoad = true;
  }

  const legacy =
    st.rules.length === 0 &&
    (typeof st.channelId === "string" ||
      typeof st.userId === "string" ||
      typeof st.message === "string");

  if (legacy) {
    st.rules.push(defaultPreset("Default"));
    const r = st.rules[0];
    r.channelId = typeof st.channelId === "string" ? st.channelId : "";
    r.userId = typeof st.userId === "string" ? st.userId : "";
    r.message = typeof st.message === "string" ? st.message : "";
    r.showEmbedPreview = !!st.showEmbedPreview;
    r.embedImageUrl = typeof st.embedImageUrl === "string" ? st.embedImageUrl : "";
    delete st.channelId;
    delete st.userId;
    delete st.message;
    delete st.showEmbedPreview;
    delete st.embedImageUrl;
  }

  for (const rule of st.rules) ensureRule(rule);
}

export function commitRuleAtIndex(st: RootStorage, ruleIndex: number, next: Preset): void {
  if (!st.rules[ruleIndex]) return;
  const copy = [...st.rules];
  copy[ruleIndex] = { ...next };
  ensureRule(copy[ruleIndex]);
  st.rules = copy;
}

export function deleteRuleAtIndex(st: RootStorage, ruleIndex: number): void {
  const copy = [...st.rules];
  copy.splice(ruleIndex, 1);
  st.rules = copy;
}
